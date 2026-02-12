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
 * Format all files and add/update MIT license headers
 * Usage: node scripts/format-with-licenses.js
 *
 * This script:
 * - Scans all .js files in src/, tests/, and scripts/
 * - Detects missing MIT license headers
 * - Adds or updates license headers with current year
 * - Reports statistics about processed files
 */

const fs = require('fs');
const path = require('path');

const MIT_LICENSE_JS = `/*
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

const DIRS_TO_SCAN = ['src', 'tests', 'scripts'];
const FILE_EXTENSIONS = ['.js', '.html', '.css'];

/**
 * Recursively find all files with specified extensions
 */
function findFilesRecursive(dir, extensions = ['.js']) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip common ignored directories
        if (!['.git', 'node_modules', '.vscode', '.qodo', '.husky'].includes(entry.name)) {
          files.push(...findFilesRecursive(fullPath, extensions));
        }
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  } catch (e) {
    // Directory doesn't exist, skip
  }
  return files;
}

let stats = {
  total: 0,
  added: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
};

/**
 * Recursively find all files with specified extensions
 */
function findFiles(dir, ext = ['.js']) {
  return findFilesRecursive(dir, ext);
}

/**
 * Check if file already has a license header
 */
function hasLicenseHeader(content) {
  // Remove shebang line if present for license check
  const contentWithoutShebang = content.replace(/^#!.*\n/, '');
  const trimmed = contentWithoutShebang.trim();

  // Check for JS-style license comment
  if (trimmed.startsWith('/*') && trimmed.includes('MIT License')) {
    return true;
  }

  // Check for HTML-style license comment
  if (trimmed.startsWith('<!--') && trimmed.includes('MIT License')) {
    return true;
  }

  return false;
}

/**
 * Remove single-line comments (//) while preserving block comments
 * (licenses, descriptions) and string literals (URLs, etc.)
 */
function removeSingleLineComments(content) {
  const placeholders = [];
  const mask = (match) => {
    const isComment = match.startsWith('/*');
    const id = `___PLACEHOLDER_${isComment ? 'C' : 'S'}_${placeholders.length}___`;
    placeholders.push(match);
    return id;
  };

  // Mask block comments (licenses, JSDoc) and all string literals
  const regexMask =
    /\/\*[\s\S]*?\*\/|(?:"[^"\\\n]*(?:\\.[^"\\\n]*)*")|(?:'[^'\\\n]*(?:\\.[^'\\\n]*)*')|(?:`[^`\\]*(?:\\.[^`\\]*)*`)/g;
  let result = content.replace(regexMask, mask);

  // 1. Identify lines that are ONLY single-line comments
  result = result.replace(/^[ \t]*\/\/.*$/gm, '___REMOVE_LINE___');

  // 2. Remove trailing single-line comments from lines that also have code
  result = result.replace(/\/\/.*$/gm, '');

  // 3. Process lines: remove marker lines, but keep lines that were ALREADY empty
  result = result
    .split('\n')
    .filter((line) => line !== '___REMOVE_LINE___')
    .map((line) => line.trimEnd())
    .join('\n');

  // 4. Heal over-compression: ensure at least one empty line before methods/functions/classes/const/comments
  // a) After a closing brace
  result = result.replace(
    /\}([ \t]*\n[ \t]*)(?=(?:static |async )?(?:function|class|constructor|const|let|var|[a-zA-Z_]\w*[ \t]*\()|___PLACEHOLDER_C)/g,
    '}\n\n'
  );

  // b) Between const/let/var block and function/class/comment
  result = result.replace(
    /(;[ \t]*\n)(?=[ \t]*(?:(?:async )?function|class|___PLACEHOLDER_C))/g,
    ';\n\n'
  );

  // c) Around block comments (placeholders tagged C)
  // After a comment, before code
  result = result.replace(
    /(___PLACEHOLDER_C_\d+___[ \t]*\n)(?=[ \t]*(?:const|let|var|(?:async )?function|class|static))/g,
    '$1\n'
  );
  // Before a comment, after code
  result = result.replace(/([;\}][ \t]*\n)(?=[ \t]*___PLACEHOLDER_C_\d+___)/g, '$1\n');

  // d) Between two consecutive block comments
  result = result.replace(
    /(___PLACEHOLDER_C_\d+___[ \t]*\n)(?=[ \t]*___PLACEHOLDER_C_\d+___)/g,
    '$1\n'
  );

  // 5. Cleanup: avoid triple+ newlines
  result = result.replace(/\n{3,}/g, '\n\n');

  // 6. Unmask
  return result.replace(/___PLACEHOLDER_[CS]_(\d+)___/g, (match, id) => placeholders[parseInt(id)]);
}

/**
 * Process a single file
 */
function processFile(filePath) {
  // Skip this script itself to prevent self-modification
  if (filePath.endsWith('format-with-licenses.js')) {
    stats.skipped++;
    return 'skipped';
  }

  stats.total++;

  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Remove single-line comments for non-HTML/CSS files
    if (filePath.endsWith('.js')) {
      const originalContent = content;
      content = removeSingleLineComments(content);
      if (content !== originalContent) {
        // We write it back later if license is also handled, or here if not
      }
    }

    const hasShebang = content.startsWith('#!');
    const shebang = hasShebang ? content.split('\n')[0] + '\n' : '';
    const contentWithoutShebang = content.replace(/^#!.*\n/, '');

    const isHtml = filePath.endsWith('.html');
    const mitLicense = isHtml ? MIT_LICENSE_HTML : MIT_LICENSE_JS;
    const hasLicense = hasLicenseHeader(content);

    let finalContent = content;
    let status = 'skipped';

    if (!hasLicense) {
      // Add license header (preserving shebang if present)
      finalContent = mitLicense + '\n\n' + contentWithoutShebang;
      status = 'added';
    } else {
      // Check if year needs updating in the existing header
      if (!contentWithoutShebang.includes('2026')) {
        finalContent =
          shebang +
          contentWithoutShebang.replace(
            /Copyright \(c\) \d{4} jmfrohs/,
            'Copyright (c) 2026 jmfrohs'
          );
        status = 'updated';
      } else if (content !== fs.readFileSync(filePath, 'utf-8')) {
        // If content changed (e.g. comments removed) but license is OK
        status = 'updated';
      }
    }

    if (status !== 'skipped') {
      fs.writeFileSync(filePath, finalContent, 'utf-8');
      if (status === 'added') stats.added++;
      if (status === 'updated') stats.updated++;
      return status;
    }

    stats.skipped++;
    return 'skipped';
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    stats.errors++;
    return 'error';
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Formatting files and managing licenses...\n');

  const allFiles = [];

  // Collect all files using the new recursive function
  for (const dir of DIRS_TO_SCAN) {
    const fullDir = path.join(__dirname, '..', dir);
    allFiles.push(...findFilesRecursive(fullDir, FILE_EXTENSIONS));
  }

  if (allFiles.length === 0) {
    console.log('❌ No files found to process.');
    return;
  }

  console.log(`📂 Found ${allFiles.length} files to process\n`);

  // Process each file
  const results = {};
  for (const file of allFiles) {
    const result = processFile(file);
    const relative = path.relative(path.join(__dirname, '..'), file);

    if (results[result]) {
      results[result]++;
    } else {
      results[result] = 1;
    }
  }

  // Print statistics
  console.log('\n📊 Processing Results:');
  console.log('─'.repeat(40));
  console.log(`Total files processed:  ${stats.total}`);
  console.log(`✅ License headers added:  ${stats.added}`);
  console.log(`🔄 License headers updated: ${stats.updated}`);
  console.log(`⏭️  Already licensed:      ${stats.skipped}`);
  if (stats.errors > 0) {
    console.log(`❌ Errors:               ${stats.errors}`);
  }
  console.log('─'.repeat(40));
  console.log('\n✨ License management complete!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processFile, hasLicenseHeader };
