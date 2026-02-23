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

// Load the script
const shootingUtilsCode = fs.readFileSync(
  path.resolve(__dirname, '../src/js/utils/shooting-utils.js'),
  'utf8'
);
eval(shootingUtilsCode);

describe('Shooting Utils Module', () => {
  describe('getBiasedAngle', () => {
    test('should return 0 for right direction', () => {
      // Since it's randomized, we check if it's within range
      // targetAngle 0, angleRange PI/4 -> range [-PI/8, PI/8]
      const angle = getBiasedAngle('rechts');
      expect(angle).toBeGreaterThanOrEqual(-Math.PI / 8);
      expect(angle).toBeLessThanOrEqual(Math.PI / 8);
    });

    test('should return PI for left direction', () => {
      // targetAngle PI, angleRange PI/4 -> range [7PI/8, 9PI/8]
      const angle = getBiasedAngle('links');
      expect(angle).toBeGreaterThanOrEqual((7 * Math.PI) / 8);
      expect(angle).toBeLessThanOrEqual((9 * Math.PI) / 8);
    });

    test('should return -PI/2 for top (hoch) direction', () => {
      const angle = getBiasedAngle('hoch');
      expect(angle).toBeGreaterThanOrEqual(-Math.PI / 2 - Math.PI / 8);
      expect(angle).toBeLessThanOrEqual(-Math.PI / 2 + Math.PI / 8);
    });

    test('should return default center range for unknown direction', () => {
      const angle = getBiasedAngle('unknown');
      expect(angle).toBeGreaterThanOrEqual(-Math.PI);
      expect(angle).toBeLessThanOrEqual(Math.PI);
    });
  });

  describe('getRandomRadiusForRing', () => {
    test('should return radius between 0 and 10 for ring 10', () => {
      for (let i = 0; i < 20; i++) {
        const r = getRandomRadiusForRing(10);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(10);
      }
    });

    test('should return radius between 10 and 20 for ring 9', () => {
      const r = getRandomRadiusForRing(9);
      expect(r).toBeGreaterThanOrEqual(10);
      expect(r).toBeLessThanOrEqual(20);
    });

    test('should return miss radius for ring 0', () => {
      const r = getRandomRadiusForRing(0);
      expect(r).toBeGreaterThanOrEqual(105);
      expect(r).toBeLessThanOrEqual(170);
    });
  });
});
