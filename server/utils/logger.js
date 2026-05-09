const chalk = require('chalk');

/**
 * Colored Logger für HTTP-Requests, WebSocket-Events und Fehler
 */
class Logger {
  constructor() {
    this.startTimes = new Map(); // Track request durations
  }

  /**
   * Format time stamp
   */
  getTime() {
    const now = new Date();
    return now.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /**
   * Log HTTP Request Start
   */
  requestStart(email, method, path, ip) {
    const time = this.getTime();
    const requestId = `${method}:${path}`;
    this.startTimes.set(requestId, Date.now());

    const userStr = email ? chalk.dim(email) : chalk.dim('anonymous');
    const methodStr = chalk.cyan(method.padEnd(6));
    const pathStr = chalk.dim(path);
    const ipStr = chalk.gray(`[${ip}]`);

    console.log(`  ${time} │ ${userStr} │ ${methodStr} ${pathStr} ${ipStr}`);
  }

  /**
   * Log HTTP Request Success (2xx/3xx)
   */
  requestSuccess(email, method, path, statusCode, message = '') {
    const time = this.getTime();
    const requestId = `${method}:${path}`;
    const duration = this.startTimes.has(requestId)
      ? Date.now() - this.startTimes.get(requestId)
      : 0;
    this.startTimes.delete(requestId);

    const userStr = email ? chalk.green(email) : chalk.dim('anonymous');
    const statusStr = chalk.green(statusCode.toString());
    const durationStr = chalk.yellow(`${duration}ms`);
    const msgStr = message ? chalk.gray(`→ ${message}`) : '';

    console.log(`  ${time} │ ${userStr} │ ${statusStr} │ ${durationStr} ${msgStr}`);
  }

  /**
   * Log HTTP Request Warning (4xx)
   */
  requestWarning(email, method, path, statusCode, message = '') {
    const time = this.getTime();
    const requestId = `${method}:${path}`;
    const duration = this.startTimes.has(requestId)
      ? Date.now() - this.startTimes.get(requestId)
      : 0;
    this.startTimes.delete(requestId);

    const userStr = email ? chalk.yellow(email) : chalk.dim('anonymous');
    const statusStr = chalk.yellow(statusCode.toString());
    const durationStr = chalk.gray(`${duration}ms`);
    const msgStr = message ? chalk.yellow(`⚠ ${message}`) : '';

    console.log(`  ${time} │ ${userStr} │ ${statusStr} │ ${durationStr} │ ${msgStr}`);
  }

  /**
   * Log HTTP Request Error (5xx)
   */
  requestError(email, method, path, statusCode, message = '') {
    const time = this.getTime();
    const requestId = `${method}:${path}`;
    const duration = this.startTimes.has(requestId)
      ? Date.now() - this.startTimes.get(requestId)
      : 0;
    this.startTimes.delete(requestId);

    const userStr = email ? chalk.red(email) : chalk.dim('anonymous');
    const statusStr = chalk.red(statusCode.toString());
    const durationStr = chalk.gray(`${duration}ms`);
    const msgStr = message ? chalk.red(`✕ ${message}`) : '';

    console.log(`  ${time} │ ${userStr} │ ${statusStr} │ ${durationStr} │ ${msgStr}`);
  }

  /**
   * Log Database Operation
   */
  database(email, operation, details = '') {
    const time = this.getTime();
    const userStr = email ? chalk.blue(email) : chalk.dim('anonymous');
    const opStr = chalk.cyan(operation.padEnd(10));
    const detStr = details ? chalk.gray(`→ ${details}`) : '';

    console.log(`  ${time} │ ${userStr} │ DB ${opStr} ${detStr}`);
  }

  /**
   * Log WebSocket Event
   */
  socket(email, event, details = '') {
    const time = this.getTime();
    const userStr = email ? chalk.blue(email) : chalk.dim('anonymous');
    const eventStr = chalk.magenta(event.padEnd(20));
    const detStr = details ? chalk.gray(`→ ${details}`) : '';

    console.log(`  ${time} │ ${userStr} │ WS ${eventStr} ${detStr}`);
  }

  /**
   * Log Info Message
   */
  info(message) {
    const time = this.getTime();
    console.log(`  ${time} │ ${chalk.cyan('ℹ')} ${chalk.cyan(message)}`);
  }

  /**
   * Log Warning Message
   */
  warn(message) {
    const time = this.getTime();
    console.log(`  ${time} │ ${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
  }

  /**
   * Log Error with stack trace
   */
  error(message, error = null) {
    const time = this.getTime();
    console.log(`  ${time} │ ${chalk.red('✕')} ${chalk.red(message)}`);
    if (error) {
      console.log(chalk.gray(error.stack || error.toString()));
    }
  }

  /**
   * Log Connection/Startup Events
   */
  startup(message) {
    const time = this.getTime();
    console.log(`  ${time} │ ${chalk.green('→')} ${chalk.green(message)}`);
  }

  /**
   * Log Shutdown Events
   */
  shutdown(message) {
    const time = this.getTime();
    console.log(`  ${time} │ ${chalk.red('←')} ${chalk.red(message)}`);
  }

  /**
   * Log Security Event (failed login, suspicious activity, etc.)
   */
  security(level, message, metadata = {}) {
    const time = this.getTime();
    const metaStr = Object.keys(metadata).length > 0
      ? chalk.gray(`→ ${JSON.stringify(metadata)}`)
      : '';

    const levelStr = level === 'critical'
      ? chalk.red('🔴 CRITICAL')
      : level === 'warning'
      ? chalk.yellow('🟡 WARNING')
      : chalk.blue('🔵 INFO');

    console.log(`  ${time} │ ${levelStr} │ ${message} ${metaStr}`);
  }

  /**
   * Log authentication attempt
   */
  authAttempt(email, ip, success, reason = '') {
    const time = this.getTime();
    const result = success
      ? chalk.green('✓ SUCCESS')
      : chalk.red('✕ FAILED');
    const reasonStr = reason ? chalk.gray(`(${reason})`) : '';
    const ipStr = chalk.gray(`[${ip}]`);

    console.log(`  ${time} │ AUTH │ ${result} │ ${email} ${ipStr} ${reasonStr}`);
  }

  /**
   * Log suspicious activity
   */
  suspicious(activity, email, ip, metadata = {}) {
    const time = this.getTime();
    const actStr = chalk.yellow(activity);
    const userStr = email ? chalk.yellow(email) : chalk.gray('anonymous');
    const ipStr = chalk.gray(`[${ip}]`);
    const metaStr = Object.keys(metadata).length > 0
      ? chalk.gray(` → ${JSON.stringify(metadata)}`)
      : '';

    console.log(`  ${time} │ ${chalk.yellow('⚠')} SUSPICIOUS │ ${actStr} │ ${userStr} ${ipStr}${metaStr}`);
  }
}

module.exports = new Logger();
