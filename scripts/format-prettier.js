#!/usr/bin/env node
/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Formatieren aller JS-, HTML- und CSS-Dateien via Prettier inkl. Lizenz-Header.
 * Verwendung: node scripts/format.js
 */

const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const babelParser = require('@babel/parser');
const babelGenerator = require('@babel/generator').default;

const DIRS_TO_SCAN = ['src', 'tests', 'scripts', 'src-old'];
const FILE_EXTENSIONS = ['.js', '.html', '.css'];
const IGNORED_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  '.vscode',
  '.qodo',
  '.husky',
  '.media',
]);

const MIT_LICENSE_JS_CSS = `/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/`;

const MIT_LICENSE_HTML = `<!--
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->`;

const PRETTIER_JS_OPTIONS = {
  parser: 'babel',
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  useTabs: false,
  tabWidth: 2,
};

const PRETTIER_CSS_OPTIONS = {
  parser: 'css',
  singleQuote: true,
  tabWidth: 2,
};

const PRETTIER_HTML_OPTIONS = {
  parser: 'html',
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
};

const BABEL_PARSER_OPTIONS = {
  sourceType: 'unambiguous',
  allowReturnOutsideFunction: true,
  plugins: [
    'jsx',
    'classProperties',
    'optionalChaining',
    'nullishCoalescingOperator',
    'objectRestSpread',
    'topLevelAwait',
  ],
};

const stats = {
  total: 0,
  added: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
};

function findFilesRecursive(directory, extensions = FILE_EXTENSIONS) {
  let files = [];
  let entries;

  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (err) {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files = files.concat(findFilesRecursive(fullPath, extensions));
      }
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function hasLicenseHeader(content) {
  const contentWithoutShebang = content.replace(/^#!.*\n/, '').trimStart();
  if (
    (contentWithoutShebang.startsWith('/*') || contentWithoutShebang.startsWith('<!--')) &&
    contentWithoutShebang.slice(0, 1000).includes('MIT License')
  ) {
    return true;
  }
  return false;
}

function applyLicenseHeader(content, isHtml) {
  const hasShebang = content.startsWith('#!');
  let shebang = '';
  let contentBody = content;

  if (hasShebang) {
    const firstNewlinePos = content.indexOf('\n');
    if (firstNewlinePos !== -1) {
      shebang = content.slice(0, firstNewlinePos + 1);
      contentBody = content.slice(firstNewlinePos + 1);
    }
  }

  const targetLicense = isHtml ? MIT_LICENSE_HTML : MIT_LICENSE_JS_CSS;

  if (!hasLicenseHeader(content)) {
    return {
      content: shebang + targetLicense + '\n\n' + contentBody.trimStart(),
      status: 'added',
    };
  }

  if (!content.includes('Copyright (c) 2026 jmfrohs')) {
    const updatedContent = content.replace(
      /Copyright \(c\) \d{4} jmfrohs/,
      'Copyright (c) 2026 jmfrohs'
    );
    if (updatedContent !== content) {
      return { content: updatedContent, status: 'updated' };
    }
  }

  return { content, status: 'skipped' };
}

/* --- HTML & Inline JS Spezial-Logik --- */

function shouldInsertBlankLine(currentLine, nextLine) {
  const currentTrim = currentLine.trim();
  const nextTrim = nextLine.trim();

  if (!currentTrim || !nextTrim) return false;

  const levelOneTag = /^ {4}<[^!/][^>]*>$/;
  if (!levelOneTag.test(currentLine) || !levelOneTag.test(nextLine)) return false;

  if (currentTrim.startsWith('</') || nextTrim.startsWith('</')) return false;
  if (nextTrim === '</head>' || nextTrim === '</body>') return false;

  return true;
}

function shouldInsertStructuralBlankLine(currentLine, nextLine, nextNonEmptyLine) {
  const currentTrim = currentLine.trim();
  const nextTrim = nextLine.trim();
  const nextNonEmptyTrim = (nextNonEmptyLine || '').trim();

  if (!currentTrim || !nextTrim) return false;
  if (currentTrim === '-->' || currentTrim === '</section>' || currentTrim === '</main>')
    return true;

  if (
    nextNonEmptyTrim.startsWith('<main') &&
    (currentTrim.startsWith('</header') ||
      currentTrim.startsWith('</section') ||
      currentTrim.startsWith('</div') ||
      currentTrim.startsWith('</nav'))
  ) {
    return true;
  }

  if (currentTrim === '</div>' && nextNonEmptyTrim.startsWith('<div')) {
    const currentIndent = (currentLine.match(/^\s*/) || [''])[0].length;
    const nextIndent = ((nextNonEmptyLine || '').match(/^\s*/) || [''])[0].length;
    if (currentIndent >= 4 && currentIndent <= 8 && nextIndent === currentIndent) {
      return true;
    }
  }

  return false;
}

function removeNonLicenseHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, (comment) => {
    if (comment.includes('MIT License')) return comment;
    return '';
  });
}

function stripInlineJsCommentsFallback(code) {
  return code.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
}

function dedentCodeBlock(code) {
  const normalized = code.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  let minIndent = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = (line.match(/^\s*/) || [''])[0].length;
    if (indent < minIndent) minIndent = indent;
  }

  if (!Number.isFinite(minIndent) || minIndent === 0) return normalized;

  return lines.map((line) => (!line.trim() ? '' : line.slice(minIndent))).join('\n');
}

function normalizeTemplateLiteralIndentation(code) {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const tickIndex = line.indexOf('`');

    if (tickIndex === -1) {
      i++;
      continue;
    }

    const beforeTick = line.slice(0, tickIndex).trim();
    const afterTick = line.slice(tickIndex + 1).trim();

    const looksLikeTemplateStart =
      !afterTick &&
      (/=\s*$/.test(beforeTick) ||
        /^return\s*$/.test(beforeTick) ||
        /innerHTML\s*=\s*$/.test(beforeTick));

    if (!looksLikeTemplateStart || i + 1 >= lines.length) {
      i++;
      continue;
    }

    const nextLine = lines[i + 1].trim();
    if (!nextLine.startsWith('<')) {
      i++;
      continue;
    }

    let endIndex = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (/`\s*[;,)]?\s*$/.test(lines[j])) {
        endIndex = j;
        break;
      }
    }

    if (endIndex === -1 || endIndex <= i + 1) {
      i++;
      continue;
    }

    const contentStart = i + 1;
    const contentEnd = endIndex - 1;
    const contentLines = lines.slice(contentStart, contentEnd + 1);

    let minIndent = Infinity;
    for (const contentLine of contentLines) {
      if (!contentLine.trim()) continue;
      const indent = (contentLine.match(/^\s*/) || [''])[0].length;
      if (indent < minIndent) minIndent = indent;
    }

    if (!Number.isFinite(minIndent)) {
      i = endIndex + 1;
      continue;
    }

    const baseIndent = ((line.match(/^\s*/) || [''])[0].length || 0) + 2;
    const targetPrefix = ' '.repeat(baseIndent);

    for (let j = contentStart; j <= contentEnd; j++) {
      if (!lines[j].trim()) {
        lines[j] = '';
        continue;
      }
      lines[j] = targetPrefix + lines[j].slice(minIndent);
    }

    i = endIndex + 1;
  }

  return lines.join('\n');
}

function normalizeInlineJsBlankLines(code) {
  let result = code;
  result = result.replace(/\}\n(?=(?:async\s+)?function\b|class\b|const\b|let\b|var\b)/g, '}\n\n');
  result = result.replace(/;\n(?=(?:async\s+)?function\b|class\b)/g, ';\n\n');
  result = result.replace(
    /;\n(?=(?:window|document)\.[A-Za-z_$][\w$]*\s*=\s*(?:async\s+)?function\b)/g,
    ';\n\n'
  );
  result = result.replace(
    /;\n(?=[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\s*=\s*(?:async\s+)?function\b)/g,
    ';\n\n'
  );
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

async function normalizeInlineScriptBody(rawBody) {
  const dedentedBody = dedentCodeBlock(rawBody);
  const normalizedTemplateBody = normalizeTemplateLiteralIndentation(dedentedBody);
  let withoutComments;

  try {
    const ast = babelParser.parse(normalizedTemplateBody, BABEL_PARSER_OPTIONS);
    withoutComments = babelGenerator(ast, { comments: false, compact: false }).code;
  } catch (e) {
    withoutComments = stripInlineJsCommentsFallback(normalizedTemplateBody);
  }

  const formatted = await prettier.format(withoutComments, PRETTIER_JS_OPTIONS);
  return normalizeInlineJsBlankLines(formatted).trimEnd();
}

async function formatInlineScripts(content) {
  const scriptRegex = /(^[ \t]*)<script\b([^>]*)>([\s\S]*?)<\/script>/gm;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = scriptRegex.exec(content)) !== null) {
    const [fullMatch, indent, attrs, body] = match;
    const start = match.index;
    const end = start + fullMatch.length;

    result += content.slice(lastIndex, start);

    if (/\bsrc\s*=/.test(attrs)) {
      result += fullMatch;
      lastIndex = end;
      continue;
    }

    const rawBody = body.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    if (!rawBody.trim()) {
      result += `${indent}<script${attrs}></script>`;
      lastIndex = end;
      continue;
    }

    try {
      const formatted = await normalizeInlineScriptBody(rawBody);
      const indentedBody = formatted
        .split('\n')
        .map((line) => `${indent}  ${line}`)
        .join('\n');

      result += `${indent}<script${attrs}>\n${indentedBody}\n${indent}</script>`;
    } catch (e) {
      result += fullMatch;
    }

    lastIndex = end;
  }

  result += content.slice(lastIndex);
  return result;
}

async function formatHtmlContent(content) {
  let formatted = await formatInlineScripts(content);
  formatted = removeNonLicenseHtmlComments(formatted);

  const hadTrailingNewline = formatted.endsWith('\n');
  const lines = formatted.replace(/\r\n/g, '\n').split('\n');
  const normalized = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = i < lines.length - 1 ? lines[i + 1] : '';
    let nextNonEmpty = '';

    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) {
        nextNonEmpty = lines[j];
        break;
      }
    }

    normalized.push(line);

    if (
      shouldInsertBlankLine(line, next) ||
      shouldInsertStructuralBlankLine(line, next, nextNonEmpty)
    ) {
      normalized.push('');
    }
  }

  let result = normalized.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  if (hadTrailingNewline && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

/* --- Hauptprozessor pro Datei --- */

async function processFile(filePath) {
  stats.total += 1;

  if (filePath.endsWith('format.js') || filePath.endsWith('format.py')) {
    stats.skipped += 1;
    return '\x1b[32mskipped\x1b[0m';
  }

  try {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const isHtml = filePath.endsWith('.html');
    const isJs = filePath.endsWith('.js');
    const isCss = filePath.endsWith('.css');

    // 1. Prettier-Formatierung je nach Dateityp
    let formattedContent = originalContent;
    if (isHtml) {
      formattedContent = await formatHtmlContent(originalContent);
    } else if (isJs) {
      formattedContent = await prettier.format(originalContent, PRETTIER_JS_OPTIONS);
    } else if (isCss) {
      formattedContent = await prettier.format(originalContent, PRETTIER_CSS_OPTIONS);
    }

    // 2. Lizenz-Header anwenden/prüfen
    const { content: finalContent, status: licenseStatus } = applyLicenseHeader(
      formattedContent,
      isHtml
    );

    let finalStatus = 'skipped';
    if (finalContent !== originalContent) {
      fs.writeFileSync(filePath, finalContent, 'utf-8');
      finalStatus = licenseStatus === 'added' ? 'added' : 'updated';
    }

    stats[finalStatus] += 1;

    if (finalStatus === 'added') return '\x1b[31madded\x1b[0m';
    if (finalStatus === 'updated') return '\x1b[33mupdated\x1b[0m';
    return '\x1b[32mskipped\x1b[0m';
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
    stats.errors += 1;
    return 'error';
  }
}

async function main() {
  console.log('Formatting files\n');

  const baseDir = __dirname;
  let projectRoot;

  if (fs.existsSync(path.join(baseDir, 'src')) || fs.existsSync(path.join(baseDir, 'scripts'))) {
    projectRoot = baseDir;
  } else {
    projectRoot = path.normalize(path.join(baseDir, '..'));
  }

  let allFiles = [];
  for (const d of DIRS_TO_SCAN) {
    const fullDir = path.join(projectRoot, d);
    allFiles = allFiles.concat(findFilesRecursive(fullDir, FILE_EXTENSIONS));
  }

  if (allFiles.length === 0) {
    console.log('\x1b[1;31mERROR:\x1b[0m No files found to process.');
    return;
  }

  console.log(`Found ${allFiles.length} files to process\n`);

  for (const filePath of allFiles) {
    const processStatus = await processFile(filePath);
    const relPath = path.relative(projectRoot, filePath);

    const dirname = path.dirname(relPath);
    const filename = path.basename(relPath);

    const dirPrefix = dirname && dirname !== '.' ? `${dirname}/` : '';

    let coloredFilename = filename;
    if (filePath.endsWith('.html')) {
      coloredFilename = `\x1b[38;2;255;165;0m${filename}\x1b[0m`;
    } else if (filePath.endsWith('.js')) {
      coloredFilename = `\x1b[33m${filename}\x1b[0m`;
    } else if (filePath.endsWith('.css')) {
      coloredFilename = `\x1b[94m${filename}\x1b[0m`;
    }

    const formattedPath = `${dirPrefix}${coloredFilename}`;
    const colorPadding = formattedPath.length - relPath.length;
    const targetWidth = 60 + colorPadding;

    console.log(`${formattedPath.padEnd(targetWidth)} (${processStatus})`);
  }

  console.log('\n\x1b[1;36mProcessing Results:\x1b[0m');
  console.log('─'.repeat(40));
  console.log(`\x1b[1mTotal files processed:           \x1b[0m ${stats.total}`);
  console.log(`* License headers added:          \x1b[31m${stats.added}\x1b[0m`);
  console.log(`* Format/license headers updated: \x1b[33m${stats.updated}\x1b[0m`);
  console.log(`* Already formatted/licensed:     \x1b[32m${stats.skipped}\x1b[0m`);
  if (stats.errors > 0) {
    console.log(`* \x1b[1;31mERRORS:\x1b[0m                  \x1b[1;31m${stats.errors}\x1b[0m`);
  }
  console.log('─'.repeat(40));
  console.log('\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error during formatting:', err);
    process.exitCode = 1;
  });
}
