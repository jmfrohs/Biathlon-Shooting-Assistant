const fs = require('fs');
const path = require('path');

/**
 * TestLogger utility for saving test outputs to timestamped files
 */
class TestLogger {
  constructor(reportName) {
    this.reportName = reportName;
    this.outputDir = path.join(process.cwd(), 'test-outputs', reportName);
    this.init();
  }

  /**
   * Initialize the output directory and file path
   */
  init() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');

    this.filePath = path.join(this.outputDir, `${timestamp}.txt`);

    // Header for the file
    fs.writeFileSync(this.filePath, `REPORT: ${this.reportName}\n`);
    fs.appendFileSync(this.filePath, `GENERATED: ${now.toLocaleString()}\n`);
    fs.appendFileSync(this.filePath, '='.repeat(80) + '\n\n');
  }

  /**
   * Log a message to both console and file
   */
  log(message = '') {
    console.log(message);
    // Strip ANSI colors for the file output
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(this.filePath, cleanMessage + '\n');
  }

  /**
   * Log an error message
   */
  error(message = '') {
    console.error(message);
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(this.filePath, `ERROR: ${cleanMessage}\n`);
  }
}

module.exports = TestLogger;
