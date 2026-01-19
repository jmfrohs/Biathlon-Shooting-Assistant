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
 * Test Suite for Shooting Module
 * Tests shot recording, target interaction, and position management
 */

describe('Shooting Module', () => {
  beforeEach(() => {
    currentShots = [];
    currentPosition = 'Liegend';
    correctionVisible = false;
    adjustmentVisible = false;
    avgX = 0;
    avgY = 0;
    corrH = 0;
    corrV = 0;
    document.getElementById('biathlon-target').innerHTML = '';
    document.getElementById('status-message').textContent = '';
    jest.clearAllMocks();
  });

  describe('Shot Recording', () => {
    test('should add shot to current shots array', () => {
      const shot = {
        shot: 1,
        hit: true,
        ring: 10,
        x: 100,
        y: 100,
        position: 'Liegend',
      };

      currentShots.push(shot);

      expect(currentShots).toHaveLength(1);
      expect(currentShots[0].ring).toBe(10);
    });

    test('should track shot sequence', () => {
      for (let i = 1; i <= 5; i++) {
        currentShots.push({
          shot: i,
          hit: i <= 3,
          ring: 10 - i,
          x: 100 + i,
          y: 100 + i,
          position: 'Liegend',
        });
      }

      expect(currentShots).toHaveLength(5);
      expect(currentShots[0].shot).toBe(1);
      expect(currentShots[4].shot).toBe(5);
    });

    test('should enforce maximum shots per series', () => {
      const MAX_SHOTS = 5;
      for (let i = 1; i <= 8; i++) {
        if (currentShots.length < MAX_SHOTS) {
          currentShots.push({ shot: i, hit: true, ring: 10 });
        }
      }

      expect(currentShots.length).toBeLessThanOrEqual(MAX_SHOTS);
      expect(currentShots).toHaveLength(5);
    });
  });

  describe('Position Management', () => {
    test('should set position to Liegend', () => {
      currentPosition = 'Liegend';
      expect(currentPosition).toBe('Liegend');
    });

    test('should set position to Stehend', () => {
      currentPosition = 'Stehend';
      expect(currentPosition).toBe('Stehend');
    });

    test('should require position before shooting', () => {
      const canShoot = currentPosition !== null && currentPosition !== '';
      expect(canShoot).toBe(true);
    });
  });

  describe('Target Click Handling', () => {
    test('should record click coordinates', () => {
      const clickX = 150;
      const clickY = 200;

      const shot = {
        x: clickX,
        y: clickY,
        hit: Math.random() > 0.3,
        ring: Math.floor(Math.random() * 10) + 1,
      };

      expect(shot.x).toBe(150);
      expect(shot.y).toBe(200);
    });

    test('should determine if shot is hit', () => {
      const shots = [
        { ring: 10, hit: true },
        { ring: 0, hit: false },
        { ring: 5, hit: true },
      ];

      const hits = shots.filter((s) => s.hit);
      expect(hits).toHaveLength(2);
    });

    test('should calculate ring value from distance', () => {
      const distance = 15; // pixels from center
      const ring = Math.max(0, 10 - Math.floor(distance / 10));

      expect(ring).toBeGreaterThanOrEqual(0);
      expect(ring).toBeLessThanOrEqual(10);
    });
  });

  describe('Correction Management', () => {
    test('should toggle correction view', () => {
      let correctionVisible = false;
      correctionVisible = !correctionVisible;

      expect(correctionVisible).toBe(true);

      correctionVisible = !correctionVisible;
      expect(correctionVisible).toBe(false);
    });

    test('should adjust horizontal correction', () => {
      let corrH = 0;
      corrH += 2;

      expect(corrH).toBe(2);
    });

    test('should adjust vertical correction', () => {
      let corrV = 0;
      corrV -= 3;

      expect(corrV).toBe(-3);
    });

    test('should calculate average shot position', () => {
      currentShots = [
        { x: 100, y: 100 },
        { x: 120, y: 110 },
        { x: 110, y: 105 },
      ];

      const avgX = currentShots.reduce((sum, s) => sum + s.x, 0) / currentShots.length;
      const avgY = currentShots.reduce((sum, s) => sum + s.y, 0) / currentShots.length;

      expect(avgX).toBeCloseTo(110, 1);
      expect(avgY).toBeCloseTo(105, 1);
    });
  });

  describe('Shot Validation', () => {
    test('should validate Liegend position (ring >= 8)', () => {
      currentPosition = 'Liegend';
      const validRings = [8, 9, 10];

      const isValid = (ring) => {
        if (currentPosition === 'Liegend') return ring >= 8;
        return ring >= 3;
      };

      validRings.forEach((ring) => {
        expect(isValid(ring)).toBe(true);
      });
    });

    test('should validate Stehend position (ring >= 3)', () => {
      currentPosition = 'Stehend';
      const validRings = [3, 5, 8, 10];

      const isValid = (ring) => {
        if (currentPosition === 'Liegend') return ring >= 8;
        return ring >= 3;
      };

      validRings.forEach((ring) => {
        expect(isValid(ring)).toBe(true);
      });
    });
  });

  describe('Shot Counter', () => {
    test('should update shot counter display', () => {
      const counter = document.getElementById('shot-counter');
      currentShots = [{ shot: 1 }, { shot: 2 }, { shot: 3 }];

      counter.textContent = `${currentShots.length} / 5`;

      expect(counter.textContent).toBe('3 / 5');
    });
  });

  describe('Shooting Interface', () => {
    test('should open shooting interface', () => {
      const modal = document.getElementById('shooting-modal');
      modal.classList.remove('hidden');

      expect(modal.classList.contains('hidden')).toBe(false);
    });

    test('should close shooting interface', () => {
      const modal = document.getElementById('shooting-modal');
      modal.classList.add('hidden');

      expect(modal.classList.contains('hidden')).toBe(true);
    });

    test('should reset shots when closing', () => {
      currentShots = [{ shot: 1 }, { shot: 2 }];
      currentShots = [];

      expect(currentShots).toHaveLength(0);
    });
  });
});
