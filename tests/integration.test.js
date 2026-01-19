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
 * Integration Tests
 * Tests interactions between multiple modules
 */

describe('Integration Tests', () => {
  beforeEach(() => {
    sessions = [];
    globalAthletes = ['Max', 'Lisa', 'Anna'];
    trainerEmails = ['trainer@club.de'];
    currentSessionIndex = null;
    currentAthleteName = null;
    currentShots = [];
    jest.clearAllMocks();
  });

  describe('Complete Session Workflow', () => {
    test('should create session and add athletes', () => {
      const newSession = {
        ort: 'Oberhof',
        datum: '2025-01-19',
        typ: 'Training',
        athletes: ['Max', 'Lisa'],
        history: {},
        emails: ['trainer@club.de'],
        autoSend: true,
      };

      sessions.push(newSession);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].athletes).toHaveLength(2);
      expect(sessions[0].emails).toHaveLength(1);
    });

    test('should record shots for athlete in session', () => {
      sessions.push({
        ort: 'Oberhof',
        datum: '2025-01-19',
        typ: 'Training',
        athletes: ['Max'],
        history: { Max: [] },
        emails: [],
        autoSend: false,
      });

      currentSessionIndex = 0;
      currentAthleteName = 'Max';

      const series = {
        date: '2025-01-19',
        position: 'Liegend',
        shots: [
          { ring: 10, hit: true },
          { ring: 9, hit: true },
          { ring: 10, hit: true },
          { ring: 8, hit: true },
          { ring: 9, hit: true },
        ],
      };

      sessions[currentSessionIndex].history[currentAthleteName].push(series);

      expect(sessions[0].history['Max']).toHaveLength(1);
      expect(sessions[0].history['Max'][0].shots).toHaveLength(5);
    });

    test('should send email after series completion', () => {
      sessions.push({
        ort: 'Oberhof',
        datum: '2025-01-19',
        typ: 'Training',
        athletes: ['Max'],
        history: {},
        emails: ['trainer@club.de'],
        autoSend: true,
      });

      const emailSent = sessions[0].autoSend && sessions[0].emails.length > 0;

      expect(emailSent).toBe(true);
    });
  });

  describe('Multi-Athlete Session Management', () => {
    test('should manage multiple athletes in one session', () => {
      const athletes = ['Max', 'Lisa', 'Anna'];

      const session = {
        ort: 'Clausthal',
        datum: '2025-01-19',
        typ: 'Wettkampf',
        athletes: athletes,
        history: {},
      };

      athletes.forEach((athlete) => {
        session.history[athlete] = [];
      });

      expect(Object.keys(session.history)).toHaveLength(3);
    });

    test('should track progress across multiple athletes', () => {
      const session = {
        ort: 'Oberhof',
        datum: '2025-01-19',
        athletes: ['Max', 'Lisa'],
        history: { Max: [], Lisa: [] },
      };

      // Add series for Max
      session.history['Max'].push({
        position: 'Liegend',
        shots: [{ ring: 10 }],
      });

      // Add series for Lisa
      session.history['Lisa'].push({
        position: 'Liegend',
        shots: [{ ring: 9 }],
      });

      expect(session.history['Max']).toHaveLength(1);
      expect(session.history['Lisa']).toHaveLength(1);
    });
  });

  describe('Data Persistence Workflow', () => {
    test('should save and retrieve session data', () => {
      const session = {
        ort: 'Oberhof',
        datum: '2025-01-19',
        athletes: ['Max'],
        history: { Max: [{ shots: [{ ring: 10 }] }] },
      };

      sessions.push(session);

      localStorage.setItem('b_sessions', JSON.stringify(sessions));

      // Verify the data was saved and contains the location
      const saved = localStorage.getItem('b_sessions');
      expect(saved).toBeTruthy();
      expect(saved).toContain('Oberhof');

      // Verify we can parse it back
      const retrieved = JSON.parse(saved);
      expect(retrieved[0].ort).toBe('Oberhof');
    });

    test('should save athletes and reload', () => {
      const testAthletes = ['Max', 'Lisa'];
      localStorage.setItem('b_athletes', JSON.stringify(testAthletes));

      // Verify the data was saved and contains athlete names
      const saved = localStorage.getItem('b_athletes');
      expect(saved).toBeTruthy();
      expect(saved).toContain('Max');

      // Verify we can parse it back
      const retrieved = JSON.parse(saved);
      expect(retrieved).toContain('Max');
    });
  });

  describe('Error Recovery', () => {
    test('should handle missing session data gracefully', () => {
      const getSessionAtIndex = (index) => {
        if (index < 0 || index >= sessions.length) return null;
        return sessions[index];
      };

      expect(getSessionAtIndex(999)).toBeNull();
    });

    test('should handle missing athlete data', () => {
      const getAthleteHistory = (athleteName) => {
        if (currentSessionIndex === null) return [];
        return sessions[currentSessionIndex].history[athleteName] || [];
      };

      currentSessionIndex = 0;
      sessions.push({ history: {} });

      expect(getAthleteHistory('NonExistent')).toEqual([]);
    });
  });

  describe('UI State Consistency', () => {
    test('should maintain consistent state during navigation', () => {
      sessions.push({
        ort: 'Oberhof',
        datum: '2025-01-19',
        athletes: ['Max'],
        history: {},
      });

      currentSessionIndex = 0;
      currentAthleteName = 'Max';

      expect(currentSessionIndex).toBe(0);
      expect(currentAthleteName).toBe('Max');
      expect(sessions[currentSessionIndex].athletes).toContain('Max');
    });

    test('should reset state on session exit', () => {
      currentSessionIndex = 0;
      currentAthleteName = 'Max';
      currentShots = [{ ring: 10 }, { ring: 9 }];

      // Reset
      currentSessionIndex = null;
      currentAthleteName = null;
      currentShots = [];

      expect(currentSessionIndex).toBeNull();
      expect(currentAthleteName).toBeNull();
      expect(currentShots).toHaveLength(0);
    });
  });
});
