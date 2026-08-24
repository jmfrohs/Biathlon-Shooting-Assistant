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
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

/**
 * TestLogger utility for saving test outputs to timestamped files
 */
class TestLogger {
  constructor(reportName) {
    this.reportName = reportName;
    this.outputDir = path.join(process.cwd(), 'tests-outputs', reportName);
    this.init();
  }

  /**
   * Initialize the output directory and file path
   */
  init() {
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      const now = new Date();
      const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');

      this.filePath = path.join(this.outputDir, `${timestamp}.txt`);

      fs.writeFileSync(this.filePath, `REPORT: ${this.reportName}\n`);
      fs.appendFileSync(this.filePath, `GENERATED: ${now.toLocaleString()}\n`);
      fs.appendFileSync(this.filePath, '='.repeat(80) + '\n\n');

      console.log(`${COLORS.green}${COLORS.bold}Report generated: ${this.filePath}${COLORS.reset}\n`);
    } catch (err) {
      console.error(`${COLORS.red}${COLORS.bold}ERROR: while generating report: ${err.message}${COLORS.reset}\n`);
    }
  }

  /**
   * Log a success message
   */
  success(message = '') {
    console.log(`${COLORS.green}${message}${COLORS.reset}`);
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(this.filePath, `SUCCESS: ${cleanMessage}\n`);
  }

  /**
   * Log a message to both console and file
   */
  log(message = '') {
    console.log(message);
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(this.filePath, cleanMessage + '\n');
  }

  /**
   * Log an error message
   */
  error(message = '') {
    console.error(`${COLORS.red}${message}${COLORS.reset}`);
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(this.filePath, `ERROR: ${cleanMessage}\n`);
  }

  /**
   * Write raw stdout chunk to both console and file without adding newlines
   */
  write(message = '') {
    process.stdout.write(message);
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(this.filePath, cleanMessage);
  }

  /**
   * Write raw stderr chunk to both console and file without adding newlines
   */
  writeError(message = '') {
    process.stderr.write(`${COLORS.red}${message}${COLORS.reset}`);
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(this.filePath, cleanMessage);
  }
}

if (require.main === module) {
  const logger = new TestLogger('tests-report');
}

module.exports = TestLogger;

