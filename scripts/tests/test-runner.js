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

const config = configMap[category] || configMap['all'];
const args = ['jest', '--config', config, ...process.argv.slice(3)];

logger.log(`Running tests for category: ${category}`);
logger.log(`Command: npx ${args.join(' ')}\n`);

const child = spawn('npx', args, {
  cwd: process.cwd(),
  shell: true,
  env: { ...process.env, FORCE_COLOR: '0' },
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  logger.log(output);
});

child.stderr.on('data', (data) => {
  const output = data.toString();
  logger.log(output);
});

child.on('close', (code) => {
  logger.log(`\nTest execution finished with exit code ${code}`);
  process.exit(code);
});
