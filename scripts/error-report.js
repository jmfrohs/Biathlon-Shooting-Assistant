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
 * Error Report Generator
 * Displays all test errors with file paths and line numbers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '='.repeat(80));
console.log('          TEST ERROR REPORT - Errors with File Paths and Line Numbers');
console.log('='.repeat(80) + '\n');

try {
  // Run Jest with JSON output for detailed error information
  const command = process.platform === 'win32'
    ? 'jest --json --outputFile=.jest-output.json'
    : 'jest --json --outputFile=.jest-output.json 2>/dev/null || true';
  
  try {
    execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: 'pipe'
    });
  } catch (e) {
    // Jest returns non-zero when tests fail, that's ok
  }

  // Read the JSON output
  const jsonPath = path.join(process.cwd(), '.jest-output.json');
  let testResults = { testResults: [] };

  if (fs.existsSync(jsonPath)) {
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    testResults = JSON.parse(jsonContent);
    fs.unlinkSync(jsonPath); // Clean up
  }

  let totalErrors = 0;
  let totalTestsFailed = 0;

  // Collect all errors
  const errorsByFile = {};

  testResults.testResults.forEach(testFile => {
    const fileName = path.relative(process.cwd(), testFile.name);

    testFile.assertionResults.forEach(assertion => {
      if (assertion.status === 'failed') {
        totalTestsFailed++;

        if (!errorsByFile[fileName]) {
          errorsByFile[fileName] = [];
        }

        // Extract error information
        const errorMsg = assertion.failureMessages[0] || 'Unknown error';
        const match = errorMsg.match(/at\s+.*?\s+\(.*?:(\d+):(\d+)\)/);
        const lineNum = match ? match[1] : 'Unknown';

        errorsByFile[fileName].push({
          test: assertion.title,
          error: errorMsg.split('\n')[0],
          line: lineNum,
          fullError: errorMsg
        });

        totalErrors += assertion.failureMessages.length;
      }
    });
  });

  // Display summary
  console.log('📊 ERROR SUMMARY\n');
  console.log(`  Total Test Failures:     ${totalTestsFailed}`);
  console.log(`  Total Error Messages:    ${totalErrors}`);
  console.log(`  Files with Errors:       ${Object.keys(errorsByFile).length}\n`);

  if (Object.keys(errorsByFile).length === 0) {
    console.log('✅ NO ERRORS FOUND - All tests are passing!\n');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  }

  console.log('='.repeat(80) + '\n');

  // Display errors by file
  let fileNumber = 1;
  Object.entries(errorsByFile).forEach(([fileName, errors]) => {
    console.log(`${fileNumber}. 📄 ${fileName}`);
    console.log(`   ${errors.length} error(s)\n`);

    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ❌ Test: ${error.test}`);
      console.log(`      Line: ${error.line}`);
      console.log(`      Error: ${error.error}`);

      // Try to read and show the actual code
      try {
        const fileContent = fs.readFileSync(fileName, 'utf-8');
        const lines = fileContent.split('\n');
        const lineNum = parseInt(error.line) - 1;

        if (lineNum >= 0 && lineNum < lines.length) {
          const contextStart = Math.max(0, lineNum - 2);
          const contextEnd = Math.min(lines.length, lineNum + 3);

          console.log(`\n      Code Context:`);
          for (let i = contextStart; i < contextEnd; i++) {
            const lineContent = lines[i];
            const lineMarker = i === lineNum ? '➜ ' : '  ';
            const lineDisplay = `${(i + 1).toString().padStart(4, ' ')} ${lineMarker} ${lineContent}`;

            if (i === lineNum) {
              console.log(`      \x1b[31m${lineDisplay}\x1b[0m`); // Red for error line
            } else {
              console.log(`      ${lineDisplay}`);
            }
          }
        }
      } catch (e) {
        // Ignore file reading errors
      }

      console.log();
    });

    fileNumber++;
    console.log();
  });

  console.log('='.repeat(80) + '\n');

  // Error categories
  console.log('📋 ERROR CATEGORIES:\n');

  const categories = {
    'Assertion Failures': 0,
    'TypeError': 0,
    'ReferenceError': 0,
    'Expected vs Actual': 0,
    'Other': 0
  };

  Object.values(errorsByFile).forEach(errors => {
    errors.forEach(error => {
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
      const bar = '█'.repeat(percentage / 5);
      console.log(`  ${category.padEnd(25)} ${count.toString().padStart(3, ' ')} (${percentage}%) ${bar}`);
    }
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // Suggestions for fixing errors
  console.log('💡 SUGGESTIONS FOR FIXING ERRORS:\n');

  if (categories['Expected vs Actual'] > 0) {
    console.log('  1. Check assertion expectations vs actual values');
    console.log('     Review the test expectations and implementation\n');
  }

  if (categories['TypeError'] > 0) {
    console.log('  2. Fix type-related issues');
    console.log('     Ensure variables have correct types and methods exist\n');
  }

  if (categories['ReferenceError'] > 0) {
    console.log('  3. Check for undefined variables or functions');
    console.log('     Ensure all required variables are defined and imported\n');
  }

  console.log('  4. Run specific test file to debug:');
  console.log('     npx jest <test-file> --verbose\n');

  console.log('  5. Run single test to isolate issue:');
  console.log('     npx jest <test-file> -t "test name"\n');

  console.log('='.repeat(80) + '\n');

} catch (error) {
  console.log('Error running Jest:\n', error.message);
  console.log('\n' + '='.repeat(80) + '\n');
}
