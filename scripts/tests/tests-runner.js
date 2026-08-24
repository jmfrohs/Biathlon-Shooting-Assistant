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
const { spawn } = require('child_process');
const path = require('path');
const TestLogger = require('./tests-report');

const category = process.argv[2] || 'general';
const logger = new TestLogger(`tests-${category}`);

const configMap = {
  all: 'scripts/jest/jest.config.all.js',
  src: 'scripts/jest/jest.config.src.js',
  old: 'scripts/jest/jest.config.src-old.js',
};

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  dim: '\x1b[90m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

const config = configMap[category] || configMap['all'];
const reportFile = path.join(process.cwd(), 'tests-outputs', `tests-${category}`, 'jest-summary.json');
const args = ['jest', '--config', config, '--json', '--outputFile', reportFile, ...process.argv.slice(3)];

logger.log(`${colors.cyan}Running tests for category: ${colors.bright}${category}${colors.reset}`);
logger.log(`${colors.dim}Command: npx ${args.join(' ')}${colors.reset}\n`);

const startTime = Date.now();

const formatModuleName = (fileName) => path.basename(String(fileName || ''));

const printStatusLine = (suite) => {
  const moduleName = formatModuleName(suite.name);
  const status = suite.status === 'passed' ? 'PASS' : 'FAIL';
  const color = suite.status === 'passed' ? colors.green : colors.red;

  const assertionDurations = Array.isArray(suite.assertionResults)
    ? suite.assertionResults.reduce((sum, assertion) => sum + (Number(assertion.duration) || 0), 0)
    : 0;
  const durationMs = assertionDurations > 0
    ? assertionDurations
    : (typeof suite.endTime === 'number' && typeof suite.startTime === 'number'
      ? suite.endTime - suite.startTime
      : 0);
  const durationText = `${(durationMs / 1000).toFixed(2)}s`;
  const padLength = 30;
  console.log(`${moduleName.padEnd(padLength)} ${color}${status}${colors.reset} ${colors.dim}(${durationText})${colors.reset}`);
};

const printSummary = (summary) => {
  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(3);
  const safeSummary = {
    numPassedTestSuites: summary?.numPassedTestSuites ?? 0,
    numFailedTestSuites: summary?.numFailedTestSuites ?? 0,
    numTotalTestSuites: summary?.numTotalTestSuites ?? 0,
    numPassedTests: summary?.numPassedTests ?? 0,
    numFailedTests: summary?.numFailedTests ?? 0,
    numTotalTests: summary?.numTotalTests ?? ((summary?.numPassedTests ?? 0) + (summary?.numFailedTests ?? 0)),
    snapshot: { total: summary?.snapshot?.total ?? 0 },
  };

  console.log(`\n${colors.cyan}Processing Results:${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`${colors.bold}* Test Suites: ${colors.reset} ${safeSummary.numPassedTestSuites === safeSummary.numTotalTestSuites ? colors.green : colors.red}${safeSummary.numPassedTestSuites} passed${colors.reset}, ${safeSummary.numTotalTestSuites} total`);
  console.log(`${colors.bold}* Tests:       ${colors.reset} ${safeSummary.numPassedTests === safeSummary.numTotalTests ? colors.green : colors.red}${safeSummary.numPassedTests} passed${colors.reset}, ${safeSummary.numTotalTests} total`);
  console.log(`${colors.bold}* Failed:      ${colors.reset} ${safeSummary.numFailedTestSuites > 0 ? colors.red : colors.green}${safeSummary.numFailedTestSuites} failed test suites${colors.reset}, ${safeSummary.numFailedTests > 0 ? colors.red : colors.green}${safeSummary.numFailedTests} failed tests${colors.reset}`);
  console.log(`${colors.bold}* Snapshots:   ${colors.reset} ${safeSummary.snapshot.total} total`);
  console.log(`${colors.bold}* Total Time:  ${colors.reset} ${durationSeconds} s`);
  console.log('─'.repeat(40));
  console.log('\n');
};

const child = spawn('npx', args, {
  cwd: process.cwd(),
  shell: true,
  env: {
    ...process.env,
    FORCE_COLOR: '1',
    COLUMNS: process.stdout.columns ? String(process.stdout.columns) : '80',
    LINES: process.stdout.rows ? String(process.stdout.rows) : '24',
  },
});

child.stdout.on('data', (data) => {
  fs.appendFileSync(logger.filePath, data.toString());
});

child.stderr.on('data', (data) => {
  fs.appendFileSync(logger.filePath, data.toString());
});

child.on('close', (code) => {
  try {
    const json = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

    for (const suite of json.testResults || []) {
      printStatusLine(suite);
    }

    printSummary(json);
  } catch (error) {
    console.error(`${colors.red}${colors.bold}ERROR while processing${error.message}${colors.reset}`);
    console.log('\n');
  }

  process.exit(code);
});
