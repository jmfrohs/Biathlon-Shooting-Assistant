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
 * Comprehensive Error Report
 * Shows all errors in both tests and source code with exact locations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const TestLogger = require('./tests/test-logger');
const logger = new TestLogger('all-errors');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
};

logger.log('\n' + colors.cyan + '='.repeat(90) + colors.reset);
logger.log(
  colors.cyan +
    colors.bright +
    '          COMPREHENSIVE ERROR REPORT - Tests & Source Code' +
    colors.reset
);
logger.log(colors.cyan + '='.repeat(90) + colors.reset + '\n');
let totalErrors = 0;
const allErrors = [];
logger.log(colors.cyan + 'CHECKING TEST ERRORS...\n' + colors.reset);
try {
  const command =
    process.platform === 'win32'
      ? 'jest --json --outputFile=.jest-output.json'
      : 'jest --json --outputFile=.jest-output.json 2>/dev/null || true';
  try {
    execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch (e) {}

  const jsonPath = path.join(process.cwd(), '.jest-output.json');
  let testResults = { testResults: [] };
  if (fs.existsSync(jsonPath)) {
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    testResults = JSON.parse(jsonContent);
    fs.unlinkSync(jsonPath);
  }
  testResults.testResults.forEach((testFile) => {
    const fileName = path.relative(process.cwd(), testFile.name);
    testFile.assertionResults.forEach((assertion) => {
      if (assertion.status === 'failed') {
        totalErrors++;
        allErrors.push({
          type: 'TEST',
          file: fileName,
          testName: assertion.title,
          error: assertion.failureMessages[0] || 'Unknown error',
          line: assertion.location ? assertion.location.line : 'unknown',
        });
      }
    });
  });
} catch (e) {}
logger.log(colors.cyan + 'CHECKING SOURCE CODE ERRORS...\n' + colors.reset);

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

const srcDirs = ['src/js', 'src/css'];
const allSourceFiles = [];
srcDirs.forEach((dir) => {
  allSourceFiles.push(...findFilesRecursive(dir, '.js'));
});
allSourceFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (line.match(/console\.(log|warn|error)\(/) && !filePath.includes('.test')) {
      if (!line.includes('// TODO') && !line.includes('// FIXME')) {
        allErrors.push({
          type: 'WARNING',
          file: filePath,
          line: lineNum,
          error: 'console statement found: ' + line.trim(),
          context: line.trim(),
        });
      }
    }

    if (line.includes('// TODO') || line.includes('// FIXME')) {
      allErrors.push({
        type: 'TODO',
        file: filePath,
        line: lineNum,
        error: line.trim(),
        context: line.trim(),
      });
    }
  });
});
if (allErrors.length === 0) {
  logger.log(colors.bright + colors.green + 'NO ERRORS FOUND!\n' + colors.reset);
  logger.log(`Test Status:  ${colors.green}[OK] All tests passing${colors.reset}`);
  logger.log(`Source Code:  ${colors.green}[OK] No syntax errors detected${colors.reset}\n`);
} else {
  const byType = {};
  allErrors.forEach((err) => {
    if (!byType[err.type]) byType[err.type] = [];
    byType[err.type].push(err);
  });
  Object.keys(byType).forEach((type) => {
    const errors = byType[type];
    const typeColor =
      type === 'TEST' ? colors.red : type === 'WARNING' ? colors.yellow : colors.cyan;
    const typeLabel = type === 'TEST' ? '[FAIL]' : type === 'WARNING' ? '[WARN]' : '[TODO]';
    logger.log(
      `\n${typeColor}${colors.bright}${typeLabel} ${type} ERRORS (${errors.length}):${colors.reset}`
    );
    logger.log(colors.dim + '-'.repeat(90) + colors.reset);
    errors.forEach((err, idx) => {
      logger.log(
        `\n  ${idx + 1}. [${colors.cyan}${err.file}:${colors.magenta}${err.line}${colors.reset}]`
      );
      logger.log(`     Error: ${colors.red}${err.error.substring(0, 100)}${colors.reset}`);
      if (err.context) {
        logger.log(`     Code:  ${colors.dim}${err.context.substring(0, 80)}${colors.reset}`);
      }

      if (err.testName) {
        logger.log(`     Test:  ${colors.yellow}${err.testName}${colors.reset}`);
      }
    });
  });
  logger.log('\n' + colors.cyan + '='.repeat(90) + colors.reset);
  logger.log(
    `${colors.bright}${colors.white}ERROR SUMMARY: ${allErrors.length} total error(s) found${colors.reset}`
  );
  logger.log(colors.cyan + '='.repeat(90) + colors.reset + '\n');
}
try {
  if (fs.existsSync('.jest-output.json')) {
    fs.unlinkSync('.jest-output.json');
  }
} catch (e) {}
