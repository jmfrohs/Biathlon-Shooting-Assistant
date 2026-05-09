/**
 * Data Privacy & Protection Utilities
 * Handles GDPR-compliant data handling, secure deletion, and privacy controls
 */

const DatabaseSecurity = require('./database-security');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class DataPrivacy {
  /**
   * Delete all data associated with a user (GDPR right to be forgotten)
   * @param {Database} db Database instance
   * @param {number} userId User ID
   * @returns {boolean} Success status
   */
  static deleteUserData(db, userId) {
    try {
      // Get user email before deletion
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
      if (!user) {
        logger.warn(`User not found for deletion: ${userId}`);
        return false;
      }

      // Delete all user-related data in transactions
      db.exec('BEGIN TRANSACTION');

      try {
        // Delete sessions
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

        // Delete athletes (cascade should handle series and shots)
        db.prepare('DELETE FROM athletes WHERE user_id = ?').run(userId);

        // Delete session collaborations
        db.prepare('DELETE FROM session_collaborators WHERE user_id = ?').run(userId);

        // Delete settings
        db.prepare('DELETE FROM settings WHERE user_id = ?').run(userId);

        // Finally delete the user account
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        db.exec('COMMIT');

        logger.database('SYSTEM', 'DELETE', `All data deleted for user: ${user.email}`);
        logger.security('warning', 'User data deleted (GDPR)', {
          userId,
          email: user.email,
          timestamp: new Date().toISOString()
        });

        return true;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    } catch (err) {
      logger.error('User data deletion failed', err);
      logger.security('critical', 'User data deletion failed', { userId, error: err.message });
      return false;
    }
  }

  /**
   * Export all user data (GDPR data portability)
   * @param {Database} db Database instance
   * @param {number} userId User ID
   * @returns {object} User data export
   */
  static exportUserData(db, userId) {
    try {
      const user = db.prepare('SELECT id, email, trainer_name, role, created_at FROM users WHERE id = ?').get(userId);
      if (!user) {
        logger.warn(`User not found for export: ${userId}`);
        return null;
      }

      const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(userId);
      const athletes = db.prepare('SELECT * FROM athletes WHERE user_id = ?').all(userId);
      const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').all(userId);

      const export_data = {
        user,
        sessions,
        athletes,
        settings,
        exportedAt: new Date().toISOString(),
        dataVersion: '1.0'
      };

      logger.database(user.email, 'EXPORT', 'User data exported');
      logger.security('info', 'User data exported (GDPR)', {
        userId,
        email: user.email,
        recordCount: sessions.length + athletes.length + settings.length
      });

      return export_data;
    } catch (err) {
      logger.error('User data export failed', err);
      return null;
    }
  }

  /**
   * Anonymize user data (remove personal identifiers while keeping structure)
   * @param {Database} db Database instance
   * @param {number} userId User ID
   * @returns {boolean} Success status
   */
  static anonymizeUserData(db, userId) {
    try {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
      if (!user) {
        logger.warn(`User not found for anonymization: ${userId}`);
        return false;
      }

      db.exec('BEGIN TRANSACTION');

      try {
        // Anonymize user account
        const anonymizedEmail = `user_${userId}_anonymized@example.com`;
        const anonymizedName = `Anonymized User ${userId}`;

        db.prepare('UPDATE users SET email = ?, trainer_name = ? WHERE id = ?').run(
          anonymizedEmail,
          anonymizedName,
          userId
        );

        // Anonymize athlete names
        db.prepare('UPDATE athletes SET name = ? WHERE user_id = ?').run(
          `Athlete_${userId}`,
          userId
        );

        db.exec('COMMIT');

        logger.database('SYSTEM', 'UPDATE', `User ${user.email} anonymized`);
        logger.security('warning', 'User data anonymized', {
          userId,
          originalEmail: user.email
        });

        return true;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    } catch (err) {
      logger.error('User data anonymization failed', err);
      return false;
    }
  }

  /**
   * Check data retention policies and delete old data
   * Deletes demo accounts and old data based on retention settings
   * @param {Database} db Database instance
   * @param {number} retentionDays Days to keep data (default: 365)
   * @returns {object} Statistics
   */
  static enforceDataRetention(db, retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const stats = {
        deletedDemoAccounts: 0,
        deletedOldSessions: 0,
        deletedOldAthletes: 0
      };

      // Delete expired demo accounts
      const demoResult = db.prepare(`
        DELETE FROM users 
        WHERE is_demo = 1 AND demo_expires_at < datetime('now')
      `).run();
      stats.deletedDemoAccounts = demoResult.changes;

      // Delete old sessions (older than retention period, unless user requests differently)
      const sessionResult = db.prepare(`
        DELETE FROM sessions 
        WHERE created_at < ? AND user_id NOT IN (
          SELECT id FROM users WHERE role = 'admin'
        )
      `).run(cutoffDateStr);
      stats.deletedOldSessions = sessionResult.changes;

      logger.database('SYSTEM', 'DELETE', `Data retention enforced: ${JSON.stringify(stats)}`);
      logger.security('info', 'Data retention policy enforced', stats);

      return stats;
    } catch (err) {
      logger.error('Data retention enforcement failed', err);
      return null;
    }
  }

  /**
   * Create data deletion request record
   * Useful for audit trails and legal compliance
   * @param {Database} db Database instance
   * @param {number} userId User ID
   * @param {string} requestType Type of request (e.g., 'deletion', 'anonymization')
   * @returns {boolean} Success status
   */
  static recordPrivacyRequest(db, userId, requestType = 'deletion') {
    try {
      // Create audit table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS privacy_requests (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          request_type TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      db.prepare(`
        INSERT INTO privacy_requests (user_id, request_type, status)
        VALUES (?, ?, 'pending')
      `).run(userId, requestType);

      logger.database('SYSTEM', 'INSERT', `Privacy request recorded: ${requestType} for user ${userId}`);

      return true;
    } catch (err) {
      logger.error('Privacy request recording failed', err);
      return false;
    }
  }

  /**
   * Get privacy policy information
   * @returns {string} Privacy policy text
   */
  static getPrivacyPolicy() {
    return `
# Datenschutzerklärung / Privacy Policy

## Erfasste Daten / Collected Data
- Benutzerkonto: E-Mail, Name
- Trainingsdaten: Athleten, Sessions, Schüsse
- Verbindungsdaten: IP-Adressen, Zeitstempel

## Datensicherheit / Data Security
- Passwörter werden gehashed (bcryptjs)
- Übertragung über HTTPS/TLS verschlüsselt
- Tägliche automatische Backups
- Datenbankintegrität wird überwacht

## Ihre Rechte / Your Rights
- Recht auf Auskunft (Data Export)
- Recht auf Löschung (Right to be Forgotten)
- Recht auf Datenportabilität (Data Portability)
- Recht auf Berichtigung (Data Correction)

## Kontakt / Contact
Für Datenschutzanfragen kontaktieren Sie den Systemadministrator.
    `;
  }
}

module.exports = DataPrivacy;
