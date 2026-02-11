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
console.log('\n' + '='.repeat(85));
console.log('                    🔍 QUICK ERROR REPORT - All Errors with Locations');
console.log('='.repeat(85) + '\n');
try {
  let output = '';
  try {
    output = execSync('jest --verbose --no-coverage 2>&1', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
  } catch (e) {
    console.log('📝 Jest not available, running code analysis instead...\n');
    execSync('node scripts/code-analysis.js', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    process.exit(0);
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
  const passMatch = output.match(/(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;
  console.log('📊 TEST EXECUTION SUMMARY\n');
  console.log(`  ✅ Passed:        ${passed}`);
  console.log(`  ❌ Failed:        ${failed}`);
  console.log(`  Total:           ${passed + failed}\n`);
  if (failed === 0) {
    console.log('✅ NO ERRORS - All tests are passing!\n');
    console.log('='.repeat(85) + '\n');
    process.exit(0);
  }
  console.log('='.repeat(85) + '\n');
  const errorsByFile = {};
  errors.forEach((err) => {
    if (!errorsByFile[err.file]) {
      errorsByFile[err.file] = [];
    }
    errorsByFile[err.file].push(err);
  });
  let fileNum = 1;
  Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
    console.log(`${fileNum}. 📄 File: ${file}`);
    console.log(`   Errors in this file: ${fileErrors.length}\n`);
    let errorNum = 1;
    fileErrors.forEach((err) => {
      console.log(`   ${errorNum}. Test: ${err.test}`);
      console.log(`      ${err.error}\n`);
      errorNum++;
    });
    fileNum++;
  });
  console.log('='.repeat(85) + '\n');
  console.log('📋 DETAILED TEST OUTPUT:\n');
  console.log(output);
  console.log('\n' + '='.repeat(85) + '\n');
} catch (error) {
  const output = error.stdout ? error.stdout.toString() : error.message;
  console.log(output);
  const errorLines = output
    .split('\n')
    .filter(
      (line) =>
        line.includes('●') ||
        line.includes('✕') ||
        line.includes('Error:') ||
        line.includes('expect') ||
        line.includes('FAIL')
    );
  if (errorLines.length > 0) {
    console.log('\n' + '='.repeat(85) + '\n');
    console.log('🔴 ERRORS FOUND:\n');
    errorLines.forEach((line, index) => {
      console.log(`${index + 1}. ${line.trim()}`);
    });
    console.log('\n' + '='.repeat(85) + '\n');
  }
}