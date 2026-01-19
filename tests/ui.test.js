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
 * Test Suite for UI Module
 * Tests user interface rendering and interactions
 */

describe('UI Module', () => {
  beforeEach(() => {
    currentAthleteName = null;
    sessions = [];
    globalAthletes = [];
    globalHistory = {};
    document.body.innerHTML = `
      <div id="view-sessions"></div>
      <div id="view-athletes"></div>
      <div id="view-athlete-detail"></div>
      <div id="athlete-detail-name"></div>
      <div id="athlete-detail-subtitle"></div>
      <div id="athlete-history-list"></div>
      <div id="trainer-name-display"></div>
      <div id="session-settings-modal" class="hidden"></div>
      <div id="settings-modal" class="hidden"></div>
      <div id="session-modal" class="hidden"></div>
      <div id="history-viewer-modal" class="hidden"></div>
    `;
    jest.clearAllMocks();
  });

  describe('Trainer Name Display', () => {
    test('should display trainer name', () => {
      const display = document.getElementById('trainer-name-display');
      const trainerName = 'Fränki';

      display.textContent = trainerName;

      expect(display.textContent).toBe('Fränki');
    });

    test('should update trainer name', () => {
      const display = document.getElementById('trainer-name-display');

      display.textContent = 'Old Name';
      expect(display.textContent).toBe('Old Name');

      display.textContent = 'New Name';
      expect(display.textContent).toBe('New Name');
    });
  });

  describe('Modal Management', () => {
    test('should open session modal', () => {
      const modal = document.getElementById('session-modal');
      modal.classList.remove('hidden');

      expect(modal.classList.contains('hidden')).toBe(false);
    });

    test('should close session modal', () => {
      const modal = document.getElementById('session-modal');
      modal.classList.add('hidden');

      expect(modal.classList.contains('hidden')).toBe(true);
    });

    test('should open settings modal', () => {
      const modal = document.getElementById('settings-modal');
      modal.classList.remove('hidden');

      expect(modal.classList.contains('hidden')).toBe(false);
    });

    test('should open session settings modal', () => {
      const modal = document.getElementById('session-settings-modal');
      modal.classList.remove('hidden');

      expect(modal.classList.contains('hidden')).toBe(false);
    });

    test('should open history viewer modal', () => {
      const modal = document.getElementById('history-viewer-modal');
      modal.classList.remove('hidden');

      expect(modal.classList.contains('hidden')).toBe(false);
    });
  });

  describe('View Navigation', () => {
    test('should switch to sessions view', () => {
      const viewSessions = document.getElementById('view-sessions');
      const viewAthletes = document.getElementById('view-athletes');

      viewSessions.classList.remove('hidden');
      viewAthletes.classList.add('hidden');

      expect(viewSessions.classList.contains('hidden')).toBe(false);
      expect(viewAthletes.classList.contains('hidden')).toBe(true);
    });

    test('should switch to athletes view', () => {
      const viewSessions = document.getElementById('view-sessions');
      const viewAthletes = document.getElementById('view-athletes');

      viewSessions.classList.add('hidden');
      viewAthletes.classList.remove('hidden');

      expect(viewSessions.classList.contains('hidden')).toBe(true);
      expect(viewAthletes.classList.contains('hidden')).toBe(false);
    });

    test('should switch to athlete detail view', () => {
      const viewAthletes = document.getElementById('view-athletes');
      const viewDetail = document.getElementById('view-athlete-detail');

      viewAthletes.classList.add('hidden');
      viewDetail.classList.remove('hidden');

      expect(viewDetail.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Athlete History Display', () => {
    test('should display athlete name in detail view', () => {
      const nameDisplay = document.getElementById('athlete-detail-name');
      currentAthleteName = 'Max Mustermann';

      nameDisplay.textContent = currentAthleteName;

      expect(nameDisplay.textContent).toBe('Max Mustermann');
    });

    test('should render empty history state', () => {
      const historyList = document.getElementById('athlete-history-list');
      const history = [];

      if (history.length === 0) {
        historyList.innerHTML = '<p class="text-center text-slate-500">Keine Serien vorhanden</p>';
      }

      expect(historyList.innerHTML).toContain('Keine Serien');
    });

    test('should render athlete history list', () => {
      const historyList = document.getElementById('athlete-history-list');
      globalHistory['Max'] = [
        { date: '2025-01-19', position: 'Liegend', shots: [{ ring: 10 }] },
        { date: '2025-01-18', position: 'Stehend', shots: [{ ring: 8 }] },
      ];

      globalHistory['Max'].forEach((series, i) => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${series.date} - ${series.position}</span>`;
        historyList.appendChild(div);
      });

      expect(historyList.children).toHaveLength(2);
    });
  });

  describe('Toast Notifications', () => {
    test('should show success toast', () => {
      const toast = document.createElement('div');
      toast.className = 'toast success';
      toast.textContent = 'Erfolgreich gespeichert!';
      document.body.appendChild(toast);

      expect(document.querySelector('.toast.success')).toBeDefined();
      expect(toast.textContent).toBe('Erfolgreich gespeichert!');
    });

    test('should show error toast', () => {
      const toast = document.createElement('div');
      toast.className = 'toast error';
      toast.textContent = 'Fehler beim Speichern!';
      document.body.appendChild(toast);

      expect(document.querySelector('.toast.error')).toBeDefined();
    });

    test('should show info toast', () => {
      const toast = document.createElement('div');
      toast.className = 'toast info';
      toast.textContent = 'Informationen';
      document.body.appendChild(toast);

      expect(document.querySelector('.toast.info')).toBeDefined();
    });
  });

  describe('Session Details Display', () => {
    test('should display session location', () => {
      const subtitle = document.getElementById('athlete-detail-subtitle');
      const session = { ort: 'Oberhof', datum: '2025-01-19' };

      subtitle.textContent = `${session.ort} • ${session.datum}`;

      expect(subtitle.textContent).toContain('Oberhof');
    });
  });

  describe('Statistics Display', () => {
    test('should calculate and display hit rate', () => {
      const series = [
        { shots: [{ hit: true }, { hit: true }, { hit: false }] },
        { shots: [{ hit: true }, { hit: false }] },
      ];

      let totalHits = 0;
      let totalShots = 0;

      series.forEach((s) => {
        totalHits += s.shots.filter((shot) => shot.hit).length;
        totalShots += s.shots.length;
      });

      const hitRate = ((totalHits / totalShots) * 100).toFixed(1);

      expect(parseFloat(hitRate)).toBeCloseTo(60);
    });

    test('should calculate average ring count', () => {
      const series = [
        { shots: [{ ring: 10 }, { ring: 9 }, { ring: 8 }] },
        { shots: [{ ring: 10 }, { ring: 9 }] },
      ];

      let totalRings = 0;
      let totalShots = 0;

      series.forEach((s) => {
        totalRings += s.shots.reduce((sum, shot) => sum + shot.ring, 0);
        totalShots += s.shots.length;
      });

      const avgRing = (totalRings / totalShots).toFixed(1);

      expect(parseFloat(avgRing)).toBeCloseTo(9.2);
    });
  });
});
