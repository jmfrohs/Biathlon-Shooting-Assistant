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

// ── Global mocks required by session-detail.js ──────────────────────────────
global.t = jest.fn((key) => key);
global.apiService = {
  updateSession: jest.fn(),
};

// Mock DOM elements
document.body.innerHTML = '<div id="athletesList"></div>';

// Suppress immediate DOMContentLoaded execution
const originalAddEventListener = document.addEventListener;
document.addEventListener = jest.fn();

// Load the file under test
const {
  calculateISTPoints,
  renderISTBlock,
  updateISTTime,
} = require('../src/js/pages/session-detail.js');

describe('Session Detail Module - International Shooting Test Calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calculateISTPoints should compute correct points matching Excel', () => {
    const athleteId = 123;
    const session = {
      id: 1,
      type: 'international_test',
      istTimes: {
        [athleteId]: {
          llssTime: 85, // LLSS time in seconds
          singleProneTime: 150, // 5x1 L time in seconds
          singleStandingTime: 58, // 5x1 S time in seconds
        },
      },
      series: [
        // Part 1: Precision L & S (10 shots each)
        {
          athleteId: athleteId,
          istPart: 1,
          stance: 'Liegend',
          shots: Array(10).fill({ ring: 9 }), // 90 rings
        },
        {
          athleteId: athleteId,
          istPart: 1,
          stance: 'Stehend',
          shots: Array(10).fill({ ring: 7 }), // 70 rings
        },
        // Part 2: LLSS (4 series of 5 shots)
        {
          athleteId: athleteId,
          istPart: 2,
          stance: 'Liegend',
          shots: [
            { hit: true },
            { hit: true },
            { hit: true },
            { hit: true },
            { hit: false }, // 4 hits
          ],
        },
        {
          athleteId: athleteId,
          istPart: 2,
          stance: 'Liegend',
          shots: [
            { hit: true },
            { hit: true },
            { hit: true },
            { hit: true },
            { hit: true }, // 5 hits
          ],
        },
        {
          athleteId: athleteId,
          istPart: 2,
          stance: 'Stehend',
          shots: [
            { hit: true },
            { hit: true },
            { hit: true },
            { hit: false },
            { hit: false }, // 3 hits
          ],
        },
        {
          athleteId: athleteId,
          istPart: 2,
          stance: 'Stehend',
          shots: [
            { hit: true },
            { hit: true },
            { hit: true },
            { hit: true },
            { hit: false }, // 4 hits
          ],
        }, // Total hits Part 2 = 4 + 5 + 3 + 4 = 16 hits
        // Part 3: 5x1 Treffer L & S (10 series of 1 shot each)
        // 5 Liegend series
        {
          athleteId: athleteId,
          istPart: 3,
          stance: 'Liegend',
          shots: [{ hit: true }, { hit: true }],
        }, // 2 shots to hit
        { athleteId: athleteId, istPart: 3, stance: 'Liegend', shots: [{ hit: true }] }, // 1 shot to hit
        {
          athleteId: athleteId,
          istPart: 3,
          stance: 'Liegend',
          shots: [{ hit: false }, { hit: true }],
        }, // 2 shots to hit
        { athleteId: athleteId, istPart: 3, stance: 'Liegend', shots: [{ hit: true }] }, // 1 shot to hit
        {
          athleteId: athleteId,
          istPart: 3,
          stance: 'Liegend',
          shots: [{ hit: false }, { hit: true }],
        }, // 2 shots to hit
        // Total shots L = 2 + 1 + 2 + 1 + 2 = 8 shots (Matches Excel: Hunger Lennart)

        // 5 Stehend series
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] }, // 1 shot
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] }, // 1 shot
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] }, // 1 shot
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] }, // 1 shot
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] }, // 1 shot
        // Total shots S = 1 * 5 = 5 shots (Matches Excel: Hunger Lennart)
      ],
    };

    // Call global function
    const points = calculateISTPoints(athleteId, session);

    // Assert Part 1
    expect(points.proneRings).toBe(90);
    expect(points.standingRings).toBe(70);
    expect(points.part1Total).toBe(160);

    // Assert Part 2
    // Hits = 16, time = 85
    // Points = (80 - 85) + 16 * 10 = -5 + 160 = 155
    expect(points.part2Hits).toBe(16);
    expect(points.part2Total).toBe(155);

    // Assert Part 3
    // Prone: time = 150 -> 160 - 150 = 10 points
    // Standing: time = 58 -> 150 - 58 = 92 points
    // Total shots L = 8, Total shots S = 5
    expect(points.pronePart3Shots).toBe(8);
    expect(points.standingPart3Shots).toBe(5);
    expect(points.pointsC).toBe(10);
    expect(points.pointsD).toBe(92);
    expect(points.part3Total).toBe(102);

    // Grand Total
    // 160 + 155 + 102 = 417
    expect(points.grandTotal).toBe(417);
  });
});
