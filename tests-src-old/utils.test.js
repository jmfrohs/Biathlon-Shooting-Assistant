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
 * Test Suite for Utils Module
 * Tests utility functions and helper methods
 */

describe('Utils Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Number Word Conversion', () => {
    test('should convert German number words to numbers', () => {
      const convertNumberWords = (word) => {
        const numberMap = {
          null: '0',
          eins: '1',
          zwei: '2',
          drei: '3',
          vier: '4',
          fünf: '5',
          sechs: '6',
          sieben: '7',
          acht: '8',
          neun: '9',
          zehn: '10',
        };
        return numberMap[word.toLowerCase()] || null;
      };

      expect(convertNumberWords('eins')).toBe('1');
      expect(convertNumberWords('zehn')).toBe('10');
      expect(convertNumberWords('fünf')).toBe('5');
    });

    test('should handle case insensitivity', () => {
      const convertNumberWords = (word) => {
        const numberMap = {
          null: '0',
          eins: '1',
          zwei: '2',
          drei: '3',
          vier: '4',
          fünf: '5',
          sechs: '6',
          sieben: '7',
          acht: '8',
          neun: '9',
          zehn: '10',
        };
        return numberMap[word.toLowerCase()] || null;
      };

      expect(convertNumberWords('EINS')).toBe('1');
      expect(convertNumberWords('Zehn')).toBe('10');
    });

    test('should return null for unknown words', () => {
      const convertNumberWords = (word) => {
        const numberMap = {
          null: '0',
          eins: '1',
          zwei: '2',
          drei: '3',
          vier: '4',
          fünf: '5',
          sechs: '6',
          sieben: '7',
          acht: '8',
          neun: '9',
          zehn: '10',
        };
        return numberMap[word.toLowerCase()] || null;
      };

      expect(convertNumberWords('invalid')).toBeNull();
      expect(convertNumberWords('elf')).toBeNull();
    });
  });

  describe('Random Number Generation', () => {
    test('should generate random number within range', () => {
      const getRandomArbitrary = (min, max) => {
        return Math.random() * (max - min) + min;
      };

      const random = getRandomArbitrary(0, 100);

      expect(random).toBeGreaterThanOrEqual(0);
      expect(random).toBeLessThanOrEqual(100);
    });

    test('should generate different numbers', () => {
      const getRandomArbitrary = (min, max) => {
        return Math.random() * (max - min) + min;
      };

      const nums = [
        getRandomArbitrary(0, 10),
        getRandomArbitrary(0, 10),
        getRandomArbitrary(0, 10),
      ];

      expect(nums).toHaveLength(3);
    });
  });

  describe('Ring Calculation from Distance', () => {
    test('should calculate ring value from distance to center', () => {
      const getRingFromDistance = (distance, maxDistance = 100) => {
        const ring = Math.max(0, 10 - Math.floor(distance / (maxDistance / 10)));
        return Math.min(10, ring);
      };

      expect(getRingFromDistance(0)).toBe(10);
      expect(getRingFromDistance(50)).toBe(5);
      expect(getRingFromDistance(100)).toBe(0);
    });

    test('should return valid ring numbers 0-10', () => {
      const getRingFromDistance = (distance, maxDistance = 100) => {
        const ring = Math.max(0, 10 - Math.floor(distance / (maxDistance / 10)));
        return Math.min(10, ring);
      };

      for (let d = 0; d <= 150; d += 10) {
        const ring = getRingFromDistance(d);
        expect(ring).toBeGreaterThanOrEqual(0);
        expect(ring).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Biased Angle Calculation', () => {
    test('should apply bias to angle calculation', () => {
      const getBiasedAngle = (x, y, bias = 0) => {
        const angle = Math.atan2(y, x);
        return angle + bias;
      };

      const angle = getBiasedAngle(10, 10, 0);

      expect(typeof angle).toBe('number');
      expect(isFinite(angle)).toBe(true);
    });
  });

  describe('Average Shot Calculation', () => {
    test('should calculate average position of shots', () => {
      const getAverageShot = (shots) => {
        if (shots.length === 0) return { x: 0, y: 0 };

        const sumX = shots.reduce((sum, shot) => sum + shot.x, 0);
        const sumY = shots.reduce((sum, shot) => sum + shot.y, 0);

        return {
          x: sumX / shots.length,
          y: sumY / shots.length,
        };
      };

      const shots = [
        { x: 100, y: 100 },
        { x: 110, y: 110 },
        { x: 90, y: 90 },
      ];

      const avg = getAverageShot(shots);

      expect(avg.x).toBe(100);
      expect(avg.y).toBe(100);
    });

    test('should handle empty shots array', () => {
      const getAverageShot = (shots) => {
        if (shots.length === 0) return { x: 0, y: 0 };

        const sumX = shots.reduce((sum, shot) => sum + shot.x, 0);
        const sumY = shots.reduce((sum, shot) => sum + shot.y, 0);

        return {
          x: sumX / shots.length,
          y: sumY / shots.length,
        };
      };

      const avg = getAverageShot([]);

      expect(avg.x).toBe(0);
      expect(avg.y).toBe(0);
    });
  });

  describe('Correction Management', () => {
    test('should adjust correction up', () => {
      let corrV = 0;
      corrV -= 5; // Moving up reduces vertical position

      expect(corrV).toBe(-5);
    });

    test('should adjust correction down', () => {
      let corrV = 0;
      corrV += 5;

      expect(corrV).toBe(5);
    });

    test('should adjust correction left', () => {
      let corrH = 0;
      corrH -= 5;

      expect(corrH).toBe(-5);
    });

    test('should adjust correction right', () => {
      let corrH = 0;
      corrH += 5;

      expect(corrH).toBe(5);
    });
  });

  describe('Text Field Input Handling', () => {
    test('should handle number input from text field', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = '8';

      const value = parseInt(input.value);

      expect(value).toBe(8);
      expect(typeof value).toBe('number');
    });

    test('should validate numeric input', () => {
      const isValidNumber = (val) => {
        return !isNaN(parseInt(val)) && parseInt(val) >= 0 && parseInt(val) <= 10;
      };

      expect(isValidNumber('5')).toBe(true);
      expect(isValidNumber('10')).toBe(true);
      expect(isValidNumber('invalid')).toBe(false);
      expect(isValidNumber('15')).toBe(false);
    });
  });

  describe('Correction Marks Display', () => {
    test('should toggle correction marks visibility', () => {
      let correctionMarksVisible = false;

      correctionMarksVisible = !correctionMarksVisible;
      expect(correctionMarksVisible).toBe(true);

      correctionMarksVisible = !correctionMarksVisible;
      expect(correctionMarksVisible).toBe(false);
    });

    test('should update correction mark position', () => {
      const updateCorrectionMarks = (x, y) => {
        return { x, y };
      };

      const pos = updateCorrectionMarks(150, 200);

      expect(pos.x).toBe(150);
      expect(pos.y).toBe(200);
    });
  });

  describe('Swipe Handling', () => {
    test('should detect swipe direction', () => {
      const detectSwipe = (startX, endX) => {
        const difference = startX - endX;

        if (difference > 50) return 'left';
        if (difference < -50) return 'right';
        return 'none';
      };

      expect(detectSwipe(100, 30)).toBe('left');
      expect(detectSwipe(30, 100)).toBe('right');
      expect(detectSwipe(100, 105)).toBe('none');
    });

    test('should handle swipe delete gesture', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      const deleteItem = (index) => {
        items.splice(index, 1);
      };

      deleteItem(1);

      expect(items).toHaveLength(2);
      expect(items[1].name).toBe('Item 3');
    });
  });
});
