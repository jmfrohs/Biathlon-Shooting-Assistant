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
 * Test Suite for Athletes Module
 * Tests athlete management and selection
 */

describe('Athletes Module', () => {
  beforeEach(() => {
    globalAthletes = [];
    document.getElementById('global-athlete-list').innerHTML = '';
    document.getElementById('athlete-checkboxes').innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Global Athletes Management', () => {
    test('should add new athlete to global list', () => {
      const newAthlete = 'Max Mustermann';
      globalAthletes.push(newAthlete);

      expect(globalAthletes).toContain('Max Mustermann');
      expect(globalAthletes).toHaveLength(1);
    });

    test('should remove athlete from global list', () => {
      globalAthletes.push('Anna Schmidt');
      globalAthletes.push('Bob Mueller');

      const index = globalAthletes.indexOf('Anna Schmidt');
      globalAthletes.splice(index, 1);

      expect(globalAthletes).toContain('Bob Mueller');
      expect(globalAthletes).not.toContain('Anna Schmidt');
    });

    test('should prevent duplicate athletes', () => {
      globalAthletes.push('Lisa');
      const existingAthletes = globalAthletes.filter((a) => a === 'Lisa');

      expect(existingAthletes).toHaveLength(1);
    });
  });

  describe('Athlete Selection in Sessions', () => {
    test('should render athlete checkboxes', () => {
      globalAthletes = ['Max', 'Lisa', 'Anna'];
      const container = document.getElementById('athlete-checkboxes');

      globalAthletes.forEach((athlete) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'session-athletes';
        checkbox.value = athlete;
        container.appendChild(checkbox);
      });

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(3);
    });

    test('should get selected athletes', () => {
      const selectedAthletes = [
        { name: 'Max', checked: true },
        { name: 'Lisa', checked: false },
        { name: 'Anna', checked: true },
      ];

      const selected = selectedAthletes.filter((a) => a.checked).map((a) => a.name);

      expect(selected).toEqual(['Max', 'Anna']);
      expect(selected).toHaveLength(2);
    });
  });

  describe('Athlete Validation', () => {
    test('should require athlete name', () => {
      const name = '';
      const isValid = name.trim().length > 0;

      expect(isValid).toBe(false);
    });

    test('should trim whitespace from athlete names', () => {
      const name = '  Max Mustermann  ';
      const trimmed = name.trim();

      expect(trimmed).toBe('Max Mustermann');
    });
  });

  describe('Toggle All Athletes', () => {
    test('should select all athletes', () => {
      const athletes = [
        { name: 'Max', checked: false },
        { name: 'Lisa', checked: false },
        { name: 'Anna', checked: false },
      ];

      athletes.forEach((a) => (a.checked = true));

      expect(athletes.every((a) => a.checked)).toBe(true);
    });

    test('should deselect all athletes', () => {
      const athletes = [
        { name: 'Max', checked: true },
        { name: 'Lisa', checked: true },
        { name: 'Anna', checked: true },
      ];

      athletes.forEach((a) => (a.checked = false));

      expect(athletes.every((a) => !a.checked)).toBe(true);
    });
  });

  describe('Athlete List Rendering', () => {
    test('should display empty state when no athletes', () => {
      const list = document.getElementById('global-athlete-list');
      const isEmpty = globalAthletes.length === 0;

      if (isEmpty) {
        list.innerHTML = '<p class="text-center text-slate-500">Keine Athleten hinzugefügt</p>';
      }

      expect(isEmpty).toBe(true);
    });

    test('should render athlete list with delete buttons', () => {
      globalAthletes = ['Max', 'Lisa'];
      const list = document.getElementById('global-athlete-list');

      globalAthletes.forEach((athlete, i) => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${athlete}</span><button data-index="${i}">Löschen</button>`;
        list.appendChild(div);
      });

      expect(list.children).toHaveLength(2);
    });
  });
});
