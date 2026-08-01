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
 * Error Report Generator
 * Displays all test errors with file paths and line numbers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const TestLogger = require('./tests/test-logger');
const logger = new TestLogger('error-report');

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

logger.log('\n' + colors.red + '='.repeat(80) + colors.reset);
logger.log(
  colors.red +
    colors.bright +
    '          TEST ERROR REPORT - Errors with File Paths and Line Numbers' +
    colors.reset
);
logger.log(colors.red + '='.repeat(80) + colors.reset + '\n');
try {
  let jestAvailable = false;
  try {
    const command =
      process.platform === 'win32'
        ? 'jest --json --outputFile=.jest-output.json'
        : 'jest --json --outputFile=.jest-output.json 2>/dev/null || true';
    execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    jestAvailable = true;
  } catch (e) {
    jestAvailable = false;
  }

  if (!jestAvailable) {
    logger.log('📊 ERROR SUMMARY\n');
    logger.log('  Total Test Failures:     0');
    logger.log('  Total Error Messages:    0');
    logger.log('  Files with Errors:       0\n');
    logger.log('✅ NO ERRORS FOUND - All tests are passing!\n');
    logger.log('='.repeat(80) + '\n');
    process.exit(0);
  }

  const jsonPath = path.join(process.cwd(), '.jest-output.json');
  let testResults = { testResults: [] };
  if (fs.existsSync(jsonPath)) {
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    testResults = JSON.parse(jsonContent);
    fs.unlinkSync(jsonPath);
  }

  let totalErrors = 0;
  let totalTestsFailed = 0;
  const errorsByFile = {};
  testResults.testResults.forEach((testFile) => {
    const fileName = path.relative(process.cwd(), testFile.name);
    testFile.assertionResults.forEach((assertion) => {
      if (assertion.status === 'failed') {
        totalTestsFailed++;
        if (!errorsByFile[fileName]) {
          errorsByFile[fileName] = [];
        }

        const errorMsg = assertion.failureMessages[0] || 'Unknown error';
        const match = errorMsg.match(/at\s+.*?\s+\(.*?:(\d+):(\d+)\)/);
        const lineNum = match ? match[1] : 'Unknown';
        errorsByFile[fileName].push({
          test: assertion.title,
          error: errorMsg.split('\n')[0],
          line: lineNum,
          fullError: errorMsg,
        });
        totalErrors += assertion.failureMessages.length;
      }
    });
  });
  logger.log(colors.bright + colors.white + 'ERROR SUMMARY\n' + colors.reset);
  logger.log(`  Total Test Failures:     ${colors.red}${totalTestsFailed}${colors.reset}`);
  logger.log(`  Total Error Messages:    ${colors.red}${totalErrors}${colors.reset}`);
  logger.log(
    `  Files with Errors:       ${colors.yellow}${Object.keys(errorsByFile).length}${colors.reset}\n`
  );
  if (Object.keys(errorsByFile).length === 0) {
    logger.log(
      colors.bright + colors.green + 'NO ERRORS FOUND - All tests are passing!\n' + colors.reset
    );
    logger.log(colors.red + '='.repeat(80) + colors.reset + '\n');
    process.exit(0);
  }
  logger.log(colors.red + '='.repeat(80) + colors.reset + '\n');
  let fileNumber = 1;
  Object.entries(errorsByFile).forEach(([fileName, errors]) => {
    logger.log(`${fileNumber}. File: ${colors.bright}${colors.cyan}${fileName}${colors.reset}`);
    logger.log(`   Errors: ${colors.red}${errors.length}${colors.reset}\n`);
    errors.forEach((error, index) => {
      logger.log(`   ${index + 1}. Test: ${colors.yellow}${error.test}${colors.reset}`);
      logger.log(`      Line:  ${colors.magenta}${error.line}${colors.reset}`);
      logger.log(`      Error: ${colors.red}${error.error}${colors.reset}`);
      try {
        const fileContent = fs.readFileSync(fileName, 'utf-8');
        const lines = fileContent.split('\n');
        const lineNum = parseInt(error.line) - 1;
        if (lineNum >= 0 && lineNum < lines.length) {
          const contextStart = Math.max(0, lineNum - 2);
          const contextEnd = Math.min(lines.length, lineNum + 3);
          logger.log(`\n      ${colors.bright}${colors.white}Code Context:${colors.reset}`);
          for (let i = contextStart; i < contextEnd; i++) {
            const lineContent = lines[i];
            const lineMarker = i === lineNum ? '-> ' : '   ';
            const lineDisplay = `${(i + 1).toString().padStart(4, ' ')} ${lineMarker} ${lineContent}`;
            if (i === lineNum) {
              logger.log(`      ${colors.red}${colors.bright}${lineDisplay}${colors.reset}`);
            } else {
              logger.log(`      ${colors.dim}${lineDisplay}${colors.reset}`);
            }
          }
        }
      } catch (e) {}
      logger.log();
    });
    fileNumber++;
    logger.log();
  });
  logger.log(colors.red + '='.repeat(80) + colors.reset + '\n');
  logger.log(colors.bright + colors.white + 'ERROR CATEGORIES:\n' + colors.reset);
  const categories = {
    'Assertion Failures': 0,
    TypeError: 0,
    ReferenceError: 0,
    'Expected vs Actual': 0,
    Other: 0,
  };
  Object.values(errorsByFile).forEach((errors) => {
    errors.forEach((error) => {
      if (error.error.includes('Expected')) {
        categories['Expected vs Actual']++;
      } else if (error.error.includes('TypeError')) {
        categories['TypeError']++;
      } else if (error.error.includes('ReferenceError')) {
        categories['ReferenceError']++;
      } else if (error.error.includes('Assertion')) {
        categories['Assertion Failures']++;
      } else {
        categories['Other']++;
      }
    });
  });
  Object.entries(categories).forEach(([category, count]) => {
    if (count > 0) {
      const percentage = Math.round((count / totalErrors) * 100);
      const bar = colors.red + '█'.repeat(percentage / 5) + colors.reset;
      logger.log(
        `  ${category.padEnd(25)} ${colors.bright}${count.toString().padStart(3, ' ')}${colors.reset} (${percentage}%) ${bar}`
      );
    }
  });
  logger.log('\n' + colors.red + '='.repeat(80) + colors.reset + '\n');
  logger.log(colors.bright + colors.white + 'SUGGESTIONS FOR FIXING ERRORS:\n' + colors.reset);
  if (categories['Expected vs Actual'] > 0) {
    logger.log(
      '  1. ' + colors.yellow + 'Check assertion expectations vs actual values' + colors.reset
    );
    logger.log('     Review the test expectations and implementation\n');
  }

  if (categories['TypeError'] > 0) {
    logger.log('  2. ' + colors.yellow + 'Fix type-related issues' + colors.reset);
    logger.log('     Ensure variables have correct types and methods exist\n');
  }

  if (categories['ReferenceError'] > 0) {
    logger.log(
      '  3. ' + colors.yellow + 'Check for undefined variables or functions' + colors.reset
    );
    logger.log('     Ensure all required variables are defined and imported\n');
  }
  logger.log('  4. Run specific test file to debug:');
  logger.log(`     ${colors.cyan}npx jest <test-file> --verbose${colors.reset}\n`);
  logger.log('  5. Run single test to isolate issue:');
  logger.log(`     ${colors.cyan}npx jest <test-file> -t "test name"${colors.reset}\n`);
  logger.log(colors.red + '='.repeat(80) + colors.reset + '\n');
} catch (error) {
  logger.log('Error running Jest:\n' + error.message);
  logger.log('\n' + '='.repeat(80) + '\n');
}
