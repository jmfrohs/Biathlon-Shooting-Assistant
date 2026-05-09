const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Database Security Utilities
 * Handles backups, integrity checks, and secure cleanup
 */
class DatabaseSecurity {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.backupDir = path.join(path.dirname(dbPath), 'backups');
    this.ensureBackupDirExists();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDirExists() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('Database backup directory created');
    }
  }

  /**
   * Create a backup of the database
   * @returns {boolean} Success status
   */
  createBackup() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        logger.warn('Database file not found for backup');
        return false;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup-${timestamp}.db`);

      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);

      logger.info(`Database backed up to ${backupPath}`);
      this.cleanOldBackups();
      return true;
    } catch (err) {
      logger.error('Database backup failed', err);
      logger.security('critical', 'Database backup operation failed', { error: err.message });
      return false;
    }
  }

  /**
   * Clean old backups (keep only last 7 days)
   */
  cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < sevenDaysAgo) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted old backup: ${file}`);
        }
      });
    } catch (err) {
      logger.error('Cleanup old backups failed', err);
    }
  }

  /**
   * Schedule automatic backups (every 24 hours)
   */
  scheduleAutoBackup() {
    // Create initial backup
    this.createBackup();

    // Schedule daily backups
    setInterval(() => {
      this.createBackup();
    }, 24 * 60 * 60 * 1000);

    logger.info('Database auto-backup scheduled (daily)');
  }

  /**
   * Secure delete sensitive data
   * Overwrites data multiple times before deletion
   * @param {string} filePath Path to file to securely delete
   * @param {number} passes Number of overwrite passes (default: 3)
   */
  secureDelete(filePath, passes = 3) {
    try {
      if (!fs.existsSync(filePath)) {
        logger.warn(`File not found for secure delete: ${filePath}`);
        return false;
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Overwrite file multiple times
      for (let i = 0; i < passes; i++) {
        const randomData = require('crypto').randomBytes(fileSize);
        fs.writeFileSync(filePath, randomData);
      }

      // Finally delete the file
      fs.unlinkSync(filePath);

      logger.database('SYSTEM', 'DELETE', `Securely deleted: ${filePath}`);
      logger.security('info', 'File securely deleted', { file: path.basename(filePath) });
      return true;
    } catch (err) {
      logger.error('Secure delete failed', err);
      logger.security('critical', 'Secure file deletion failed', { error: err.message });
      return false;
    }
  }

  /**
   * Check database integrity
   * @param {Database} db Database instance
   * @returns {boolean} Integrity check passed
   */
  checkIntegrity(db) {
    try {
      // Run PRAGMA integrity_check on SQLite
      const result = db.prepare('PRAGMA integrity_check').all();
      
      if (result.length > 0 && result[0].integrity_check === 'ok') {
        logger.info('Database integrity check passed');
        return true;
      } else {
        logger.error('Database integrity check failed', new Error('Corruption detected'));
        logger.security('critical', 'Database integrity check failed', { details: result });
        return false;
      }
    } catch (err) {
      logger.error('Database integrity check error', err);
      logger.security('critical', 'Database integrity check error', { error: err.message });
      return false;
    }
  }

  /**
   * Enable Write-Ahead Logging (WAL) for better concurrency
   * @param {Database} db Database instance
   */
  enableWAL(db) {
    try {
      db.pragma('journal_mode = WAL');
      logger.info('Database WAL mode enabled');
    } catch (err) {
      logger.error('Failed to enable WAL mode', err);
    }
  }

  /**
   * Set PRAGMA settings for better security
   * @param {Database} db Database instance
   */
  setPragmas(db) {
    try {
      // Foreign keys
      db.pragma('foreign_keys = ON');
      
      // Journal
      db.pragma('journal_mode = WAL');
      
      // Synchronous - NORMAL is faster but still safe
      db.pragma('synchronous = NORMAL');
      
      // Temp store in memory for performance
      db.pragma('temp_store = MEMORY');
      
      logger.info('Database PRAGMA settings applied');
    } catch (err) {
      logger.error('Failed to set PRAGMA settings', err);
    }
  }
}

module.exports = DatabaseSecurity;
