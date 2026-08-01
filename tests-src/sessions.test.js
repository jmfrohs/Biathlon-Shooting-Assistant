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

const fs = require('fs');
const path = require('path');

global.t = jest.fn((key) => {
  if (key === 'international_test') return 'Internationaler Schießtest';
  if (key === 'training') return 'Training';
  return key;
});

global.apiService = {
  getSessions: jest.fn(),
};

// Suppress DOMContentLoaded event handler
document.addEventListener = jest.fn();

const { getSessionTypeLabel } = require('../src/js/pages/sessions.js');

describe('Sessions Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getSessionTypeLabel should translate international_test correctly', () => {
    expect(getSessionTypeLabel('international_test')).toBe('Internationaler Schießtest');
  });

  test('getSessionTypeLabel should translate training correctly', () => {
    expect(getSessionTypeLabel('training')).toBe('Training');
  });
});
