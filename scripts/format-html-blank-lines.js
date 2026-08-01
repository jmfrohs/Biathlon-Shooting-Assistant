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

const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const babelParser = require('@babel/parser');
const babelGenerator = require('@babel/generator').default;

const ROOT = path.join(__dirname, '..');
const TARGET_DIRS = ['src', 'src-old'];
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

function findHtmlFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldInsertBlankLine(currentLine, nextLine) {
  const currentTrim = currentLine.trim();
  const nextTrim = nextLine.trim();

  if (!currentTrim || !nextTrim) {
    return false;
  }

  const levelOneTag = /^ {4}<[^!/][^>]*>$/;
  if (!levelOneTag.test(currentLine) || !levelOneTag.test(nextLine)) {
    return false;
  }

  if (currentTrim.startsWith('</') || nextTrim.startsWith('</')) {
    return false;
  }

  if (nextTrim === '</head>' || nextTrim === '</body>') {
    return false;
  }

  return true;
}

function shouldInsertStructuralBlankLine(currentLine, nextLine, nextNonEmptyLine) {
  const currentTrim = currentLine.trim();
  const nextTrim = nextLine.trim();
  const nextNonEmptyTrim = (nextNonEmptyLine || '').trim();

  if (!currentTrim || !nextTrim) {
    return false;
  }

  // Keep one empty line between the file-level MIT license and the doctype/html.
  if (currentTrim === '-->') {
    return true;
  }

  // Keep one empty line after each section block.
  if (currentTrim === '</section>') {
    return true;
  }

  // Keep one empty line after each main block.
  if (currentTrim === '</main>') {
    return true;
  }

  // Keep one empty line before a main block starts.
  if (
    nextNonEmptyTrim.startsWith('<main') &&
    (currentTrim.startsWith('</header') ||
      currentTrim.startsWith('</section') ||
      currentTrim.startsWith('</div') ||
      currentTrim.startsWith('</nav'))
  ) {
    return true;
  }

  // Keep one empty line between larger sibling div blocks.
  if (currentTrim === '</div>' && nextNonEmptyTrim.startsWith('<div')) {
    const currentIndent = (currentLine.match(/^\s*/) || [''])[0].length;
    const nextIndent = ((nextNonEmptyLine || '').match(/^\s*/) || [''])[0].length;

    // Heuristic: top-level layout blocks are usually at 4-8 spaces indentation.
    if (currentIndent >= 4 && currentIndent <= 8 && nextIndent === currentIndent) {
      return true;
    }
  }

  return false;
}

function removeNonLicenseHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, (comment) => {
    if (comment.includes('MIT License')) {
      return comment;
    }
    return '';
  });
}

function normalizeLicenseHeader(content) {
  return content.replace(/^(\s*<!--[\s\S]*?MIT License[\s\S]*?-->)/, () => MIT_LICENSE_HTML);
}

function stripInlineJsCommentsFallback(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

function dedentCodeBlock(code) {
  const normalized = code.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  let minIndent = Infinity;
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const indent = (line.match(/^\s*/) || [''])[0].length;
    if (indent < minIndent) {
      minIndent = indent;
    }
  }

  if (!Number.isFinite(minIndent) || minIndent === 0) {
    return normalized;
  }

  return lines
    .map((line) => {
      if (!line.trim()) {
        return '';
      }
      return line.slice(minIndent);
    })
    .join('\n');
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

    // Target multiline template literals typically used for HTML snippets.
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
      if (!contentLine.trim()) {
        continue;
      }
      const indent = (contentLine.match(/^\s*/) || [''])[0].length;
      if (indent < minIndent) {
        minIndent = indent;
      }
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

  // Insert spacing between larger top-level JS blocks for readability.
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

    // External scripts are handled by HTML formatting only.
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
      // Keep original block if JS parsing fails.
      result += fullMatch;
    }

    lastIndex = end;
  }

  result += content.slice(lastIndex);
  return result;
}

async function normalizeHtmlBlankLines(content) {
  const contentWithFormattedScripts = await formatInlineScripts(content);
  const contentWithNormalizedLicense = normalizeLicenseHeader(contentWithFormattedScripts);
  const contentWithoutComments = removeNonLicenseHtmlComments(contentWithNormalizedLicense);
  const hadTrailingNewline = contentWithoutComments.endsWith('\n');
  const lines = contentWithoutComments.replace(/\r\n/g, '\n').split('\n');
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

async function main() {
  let updated = 0;
  const htmlFiles = TARGET_DIRS.flatMap((dir) => findHtmlFiles(path.join(ROOT, dir)));

  for (const filePath of htmlFiles) {
    const original = fs.readFileSync(filePath, 'utf-8');
    const normalized = await normalizeHtmlBlankLines(original);

    if (normalized !== original) {
      fs.writeFileSync(filePath, normalized, 'utf-8');
      updated++;
    }
  }

  console.log(`HTML blank line normalization complete. Updated ${updated} file(s).`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed to normalize HTML files:', err.message);
    process.exitCode = 1;
  });
}
