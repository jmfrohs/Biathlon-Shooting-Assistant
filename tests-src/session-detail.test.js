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

global.t = jest.fn((key) => key);
global.apiService = {
  updateSession: jest.fn(),
};

document.body.innerHTML = '<div id="athletesList"></div>';

const originalAddEventListener = document.addEventListener;
document.addEventListener = jest.fn();

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
          llssTime: 85,
          singleProneTime: 150,
          singleStandingTime: 58,
        },
      },
      series: [

        {
          athleteId: athleteId,
          istPart: 1,
          stance: 'Liegend',
          shots: Array(10).fill({ ring: 9 }),
        },
        {
          athleteId: athleteId,
          istPart: 1,
          stance: 'Stehend',
          shots: Array(10).fill({ ring: 7 }),
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
            { hit: false },
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
            { hit: true },
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
            { hit: false },
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
            { hit: false },
          ],
        },

        {
          athleteId: athleteId,
          istPart: 3,
          stance: 'Liegend',
          shots: [{ hit: true }, { hit: true }],
        },
        { athleteId: athleteId, istPart: 3, stance: 'Liegend', shots: [{ hit: true }] },
        {
          athleteId: athleteId,
          istPart: 3,
          stance: 'Liegend',
          shots: [{ hit: false }, { hit: true }],
        },
        { athleteId: athleteId, istPart: 3, stance: 'Liegend', shots: [{ hit: true }] },
        {
          athleteId: athleteId,
          istPart: 3,
          stance: 'Liegend',
          shots: [{ hit: false }, { hit: true }],
        },

        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] },
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] },
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] },
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] },
        { athleteId: athleteId, istPart: 3, stance: 'Stehend', shots: [{ hit: true }] },

      ],
    };

    const points = calculateISTPoints(athleteId, session);

    expect(points.proneRings).toBe(90);
    expect(points.standingRings).toBe(70);
    expect(points.part1Total).toBe(160);

    expect(points.part2Hits).toBe(16);
    expect(points.part2Total).toBe(155);

    expect(points.pronePart3Shots).toBe(8);
    expect(points.standingPart3Shots).toBe(5);
    expect(points.pointsC).toBe(10);
    expect(points.pointsD).toBe(92);
    expect(points.part3Total).toBe(102);

    expect(points.grandTotal).toBe(417);
  });
});
