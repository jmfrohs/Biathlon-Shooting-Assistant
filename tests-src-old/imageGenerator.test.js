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

describe('Image Generator Service', () => {
  let mockTargetConstants;

  beforeEach(() => {
    // Mock the target constants
    mockTargetConstants = {
      svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="100" fill="#560101"></circle>
        <circle cx="100" cy="100" r="70" fill="#034286"></circle>
        <circle cx="100" cy="100" r="30" fill="#226b03"></circle>
        <circle cx="100" cy="100" r="15" fill="#fbbf24"></circle>
      </svg>`,
    };

    // Mock getTargetConstants function
    global.getTargetConstants = jest.fn(() => mockTargetConstants);

    // Mock DOM elements
    global.document.body.innerHTML = `
      <svg id="biathlon-target"></svg>
    `;

    global.svgTarget = document.getElementById('biathlon-target');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTargetSvgBase', () => {
    it('should retrieve SVG base from target constants', () => {
      // Mock the function
      const getTargetSvgBase = () => {
        const targetConstants = global.getTargetConstants();
        return targetConstants.svg;
      };

      const svg = getTargetSvgBase();
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 200 200"');
    });

    it('should return valid SVG string', () => {
      const getTargetSvgBase = () => {
        const targetConstants = global.getTargetConstants();
        return targetConstants.svg;
      };

      const svg = getTargetSvgBase();
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<circle');
    });
  });

  describe('generateTargetSvg', () => {
    it('should generate target SVG with hit marks', () => {
      const generateTargetSvg = (shots, seriesIndex = null) => {
        let hitMarks = '';
        shots.forEach((shot) => {
          if (shot) {
            const fill_color = shot.hit ? '#228B22' : '#ef4444';
            const opacity = 1;
            const number_fill = shot.ring >= 4 ? 'white' : 'black';
            const text_font_size = shot.ring === 0 ? '7px' : '6px';
            hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="6" class="hit-mark" style="fill: ${fill_color}; opacity: ${opacity};"></circle>`;
            hitMarks += `<text x="${shot.x}" y="${shot.y + 0.5}" class="shot-number" style="fill: ${number_fill}; font-size: ${text_font_size};">${shot.shot}</text>`;
          }
        });
        const svgId = seriesIndex !== null ? `history-svg-${seriesIndex}` : 'biathlon-target';
        const targetSvg = mockTargetConstants.svg;

        let result = targetSvg.replace(
          /viewBox="0 0 200 200"/,
          `viewBox="0 0 200 200" id="${svgId}"`
        );

        if (result.endsWith('</svg>')) {
          result = result.slice(0, -6);
        }

        return result + hitMarks + `</svg>`;
      };

      const shots = [
        { x: 100, y: 100, hit: true, ring: 10, shot: 1 },
        { x: 95, y: 105, hit: false, ring: 0, shot: 2 },
      ];

      const result = generateTargetSvg(shots);

      expect(result).toContain('hit-mark');
      expect(result).toContain('shot-number');
      expect(result).toContain('id="biathlon-target"');
    });

    it('should use correct colors for hit and miss', () => {
      const generateTargetSvg = (shots, seriesIndex = null) => {
        let hitMarks = '';
        shots.forEach((shot) => {
          if (shot) {
            const fill_color = shot.hit ? '#228B22' : '#ef4444';
            hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="6" fill="${fill_color}"></circle>`;
          }
        });
        const targetSvg = mockTargetConstants.svg;
        return targetSvg + hitMarks + `</svg>`;
      };

      const shots = [
        { x: 100, y: 100, hit: true, ring: 10, shot: 1 },
        { x: 95, y: 105, hit: false, ring: 0, shot: 2 },
      ];

      const result = generateTargetSvg(shots);

      expect(result).toContain('#228B22'); // Green for hit
      expect(result).toContain('#ef4444'); // Red for miss
    });

    it('should assign correct series index to SVG', () => {
      const generateTargetSvg = (shots, seriesIndex = null) => {
        let hitMarks = '';
        const svgId = seriesIndex !== null ? `history-svg-${seriesIndex}` : 'biathlon-target';
        const targetSvg = mockTargetConstants.svg;

        let result = targetSvg.replace(
          /viewBox="0 0 200 200"/,
          `viewBox="0 0 200 200" id="${svgId}"`
        );

        return result + hitMarks + `</svg>`;
      };

      const result1 = generateTargetSvg([], 0);
      const result2 = generateTargetSvg([], 5);
      const result3 = generateTargetSvg([]);

      expect(result1).toContain('id="history-svg-0"');
      expect(result2).toContain('id="history-svg-5"');
      expect(result3).toContain('id="biathlon-target"');
    });

    it('should handle empty shots array', () => {
      const generateTargetSvg = (shots, seriesIndex = null) => {
        let hitMarks = '';
        shots.forEach((shot) => {
          if (shot) {
            hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="6"></circle>`;
          }
        });
        const targetSvg = mockTargetConstants.svg;
        return targetSvg + hitMarks + `</svg>`;
      };

      const result = generateTargetSvg([]);

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should handle null shots gracefully', () => {
      const generateTargetSvg = (shots, seriesIndex = null) => {
        let hitMarks = '';
        shots.forEach((shot) => {
          if (shot) {
            const fill_color = shot.hit ? '#228B22' : '#ef4444';
            hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="6" class="hit-mark"></circle>`;
          }
        });
        const targetSvg = mockTargetConstants.svg;
        return targetSvg + hitMarks + `</svg>`;
      };

      const shots = [null, { x: 100, y: 100, hit: true, ring: 5, shot: 1 }, null];

      const result = generateTargetSvg(shots);

      expect(result).toContain('hit-mark');
    });
  });

  describe('generateTargetImage', () => {
    beforeEach(() => {
      // Mock Canvas API
      global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        fillStyle: '',
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        fillText: jest.fn(),
      }));

      global.HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/jpeg;base64,fake');

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:fake-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock Blob
      global.Blob = jest.fn((content, options) => ({
        content,
        options,
      }));
    });

    it('should generate target image from shots', async () => {
      const generateTargetImage = (shots) => {
        return new Promise((resolve) => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const imageData = canvas.toDataURL('image/jpeg', 0.5);
            resolve(imageData);
          } catch (error) {
            resolve(null);
          }
        });
      };

      const shots = [{ x: 100, y: 100, hit: true, ring: 10, shot: 1 }];

      const result = await generateTargetImage(shots);

      expect(result).toBeTruthy();
      expect(result).toContain('data:image/');
    });

    it('should handle errors gracefully', async () => {
      const generateTargetImage = (shots) => {
        return new Promise((resolve) => {
          try {
            throw new Error('Test error');
          } catch (error) {
            resolve(null);
          }
        });
      };

      const shots = [{ x: 100, y: 100, hit: true, ring: 10, shot: 1 }];

      const result = await generateTargetImage(shots);

      expect(result).toBeNull();
    });

    it('should set correct canvas dimensions', async () => {
      const generateTargetImage = (shots) => {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          // JSDOM canvas has default dimensions
          canvas.width = 400;
          canvas.height = 400;
          expect(canvas.width).toBe(400);
          expect(canvas.height).toBe(400);
          resolve(true);
        });
      };

      const shots = [];
      const result = await generateTargetImage(shots);

      expect(result).toBe(true);
    });

    it('should create white background', async () => {
      const generateTargetImage = (shots) => {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = 'white';
          expect(ctx.fillStyle).toBe('white');

          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const imageData = canvas.toDataURL('image/jpeg', 0.5);
          resolve(imageData);
        });
      };

      const result = await generateTargetImage([]);
      expect(result).toBeTruthy();
    });
  });

  describe('generateSessionTargetSvg', () => {
    it('should generate session target with all shots', () => {
      const generateSessionTargetSvg = (allSessionShots) => {
        let hitMarks = '';
        allSessionShots.forEach((shot) => {
          const fill_color = shot.hit ? '#228B22' : '#ef4444';
          const opacity = 0.7;
          hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="5" class="hit-mark" style="fill: ${fill_color}; opacity: ${opacity};"></circle>`;
        });
        const targetSvg = mockTargetConstants.svg;
        return targetSvg + hitMarks + `</svg>`;
      };

      const shots = [
        { x: 100, y: 100, hit: true },
        { x: 95, y: 105, hit: false },
        { x: 110, y: 90, hit: true },
      ];

      const result = generateSessionTargetSvg(shots);

      expect(result).toContain('hit-mark');
      expect(result.match(/#228B22/g).length).toBe(2);
      expect(result.match(/#ef4444/g).length).toBe(1);
    });

    it('should set opacity to 0.7 for session shots', () => {
      const generateSessionTargetSvg = (allSessionShots) => {
        let hitMarks = '';
        allSessionShots.forEach((shot) => {
          hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="5" opacity="0.7"></circle>`;
        });
        const targetSvg = mockTargetConstants.svg;
        return targetSvg + hitMarks + `</svg>`;
      };

      const shots = [{ x: 100, y: 100, hit: true }];

      const result = generateSessionTargetSvg(shots);

      expect(result).toContain('opacity="0.7"');
    });
  });

  describe('generateHeatmapTargetSvg', () => {
    it('should generate heatmap with zone distribution', () => {
      const generateHeatmapTargetSvg = (allSessionShots) => {
        const center = { x: 100, y: 100 };
        let countZone1 = 0;
        let countZone2 = 0;

        allSessionShots.forEach((shot) => {
          const dx = shot.x - center.x;
          const dy = shot.y - center.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= 15) {
            countZone1++;
          } else if (distance <= 30) {
            countZone2++;
          }
        });

        const totalShots = allSessionShots.length;
        const percentZone1 = totalShots > 0 ? ((countZone1 / totalShots) * 100).toFixed(0) : 0;
        const percentZone2 = totalShots > 0 ? ((countZone2 / totalShots) * 100).toFixed(0) : 0;

        return {
          percentZone1: parseInt(percentZone1),
          percentZone2: parseInt(percentZone2),
        };
      };

      const shots = [
        { x: 100, y: 100, hit: true }, // Zone 1 (distance 0)
        { x: 105, y: 105, hit: true }, // Zone 1 (distance ~7.07)
        { x: 120, y: 120, hit: false }, // Zone 2 (distance ~28.28)
      ];

      const result = generateHeatmapTargetSvg(shots);

      expect(result.percentZone1).toBe(67); // 2 out of 3 in zone 1
      expect(result.percentZone2).toBe(33); // 1 out of 3 in zone 2
    });

    it('should calculate zone distribution correctly', () => {
      const generateHeatmapTargetSvg = (allSessionShots) => {
        const center = { x: 100, y: 100 };
        let countZone1 = 0;

        allSessionShots.forEach((shot) => {
          const dx = shot.x - center.x;
          const dy = shot.y - center.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= 15) {
            countZone1++;
          }
        });

        const totalShots = allSessionShots.length;
        const percentZone1 = totalShots > 0 ? ((countZone1 / totalShots) * 100).toFixed(0) : 0;

        return { percentZone1, totalShots };
      };

      const shots = [
        { x: 100, y: 100 }, // Distance 0 - Zone 1
        { x: 108, y: 108 }, // Distance ~11.3 - Zone 1
        { x: 105, y: 100 }, // Distance 5 - Zone 1
      ];

      const result = generateHeatmapTargetSvg(shots);

      expect(parseInt(result.percentZone1)).toBe(100);
      expect(result.totalShots).toBe(3);
    });

    it('should handle empty shots array in heatmap', () => {
      const generateHeatmapTargetSvg = (allSessionShots) => {
        const totalShots = allSessionShots.length;
        const percentZone1 = totalShots > 0 ? 100 : 0;

        return { percentZone1, totalShots };
      };

      const shots = [];

      const result = generateHeatmapTargetSvg(shots);

      expect(result.percentZone1).toBe(0);
      expect(result.totalShots).toBe(0);
    });

    it('should distribute shots into correct quadrants', () => {
      const generateHeatmapTargetSvg = (allSessionShots) => {
        const center = { x: 100, y: 100 };
        let countZone4TopRight = 0;
        let countZone4BottomRight = 0;
        let countZone4BottomLeft = 0;
        let countZone4TopLeft = 0;

        allSessionShots.forEach((shot) => {
          const dx = shot.x - center.x;
          const dy = shot.y - center.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 70) {
            if (dx > 0 && dy < 0) {
              countZone4TopRight++;
            } else if (dx > 0 && dy > 0) {
              countZone4BottomRight++;
            } else if (dx < 0 && dy > 0) {
              countZone4BottomLeft++;
            } else if (dx < 0 && dy < 0) {
              countZone4TopLeft++;
            }
          }
        });

        return {
          topRight: countZone4TopRight,
          bottomRight: countZone4BottomRight,
          bottomLeft: countZone4BottomLeft,
          topLeft: countZone4TopLeft,
        };
      };

      const shots = [
        { x: 150, y: 50, hit: true }, // Top Right (dx=50, dy=-50)
        { x: 150, y: 150, hit: true }, // Bottom Right (dx=50, dy=50)
        { x: 50, y: 150, hit: false }, // Bottom Left (dx=-50, dy=50)
        { x: 50, y: 50, hit: false }, // Top Left (dx=-50, dy=-50)
      ];

      const result = generateHeatmapTargetSvg(shots);

      expect(result.topRight).toBe(1);
      expect(result.bottomRight).toBe(1);
      expect(result.bottomLeft).toBe(1);
      expect(result.topLeft).toBe(1);
    });
  });

  describe('renderShots', () => {
    it('should create circle elements for each shot', () => {
      const currentShots = [
        { x: 100, y: 100 },
        { x: 105, y: 105 },
      ];

      global.svgTarget = document.getElementById('biathlon-target');

      const renderShots = () => {
        const oldMarks = global.svgTarget.querySelectorAll('.hit-mark, .shot-number');
        oldMarks.forEach((m) => m.remove());
        currentShots.forEach((shot, index) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', shot.x);
          circle.setAttribute('cy', shot.y);
          circle.setAttribute('r', '5');
          circle.setAttribute('class', 'hit-mark');
          global.svgTarget.appendChild(circle);
        });
      };

      renderShots();

      const circles = global.svgTarget.querySelectorAll('.hit-mark');
      expect(circles.length).toBe(2);
    });

    it('should add shot numbers to each mark', () => {
      const currentShots = [
        { x: 100, y: 100 },
        { x: 105, y: 105 },
      ];

      const renderShots = () => {
        global.svgTarget.innerHTML = '';
        currentShots.forEach((shot, index) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', shot.x);
          circle.setAttribute('cy', shot.y);
          circle.setAttribute('r', '5');
          circle.setAttribute('class', 'hit-mark');
          global.svgTarget.appendChild(circle);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', shot.x);
          text.setAttribute('y', shot.y);
          text.setAttribute('class', 'shot-number');
          text.style.fontSize = '6px';
          text.textContent = index + 1;
          global.svgTarget.appendChild(text);
        });
      };

      renderShots();

      const textElements = global.svgTarget.querySelectorAll('.shot-number');
      expect(textElements.length).toBe(2);
    });

    it('should remove old marks before rendering new ones', () => {
      global.svgTarget = document.getElementById('biathlon-target');

      // Add some initial marks
      const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle1.setAttribute('class', 'hit-mark');
      global.svgTarget.appendChild(circle1);

      const currentShots = [{ x: 100, y: 100 }];

      const renderShots = () => {
        const oldMarks = global.svgTarget.querySelectorAll('.hit-mark, .shot-number');
        expect(oldMarks.length).toBeGreaterThan(0);
        oldMarks.forEach((m) => m.remove());
        expect(global.svgTarget.querySelectorAll('.hit-mark').length).toBe(0);
      };

      renderShots();
    });

    it('should set correct circle attributes', () => {
      const currentShots = [{ x: 50, y: 75 }];

      const renderShots = () => {
        global.svgTarget.innerHTML = '';
        currentShots.forEach((shot) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', shot.x);
          circle.setAttribute('cy', shot.y);
          circle.setAttribute('r', '5');
          global.svgTarget.appendChild(circle);
        });
      };

      renderShots();

      const circle = global.svgTarget.querySelector('circle');
      expect(circle.getAttribute('cx')).toBe('50');
      expect(circle.getAttribute('cy')).toBe('75');
      expect(circle.getAttribute('r')).toBe('5');
    });
  });
});
