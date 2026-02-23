const { spawn } = require('child_process');
const path = require('path');
const TestLogger = require('./test-logger');

const category = process.argv[2] || 'general';
const logger = new TestLogger(`${category}-tests`);

// Determine the jest config based on the category
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
  env: { ...process.env, FORCE_COLOR: '0' }, // Disable colors for cleaner logs if needed, but TestLogger strips them anyway
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  logger.log(output);
});

child.stderr.on('data', (data) => {
  const output = data.toString();
  // stderr often contains the main Jest progress/results
  logger.log(output);
});

child.on('close', (code) => {
  logger.log(`\nTest execution finished with exit code ${code}`);
  process.exit(code);
});
