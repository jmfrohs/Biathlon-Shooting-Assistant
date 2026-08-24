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
 * Source Code Analyzer
 * Detailed analysis of source code with file locations
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bold: "\x1b[1m",
  bright: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
};

const issues = {
  critical: [],
  warnings: [],
  todos: [],
};

const DIRS_TO_SCAN = ['src/js', 'src-old/js'];

/**
 * Recursively find all files with specified extension
 */
function findFilesRecursive(dir, ext = '.js') {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findFilesRecursive(fullPath, ext));
      } else if (entry.name.endsWith(ext)) {
        files.push(fullPath);
      }
    });
  } catch (e) {}
  return files;
}

const allFiles = [];
for (const dir of DIRS_TO_SCAN) {
  allFiles.push(...findFilesRecursive(dir, '.js'));
}

if (allFiles.length === 0) {
  console.log(`${colors.bold}${colors.error}ERROR:${colors.reset} No files found for check.\n`);
  return;
} else {
  console.log(`${colors.cyan}${colors.bold}Checking ${allFiles.length} files${colors.reset}\n`);
}

allFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith('debugger;') || trimmed.startsWith('debugger')) {
      issues.critical.push({
        file: file,
        line: lineNum,
        type: 'Debugger statement',
        code: trimmed.substring(0, 100),
      });
    }

    if (trimmed.includes('// TODO') || trimmed.includes('// FIXME')) {
      issues.todos.push({
        file: file,
        line: lineNum,
        code: trimmed.substring(0, 100),
      });
    }

    if (line.match(/console\.(log|warn|error|debug)\(/)) {
      issues.warnings.push({
        file: file,
        line: lineNum,
        type: 'Console statement',
        code: trimmed.substring(0, 100),
      });
    }
  });
});

if (issues.critical.length > 0) {
  console.log(`${colors.red}${colors.bold}CRITICAL ERRORS (${issues.critical.length}):${colors.reset}`);
  issues.critical.forEach((err, idx) => {
    console.log(`   ${idx + 1}. [${colors.cyan}${err.file}:${colors.magenta}${err.line}${colors.reset}] (${err.type})`);
    console.log(`      ${colors.red}${err.code}${colors.reset}`);
  });
  console.log();
}

if (issues.warnings.length > 0) {
  console.log(`${colors.yellow}${colors.bright}WARNINGS (${issues.warnings.length}):${colors.reset}`);
  issues.warnings.forEach((warn, idx) => {
    console.log(`   ${idx + 1}. [${colors.cyan}${warn.file}:${colors.magenta}${warn.line}${colors.reset}]`);
    console.log(`      ${colors.yellow}${warn.code}${colors.reset}`);
  });
  console.log();
}

if (issues.todos.length > 0) {
  console.log(`${colors.white}${colors.bright}TODOs & FIXMEs (${issues.todos.length}):${colors.reset}`);
  issues.todos.forEach((todo, idx) => {
    console.log(`   ${idx + 1}. [${colors.cyan}${todo.file}:${colors.magenta}${todo.line}${colors.reset}]`);
    console.log(`      ${colors.dim}${todo.code}${colors.reset}`);
  });
  console.log();
}

if (issues.critical.length === 0 && issues.warnings.length === 0 && issues.todos.length === 0) {
  console.log(`${colors.green}No issues, warnings, todos found.${colors.reset}\n`);
}

const totalIssues = issues.critical.length + issues.warnings.length + issues.todos.length;

console.log(`\n${colors.cyan}Processing Results:${colors.reset}`);
console.log("─".repeat(40));
console.log(`${colors.bold}Total files checked: ${colors.reset}${allFiles.length}`);
console.log(`* Critical Errors:   ${issues.critical.length > 0 ? colors.red : colors.green}${issues.critical.length}${colors.reset}`);
console.log(`* Warnings:          ${issues.warnings.length > 0 ? colors.yellow : colors.green}${issues.warnings.length}${colors.reset}`);
console.log(`* TODOs / FIXMEs:    ${issues.todos.length > 0 ? colors.cyan : colors.green}${issues.todos.length}${colors.reset}`);
console.log("─".repeat(40));
console.log("\n");

if (issues.critical.length > 0) {
  process.exit(1);
}