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
 * Quick Error Report - Shows all errors with file paths
 * Runs tests and displays errors in a readable format
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TestLogger = require(path.join(__dirname, 'tests-report.js'));
const logger = new TestLogger('quick-errors');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

logger.log('\n' + colors.cyan + '='.repeat(85) + colors.reset);
logger.log(
  colors.cyan +
    colors.bright +
    '                    QUICK ERROR REPORT - All Errors with Locations' +
    colors.reset
);
logger.log(colors.cyan + '='.repeat(85) + colors.reset + '\n');

try {
  let output = '';
  try {
    output = execSync('npx jest --verbose --no-coverage', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {

    output = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');

    if (!output || e.code === 'ENOENT') {
      logger.log(
        colors.yellow + '[INFO] Jest not available, running code analysis instead...\n' + colors.reset
      );
      execSync('node scripts/code-analysis.js', {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
      process.exit(0);
    }
  }

  const lines = output.split('\n');
  const errors = [];
  let currentTest = '';
  let currentFile = '';

  lines.forEach((line) => {
    if (line.includes('FAIL') || line.includes('PASS')) {
      if (line.includes('tests/')) {
        currentFile = line.match(/tests\/[\w\-.]+/)?.[0] || '';
      }
    }

    if (line.includes('●') || line.includes('✓') || line.includes('✕')) {
      const match = line.match(/[●✕]\s+(.+)/);
      if (match) {
        currentTest = match[1];
      }
    }

    if (line.includes('Error:') || line.includes('expect') || line.includes('at ')) {
      if (currentTest) {
        errors.push({
          file: currentFile,
          test: currentTest,
          error: line.trim(),
        });
      }
    }
  });

  const passMatch = output.match(/(\d+)\s+passed/);
  const failMatch = output.match(/(\d+)\s+failed/);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;

  logger.log(colors.bright + colors.white + 'TEST EXECUTION SUMMARY\n' + colors.reset);
  logger.log(`  Passed:        ${colors.green}${passed}${colors.reset}`);
  logger.log(`  Failed:        ${colors.red}${failed}${colors.reset}`);
  logger.log(`  Total:         ${colors.bright}${passed + failed}${colors.reset}\n`);

  if (failed === 0 && passed > 0) {
    logger.log(
      colors.bright + colors.green + 'NO ERRORS - All tests are passing!\n' + colors.reset
    );
    logger.log(colors.cyan + '='.repeat(85) + colors.reset + '\n');
    process.exit(0);
  }

  logger.log(colors.cyan + '='.repeat(85) + colors.reset + '\n');

  const errorsByFile = {};
  errors.forEach((err) => {
    const fileKey = err.file || 'General Errors';
    if (!errorsByFile[fileKey]) {
      errorsByFile[fileKey] = [];
    }
    errorsByFile[fileKey].push(err);
  });

  let fileNum = 1;
  Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
    logger.log(`${fileNum}. File: ${colors.bright}${colors.cyan}${file}${colors.reset}`);
    logger.log(`   Errors in this file: ${colors.red}${fileErrors.length}${colors.reset}\n`);
    let errorNum = 1;
    fileErrors.forEach((err) => {
      logger.log(`   ${errorNum}. Test: ${colors.yellow}${err.test}${colors.reset}`);
      logger.log(`      ${colors.red}${err.error}${colors.reset}\n`);
      errorNum++;
    });
    fileNum++;
  });

  logger.log(colors.cyan + '='.repeat(85) + colors.reset + '\n');
  logger.log(colors.bright + colors.white + 'DETAILED TEST OUTPUT:\n' + colors.reset);
  logger.log(output);
  logger.log('\n' + colors.cyan + '='.repeat(85) + colors.reset + '\n');
} catch (error) {
  logger.error(error.message);
}
