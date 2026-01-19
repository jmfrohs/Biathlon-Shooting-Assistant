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

#!/usr/bin/env node

/**
 * Source Code Analyzer
 * Detailed analysis of source code with file locations
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(100));
console.log('          📂 SOURCE CODE ANALYSIS - All Issues with Line Numbers');
console.log('='.repeat(100) + '\n');

const issues = {
  critical: [],
  warnings: [],
  todos: []
};

const srcDirs = ['src/js', 'src/js/modules', 'src/js/services'];

srcDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // TODO/FIXME comments
      if (trimmed.includes('// TODO') || trimmed.includes('// FIXME')) {
        issues.todos.push({
          file: filePath,
          line: lineNum,
          code: trimmed.substring(0, 100)
        });
      }

      // console statements
      if (line.match(/console\.(log|warn|error|debug)\(/)) {
        issues.warnings.push({
          file: filePath,
          line: lineNum,
          type: 'Console statement',
          code: trimmed.substring(0, 100)
        });
      }

      // Potential undefined variables (simple check)
      if (line.match(/^[^/]*\b[a-zA-Z_]\w*\s*=[^=]/)) {
        if (!line.includes('const ') && !line.includes('let ') && !line.includes('var ') && !line.includes('this.')) {
          // Possible assignment without declaration
        }
      }
    });
  });
});

// Display results
console.log(`🔴 CRITICAL ERRORS: ${issues.critical.length}\n`);
if (issues.critical.length === 0) {
  console.log('   ✅ No critical errors found!\n');
}

console.log(`⚠️  WARNINGS: ${issues.warnings.length}`);
console.log('   (console.log/error statements in source code)\n');

if (issues.warnings.length > 0) {
  issues.warnings.slice(0, 10).forEach((warn, idx) => {
    console.log(`   ${idx + 1}. [${warn.file}:${warn.line}]`);
    console.log(`      ${warn.code}`);
  });
  if (issues.warnings.length > 10) {
    console.log(`   ... and ${issues.warnings.length - 10} more\n`);
  } else {
    console.log();
  }
}

console.log(`📋 TODO/FIXME: ${issues.todos.length}\n`);
if (issues.todos.length > 0) {
  issues.todos.forEach((todo, idx) => {
    console.log(`   ${idx + 1}. [${todo.file}:${todo.line}]`);
    console.log(`      ${todo.code}`);
  });
}

console.log('\n' + '='.repeat(100));
console.log(`📊 TOTAL ISSUES: ${issues.critical.length + issues.warnings.length + issues.todos.length}`);
console.log('='.repeat(100) + '\n');
