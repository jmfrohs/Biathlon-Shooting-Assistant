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

const { spawn } = require('child_process');
const path = require('path');
const TestLogger = require('./test-logger');

const category = process.argv[2] || 'general';
const logger = new TestLogger(`${category}-tests`);

const configMap = {
  all: 'scripts/jest.config.all.js',
  src: 'scripts/jest.config.src.js',
  old: 'scripts/jest.config.src-old.js',
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  dim: '\x1b[90m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

const config = configMap[category] || configMap['all'];
const args = ['jest', '--config', config, ...process.argv.slice(3)];

logger.log(`${colors.cyan}Running tests for category: ${colors.bright}${category}${colors.reset}`);
logger.log(`${colors.dim}Command: npx ${args.join(' ')}${colors.reset}\n`);

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
  const output = data.toString();
  logger.write(output);
});

child.stderr.on('data', (data) => {
  const output = data.toString();
  logger.writeError(output);
});

child.on('close', (code) => {
  const color = code === 0 ? colors.green : colors.red;
  logger.log(`\n${color}Test execution finished with exit code ${code}${colors.reset}`);
  process.exit(code);
});
