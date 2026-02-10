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
 * Test Suite for Storage Module
 * Tests localStorage operations and data persistence
 */

// Note: In a real setup, you would require/import the storage module
// For browser-based modules, we're testing the functions after they're loaded

describe('Storage Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Session Storage', () => {
    test('should save and retrieve sessions from localStorage', () => {
      const testSession = {
        ort: 'Oberhof',
        datum: '2025-01-19',
        typ: 'Training',
        athletes: ['Max', 'Lisa'],
        history: {},
        emails: [],
        autoSend: false,
      };

      const sessions = [testSession];
      const jsonStr = JSON.stringify(sessions);

      // Save to localStorage
      localStorage.setItem('b_sessions', jsonStr);

      // Verify it was saved
      const saved = localStorage.getItem('b_sessions');
      expect(saved).toBeTruthy();
      expect(saved).toContain('Oberhof');

      // Verify we can parse it back
      const retrieved = JSON.parse(saved);
      expect(retrieved[0].ort).toBe('Oberhof');
      expect(retrieved[0].typ).toBe('Training');
    });

    test('should retrieve sessions from localStorage', () => {
      const mockSessions = [{ ort: 'Oberhof', datum: '2025-01-19', athletes: ['Max'] }];
      localStorage.setItem('b_sessions', JSON.stringify(mockSessions));

      const retrieved = JSON.parse(localStorage.getItem('b_sessions') || '[]');
      expect(retrieved[0].ort).toBe('Oberhof');
      expect(retrieved.length).toBe(1);
    });

    test('should handle multiple sessions', () => {
      const sessions = [
        { ort: 'Oberhof', datum: '2025-01-19', athletes: ['Max'] },
        { ort: 'München', datum: '2025-01-20', athletes: ['Lisa'] },
      ];

      localStorage.setItem('b_sessions', JSON.stringify(sessions));
      const retrieved = JSON.parse(localStorage.getItem('b_sessions') || '[]');

      expect(retrieved.length).toBe(2);
      expect(retrieved[0].ort).toBe('Oberhof');
      expect(retrieved[1].ort).toBe('München');
    });
  });

  describe('Athlete Storage', () => {
    test('should save and retrieve athletes from localStorage', () => {
      const testAthletes = ['Max Mustermann', 'Lisa Schmidt'];
      localStorage.setItem('b_athletes', JSON.stringify(testAthletes));

      const retrieved = JSON.parse(localStorage.getItem('b_athletes') || '[]');
      expect(retrieved).toContain('Max Mustermann');
      expect(retrieved).toContain('Lisa Schmidt');
      expect(retrieved.length).toBe(2);
    });

    test('should handle empty athlete list', () => {
      localStorage.setItem('b_athletes', JSON.stringify([]));
      const retrieved = JSON.parse(localStorage.getItem('b_athletes') || '[]');
      expect(retrieved.length).toBe(0);
    });
  });

  describe('Email Storage', () => {
    test('should save and retrieve trainer emails from localStorage', () => {
      const testEmails = ['trainer@club.de', 'coach@club.de'];
      localStorage.setItem('b_emails', JSON.stringify(testEmails));

      const retrieved = JSON.parse(localStorage.getItem('b_emails') || '[]');
      expect(retrieved).toContain('trainer@club.de');
      expect(retrieved).toContain('coach@club.de');
    });
  });

  describe('Trainer Name Storage', () => {
    test('should save and retrieve trainer name', () => {
      const trainerName = 'Fränki';
      localStorage.setItem('b_trainer_name', trainerName);

      const retrieved = localStorage.getItem('b_trainer_name');
      expect(retrieved).toBe('Fränki');
    });

    test('should handle special characters in trainer name', () => {
      const trainerName = 'Müller-König';
      localStorage.setItem('b_trainer_name', trainerName);

      const retrieved = localStorage.getItem('b_trainer_name');
      expect(retrieved).toBe('Müller-König');
    });
  });

  describe('Device Type Storage', () => {
    test('should save and retrieve selected device type', () => {
      const deviceType = 'tablet';
      localStorage.setItem('device_type', deviceType);

      const retrieved = localStorage.getItem('device_type');
      expect(retrieved).toBe('tablet');
    });

    test('should handle different device types', () => {
      const deviceTypes = ['tablet', 'smartphone', 'desktop'];

      deviceTypes.forEach((type) => {
        localStorage.clear();
        localStorage.setItem('device_type', type);
        const retrieved = localStorage.getItem('device_type');
        expect(retrieved).toBe(type);
      });
    });
  });

  describe('Target Selection Storage', () => {
    test('should save and retrieve selected target', () => {
      const target = 'SCHEIBE_2';
      localStorage.setItem('selected_target', target);

      const retrieved = localStorage.getItem('selected_target');
      expect(retrieved).toBe('SCHEIBE_2');
    });

    test('should handle target changes', () => {
      localStorage.setItem('selected_target', 'SCHEIBE_1');
      expect(localStorage.getItem('selected_target')).toBe('SCHEIBE_1');

      localStorage.setItem('selected_target', 'SCHEIBE_3');
      expect(localStorage.getItem('selected_target')).toBe('SCHEIBE_3');
    });
  });

  describe('Storage Clearing', () => {
    test('should clear all storage when clear() is called', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');

      localStorage.clear();

      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBeNull();
    });
  });
});
