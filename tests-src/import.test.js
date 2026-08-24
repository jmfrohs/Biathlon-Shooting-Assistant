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

/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');

global.t = jest.fn((key) => key);

global.apiService = {
  isServerMode: jest.fn(() => false),
  getAthletes: jest.fn(async () => []),
  createAthlete: jest.fn(async (data) => ({ id: 999, ...data })),
  createSession: jest.fn(async (data) => ({ id: 888, ...data })),
};

document.body.innerHTML = `
  <div id="drop-zone"></div>
  <input id="file-input" type="file" />
  <div id="import-results"></div>
  <div id="import-empty"></div>
  <div id="entries-list"></div>
  <button id="btn-confirm-import"></button>
  <div id="import-footer"></div>
  <span id="match-count"></span>
  <div id="status-toast"></div>
  <div id="status-text"></div>
`;

const { ImportPage } = require('../src/js/pages/import.js');
global.ImportPage = ImportPage;

describe('Import Page - Athlete Name Formatting and Matching', () => {
  let page;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    page = window.importPage || new ImportPage();
    page.athletes = [
      {
        id: 1,
        name: 'Max Mustermann',
        firstName: 'Max',
        lastName: 'Mustermann',
      },
      {
        id: 2,
        name: 'Anna-Lena Schmidt',
        firstName: 'Anna-Lena',
        lastName: 'Schmidt',
      },
    ];
  });

  describe('normalizeNameCasing', () => {
    test('should capitalize first letters and lowercase others', () => {
      expect(page.normalizeNameCasing('MAX')).toBe('Max');
      expect(page.normalizeNameCasing('max')).toBe('Max');
      expect(page.normalizeNameCasing('mAx')).toBe('Max');
    });

    test('should handle hyphenated double names correctly', () => {
      expect(page.normalizeNameCasing('ANNA-LENA')).toBe('Anna-Lena');
      expect(page.normalizeNameCasing('anna-lena')).toBe('Anna-Lena');
    });

    test('should handle multiple words/spaces', () => {
      expect(page.normalizeNameCasing('max mustermann')).toBe('Max Mustermann');
      expect(page.normalizeNameCasing('MAX MUSTERMANN')).toBe('Max Mustermann');
    });
  });

  describe('matchExistingAthlete', () => {
    test('should match athlete by name words in different orders', () => {
      expect(page.matchExistingAthlete(['Max', 'Mustermann'])).toEqual(page.athletes[0]);
      expect(page.matchExistingAthlete(['Mustermann', 'Max'])).toEqual(page.athletes[0]);
    });

    test('should match case-insensitively', () => {
      expect(page.matchExistingAthlete(['mustermann', 'max'])).toEqual(page.athletes[0]);
      expect(page.matchExistingAthlete(['MUSTERMANN', 'MAX'])).toEqual(page.athletes[0]);
    });

    test('should return null if no athlete matches', () => {
      expect(page.matchExistingAthlete(['John', 'Doe'])).toBeNull();
    });
  });

  describe('parseAndFormatFullName', () => {
    test('should resolve comma-separated Lastname, Firstname', () => {
      expect(page.parseAndFormatFullName('Mustermann, Max')).toBe('Max Mustermann');
      expect(page.parseAndFormatFullName('MUSTERMANN, MAX')).toBe('Max Mustermann');
    });

    test('should resolve ALL CAPS lastnames', () => {
      expect(page.parseAndFormatFullName('MUSTERMANN Max')).toBe('Max Mustermann');
      expect(page.parseAndFormatFullName('Max MUSTERMANN')).toBe('Max Mustermann');
    });

    test('should match existing athletes and return their canonical database name', () => {
      expect(page.parseAndFormatFullName('Mustermann Max')).toBe('Max Mustermann');
      expect(page.parseAndFormatFullName('Max Mustermann')).toBe('Max Mustermann');
    });

    test('should default to reversing Lastname Firstname if new athlete', () => {

      expect(page.parseAndFormatFullName('Doe John')).toBe('John Doe');
    });

    test('should normalize casing for new athletes', () => {
      expect(page.parseAndFormatFullName('DOE JOHN')).toBe('John Doe');
      expect(page.parseAndFormatFullName('smith anna-lena')).toBe('Anna-Lena Smith');
    });
  });

  describe('findExistingAthlete', () => {
    test('should match by exact name or substring', () => {
      expect(page.findExistingAthlete('Max Mustermann')).toEqual(page.athletes[0]);
      expect(page.findExistingAthlete('Mustermann Max')).toEqual(page.athletes[0]);
      expect(page.findExistingAthlete('Max Mustermann Junior')).toEqual(page.athletes[0]);
    });

    test('should match even if athlete only has name property (no firstName/lastName in DB)', () => {
      page.athletes.push({ id: 3, name: 'John Doe' });
      expect(page.findExistingAthlete('Doe John')).toEqual({ id: 3, name: 'John Doe' });
      expect(page.findExistingAthlete('John Doe')).toEqual({ id: 3, name: 'John Doe' });
    });
  });

  describe('confirmImport with API Service', () => {
    test('should use apiService to create new athletes and sessions when in server mode', async () => {
      apiService.isServerMode.mockReturnValue(true);
      apiService.createAthlete.mockResolvedValue({ id: 123, name: 'New Athlete' });
      apiService.createSession.mockResolvedValue({ id: 456 });

      page.extractedData = [
        {
          athleteName: 'New Athlete',
          hits: 15,
          total: 20,
          isNew: true,
          seriesMisses: [1, 2, 1, 1],
          seriesTimes: ['0:15', '0:18', '0:14', '0:16'],
        },
      ];

      page.extractedSession = {
        name: 'Test Session',
        date: '2026-06-19',
        location: 'Test Location',
        type: 'training',
      };

      global.window.location.href = '';

      await page.confirmImport();

      expect(apiService.createAthlete).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Athlete',
        })
      );
      expect(apiService.createSession).toHaveBeenCalled();
    });
  });
});
