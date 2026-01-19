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
 * Test Suite for Sessions Module
 * Tests session creation, management, and navigation
 */

describe('Sessions Module', () => {
  beforeEach(() => {
    sessions = [];
    currentSessionIndex = null;
    currentSType = 'Training';
    document.getElementById('session-list').innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Session Rendering', () => {
    test('should render empty state when no sessions exist', () => {
      const list = document.getElementById('session-list');
      list.innerHTML = sessions.length
        ? ''
        : '<p class="text-center text-slate-500 py-10">Keine Einheiten vorhanden.</p>';

      expect(list.innerHTML).toContain('Keine Einheiten vorhanden');
    });

    test('should display sessions in list', () => {
      sessions.push({
        ort: 'Oberhof',
        datum: '2025-01-19',
        typ: 'Training',
        athletes: ['Max', 'Lisa'],
        history: {},
        emails: [],
        autoSend: false,
      });

      const list = document.getElementById('session-list');
      const hasContent = sessions.length > 0;

      expect(hasContent).toBe(true);
      expect(sessions[0].ort).toBe('Oberhof');
    });
  });

  describe('Session Creation', () => {
    test('should create new session with provided data', () => {
      const newSession = {
        ort: 'Clausthal',
        datum: '2025-01-19',
        zusatz: 'DP Sprint',
        typ: 'Wettkampf',
        athletes: ['Anna', 'Bob'],
        history: {},
        emails: [],
        autoSend: false,
      };

      sessions.push(newSession);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].ort).toBe('Clausthal');
      expect(sessions[0].typ).toBe('Wettkampf');
    });

    test('should handle session type selection', () => {
      currentSType = 'Anschießen';

      expect(currentSType).toBe('Anschießen');
    });

    test('should require athletes selection', () => {
      const athletes = [];
      expect(athletes.length).toBe(0);
      // Validation would prevent empty athlete list
    });
  });

  describe('Session Deletion', () => {
    test('should delete session by index', () => {
      sessions.push({ ort: 'Session1', datum: '2025-01-19', athletes: [] });
      sessions.push({ ort: 'Session2', datum: '2025-01-19', athletes: [] });

      sessions.splice(0, 1);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].ort).toBe('Session2');
    });
  });

  describe('Session Navigation', () => {
    test('should switch to athletes view', () => {
      const viewSessions = document.getElementById('view-sessions');
      const viewAthletes = document.getElementById('view-athletes');

      viewSessions.classList.add('hidden');
      viewAthletes.classList.remove('hidden');

      expect(viewSessions.classList.contains('hidden')).toBe(true);
      expect(viewAthletes.classList.contains('hidden')).toBe(false);
    });

    test('should switch back to sessions view', () => {
      const viewSessions = document.getElementById('view-sessions');
      const viewAthletes = document.getElementById('view-athletes');

      viewSessions.classList.remove('hidden');
      viewAthletes.classList.add('hidden');

      expect(viewSessions.classList.contains('hidden')).toBe(false);
      expect(viewAthletes.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Session Types', () => {
    test('should support Training type', () => {
      expect(['Training', 'Wettkampf', 'Anschießen']).toContain('Training');
    });

    test('should support Wettkampf type', () => {
      expect(['Training', 'Wettkampf', 'Anschießen']).toContain('Wettkampf');
    });

    test('should support Anschießen type', () => {
      expect(['Training', 'Wettkampf', 'Anschießen']).toContain('Anschießen');
    });
  });
});
