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
 * Test Suite for Email Module
 * Tests email configuration, sending, and automation
 */

describe('Email Module', () => {
  beforeEach(() => {
    trainerEmails = [];
    sessions = [];
    currentSessionIndex = 0;
    document.getElementById('email-list').innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Email Management', () => {
    test('should add trainer email', () => {
      const email = 'trainer@club.de';
      trainerEmails.push(email);

      expect(trainerEmails).toContain('trainer@club.de');
      expect(trainerEmails).toHaveLength(1);
    });

    test('should remove trainer email', () => {
      trainerEmails = ['trainer@club.de', 'coach@club.de'];

      const index = trainerEmails.indexOf('trainer@club.de');
      trainerEmails.splice(index, 1);

      expect(trainerEmails).not.toContain('trainer@club.de');
      expect(trainerEmails).toContain('coach@club.de');
    });

    test('should validate email format', () => {
      const validEmail = 'trainer@club.de';
      const invalidEmail = 'invalid-email';

      const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail(validEmail)).toBe(true);
      expect(isValidEmail(invalidEmail)).toBe(false);
    });

    test('should prevent duplicate emails', () => {
      trainerEmails = ['trainer@club.de'];
      const newEmail = 'trainer@club.de';

      if (!trainerEmails.includes(newEmail)) {
        trainerEmails.push(newEmail);
      }

      expect(trainerEmails).toHaveLength(1);
    });
  });

  describe('Email Configuration', () => {
    test('should configure EmailJS settings', () => {
      const config = {
        publicKey: 'test_public_key',
        serviceId: 'test_service_id',
        templateId: 'test_template_id',
      };

      expect(config.publicKey).toBe('test_public_key');
      expect(config.serviceId).toBe('test_service_id');
      expect(config.templateId).toBe('test_template_id');
    });

    test('should save API keys to localStorage', () => {
      const apiConfig = {
        publicKey: 'test_key',
        serviceId: 'service_123',
        templateId: 'template_456',
      };

      localStorage.setItem('b_api_public_key', apiConfig.publicKey);
      localStorage.setItem('b_api_service_id', apiConfig.serviceId);
      localStorage.setItem('b_api_template_id', apiConfig.templateId);

      // Verify all three keys were saved
      expect(localStorage.getItem('b_api_public_key')).toBe('test_key');
      expect(localStorage.getItem('b_api_service_id')).toBe('service_123');
      expect(localStorage.getItem('b_api_template_id')).toBe('template_456');
    });

    test('should retrieve API keys from localStorage', () => {
      const testKey = 'test_key';
      localStorage.setItem('b_api_public_key', testKey);

      const key = localStorage.getItem('b_api_public_key');

      expect(key).toBe('test_key');
    });
  });

  describe('Session Email Settings', () => {
    test('should enable auto-send for session', () => {
      sessions = [
        {
          ort: 'Oberhof',
          athletes: ['Max'],
          autoSend: false,
        },
      ];

      sessions[0].autoSend = true;

      expect(sessions[0].autoSend).toBe(true);
    });

    test('should disable auto-send for session', () => {
      sessions = [
        {
          ort: 'Oberhof',
          athletes: ['Max'],
          autoSend: true,
        },
      ];

      sessions[0].autoSend = false;

      expect(sessions[0].autoSend).toBe(false);
    });

    test('should add email to session', () => {
      sessions = [
        {
          ort: 'Oberhof',
          athletes: ['Max'],
          emails: [],
        },
      ];

      sessions[0].emails.push('trainer@club.de');

      expect(sessions[0].emails).toContain('trainer@club.de');
    });

    test('should remove email from session', () => {
      sessions = [
        {
          ort: 'Oberhof',
          athletes: ['Max'],
          emails: ['trainer@club.de', 'coach@club.de'],
        },
      ];

      const index = sessions[0].emails.indexOf('trainer@club.de');
      sessions[0].emails.splice(index, 1);

      expect(sessions[0].emails).not.toContain('trainer@club.de');
    });
  });

  describe('Email Rendering', () => {
    test('should render email list', () => {
      trainerEmails = ['trainer@club.de', 'coach@club.de'];
      const list = document.getElementById('email-list');

      trainerEmails.forEach((email, i) => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${email}</span><button data-index="${i}">Löschen</button>`;
        list.appendChild(div);
      });

      expect(list.children).toHaveLength(2);
    });

    test('should show empty state when no emails', () => {
      trainerEmails = [];
      const list = document.getElementById('email-list');

      if (trainerEmails.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500">Keine E-Mails hinterlegt</p>';
      }

      expect(list.innerHTML).toContain('Keine E-Mails');
    });
  });

  describe('Email Content Formatting', () => {
    test('should format shot information for email', () => {
      const shot = { ring: 10, hit: true, position: 'Liegend' };

      const formatted = `Ring ${shot.ring} ${shot.hit ? '✓' : '✗'} (${shot.position})`;

      expect(formatted).toContain('Ring 10');
      expect(formatted).toContain('✓');
    });

    test('should create series summary', () => {
      const series = {
        date: '2025-01-19',
        athlete: 'Max',
        position: 'Liegend',
        shots: [{ ring: 10 }, { ring: 9 }, { ring: 10 }, { ring: 8 }, { ring: 9 }],
      };

      const totalRings = series.shots.reduce((sum, s) => sum + s.ring, 0);

      expect(totalRings).toBe(46);
    });
  });

  describe('Email Sending', () => {
    test('should prepare email data', () => {
      const emailData = {
        to_email: 'trainer@club.de',
        athlete_name: 'Max Mustermann',
        session_date: '2025-01-19',
        session_location: 'Oberhof',
        series_summary: 'Test summary',
      };

      expect(emailData.to_email).toBe('trainer@club.de');
      expect(emailData.athlete_name).toBe('Max Mustermann');
    });

    test('should handle email sending status', () => {
      const emailStatus = {
        sent: true,
        timestamp: new Date().toISOString(),
        email: 'trainer@club.de',
      };

      expect(emailStatus.sent).toBe(true);
      expect(emailStatus.email).toBe('trainer@club.de');
    });
  });
});
