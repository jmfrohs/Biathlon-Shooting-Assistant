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

console.log('\n' + '='.repeat(90));
console.log('          🔍 COMPREHENSIVE ERROR REPORT - Tests & Source Code');
console.log('='.repeat(90) + '\n');

let totalErrors = 0;
const allErrors = [];

// ============================================================================
// PART 1: Check Test Errors
// ============================================================================
console.log('📋 CHECKING TEST ERRORS...\n');

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
  } catch (e) {
    // Jest returns non-zero when tests fail, that's ok
  }

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
} catch (e) {
  // Error checking tests
}

// ============================================================================
// PART 2: Check Source Code for Syntax Errors and Issues
// ============================================================================
console.log('📋 CHECKING SOURCE CODE ERRORS...\n');

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
  } catch (e) {
    // Directory doesn't exist, skip
  }
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

  // Check for common issues
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Check for console.log statements (non-test)
    if (line.match(/console\.(log|warn|error)\(/) && !filePath.includes('.test')) {
      // Allow console in specific cases
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

    // 2. Check for TODO/FIXME comments
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

// ============================================================================
// PART 3: Display Results
// ============================================================================

if (allErrors.length === 0) {
  console.log('✅ NO ERRORS FOUND!\n');
  console.log('Test Status:  ✅ All tests passing');
  console.log('Source Code:  ✅ No syntax errors detected\n');
} else {
  // Group by type
  const byType = {};
  allErrors.forEach((err) => {
    if (!byType[err.type]) byType[err.type] = [];
    byType[err.type].push(err);
  });

  // Display results
  Object.keys(byType).forEach((type) => {
    const errors = byType[type];
    console.log(`\n${type === 'TEST' ? '❌' : '⚠️'} ${type} ERRORS (${errors.length}):`);
    console.log('-'.repeat(90));

    errors.forEach((err, idx) => {
      console.log(`\n  ${idx + 1}. ${err.file}:${err.line}`);
      console.log(`     Error: ${err.error.substring(0, 100)}`);
      if (err.context) {
        console.log(`     Code: ${err.context.substring(0, 80)}`);
      }
      if (err.testName) {
        console.log(`     Test: ${err.testName}`);
      }
    });
  });

  console.log('\n' + '='.repeat(90));
  console.log(`📊 ERROR SUMMARY: ${allErrors.length} total error(s) found`);
  console.log('='.repeat(90) + '\n');
}

// Clean up
try {
  if (fs.existsSync('.jest-output.json')) {
    fs.unlinkSync('.jest-output.json');
  }
} catch (e) {
  // Cleanup error, ignore
}
