/** @jest-environment jsdom */
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
 * Test Suite for Utils Module (New src version)
 * Tests utility functions and helper methods
 */

// Mock t function for translation tests
global.t = jest.fn((key) => `translated_${key}`);

// Require utils.js directly
const utils = require('../src/js/utils/utils.js');
global.getLanguage = utils.getLanguage;
global.setLanguage = utils.setLanguage;
global.translateApp = utils.translateApp;
global.levenshteinDistance = utils.levenshteinDistance;
global.getBestSuggestions = utils.getBestSuggestions;

describe('Utils Module (src)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  test('getLanguage should return default "de" if no language is set', () => {
    expect(getLanguage()).toBe('de');
  });

  test('getLanguage should return stored language', () => {
    localStorage.setItem('b_language', 'en');
    expect(getLanguage()).toBe('en');
  });

  test('setLanguage should store language in localStorage', () => {
    setLanguage('fr');
    expect(localStorage.getItem('b_language')).toBe('fr');
  });

  test('translateApp should update textContent of elements with data-i18n', () => {
    document.body.innerHTML = `
      <div data-i18n="settings"></div>
      <input data-i18n="search_placeholder" placeholder="old">
      <nav id="nav-athletes"><span></span><span></span></nav>
    `;

    translateApp();

    expect(document.querySelector('[data-i18n="settings"]').textContent).toBe(
      'translated_settings'
    );
    expect(document.querySelector('[data-i18n="search_placeholder"]').placeholder).toBe(
      'translated_search_placeholder'
    );
    expect(document.querySelector('#nav-athletes span:last-child').textContent).toBe(
      'translated_athletes'
    );
  });

  describe('levenshteinDistance', () => {
    test('should calculate distance correctly', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('gumbo', 'gambol')).toBe(2);
      expect(levenshteinDistance('same', 'same')).toBe(0);
      expect(levenshteinDistance('case', 'CASE')).toBe(0); // Case-insensitive
    });
  });

  describe('getBestSuggestions', () => {
    test('should return correct suggestions based on similarity', () => {
      const candidates = ['Anna Bolina', 'Michael Jordan', 'Training Session', 'Competition Run'];
      expect(getBestSuggestions('Anna', candidates)).toEqual(['Anna Bolina']);
      expect(getBestSuggestions('Ana', candidates)).toEqual(['Anna Bolina']);
      expect(getBestSuggestions('Jordan', candidates)).toEqual(['Michael Jordan']);
      expect(getBestSuggestions('Trainig', candidates)).toEqual(['Training Session']);
      expect(getBestSuggestions('Compitition', candidates)).toEqual(['Competition Run']);
      expect(getBestSuggestions('nonexistent', candidates)).toEqual([]);
    });

    test('should return empty array for very short queries', () => {
      expect(getBestSuggestions('a', ['Anna'])).toEqual([]);
    });
  });
});
