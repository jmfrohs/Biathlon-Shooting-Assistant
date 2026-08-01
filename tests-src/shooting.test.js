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
 * Test Suite for Shooting Module
 * Tests shooting functionality and calculations
 */

const fs = require('fs');
const path = require('path');

// ── Global mocks required by shooting.js ────────────────────────────────────

global.t = jest.fn((key) => key);
global.getTargetConstants = jest.fn(() => ({
  svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>',
}));
global.getHitColor = jest.fn(() => '#00ff00');
global.getMissColor = jest.fn(() => '#ff0000');
global.getHitLabelColor = jest.fn(() => '#ffffff');
global.getMissLabelColor = jest.fn(() => '#ffffff');
global.getGhostShotColor = jest.fn(() => '#aaaaaa');
global.getGhostLabelColor = jest.fn(() => '#aaaaaa');
global.getClickValue = jest.fn(() => 6.0);
global.getShotSize = jest.fn(() => 6);
global.getShotLabelContent = jest.fn(() => 'number');
global.getRandomRadiusForRing = jest.fn((ring) => (11 - ring) * 10 - 5);
global.getBiasedAngle = jest.fn(() => 0);
global.bootstrap = { Modal: jest.fn(() => ({ show: jest.fn(), hide: jest.fn() })) };

// ── Mock URLSearchParams so constructor reads session=1 ──────────────────────

global.URLSearchParams = class MockURLSearchParams {
  constructor() {}
  get(key) {
    if (key === 'session') return '1';
    return null;
  }
};

// ── Provide a minimal valid session so loadData() doesn't redirect ───────────

const MOCK_SESSION = {
  id: 1,
  name: 'Test Session',
  athletes: [],
  series: [],
  settings: {},
};
localStorage.setItem('sessions', JSON.stringify([MOCK_SESSION]));
localStorage.setItem('b_athletes', JSON.stringify([]));

// ── Suppress DOMContentLoaded auto-instantiation ─────────────────────────────

const _origDocAddEventListener = document.addEventListener.bind(document);
document.addEventListener = jest.fn((event, handler) => {
  if (event !== 'DOMContentLoaded') {
    _origDocAddEventListener(event, handler);
  }
});

// ── Mock DOM elements needed by renderTarget / setStance ────────────────────

const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svgEl.innerHTML = '';
// jsdom SVG stubs
svgEl.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) });
svgEl.getScreenCTM = () => ({ inverse: () => ({}) });

const origGetById = document.getElementById.bind(document);
document.getElementById = jest.fn((id) => {
  if (id === 'biathlon-target') return svgEl;
  return origGetById(id) || document.createElement('div');
});

// ── Load shooting.js using require ──────────────────────────────────────────
global.ShootingPage = require('../src/js/pages/shooting.js');

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Shooting Module', () => {
  let page;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('sessions', JSON.stringify([MOCK_SESSION]));
    localStorage.setItem('b_athletes', JSON.stringify([]));
    page = new ShootingPage();
  });

  test('getRingFromDistance should return correct rings', () => {
    expect(page.getRingFromDistance(5)).toBe(10);
    expect(page.getRingFromDistance(15)).toBe(9);
    expect(page.getRingFromDistance(95)).toBe(1);
    expect(page.getRingFromDistance(150)).toBe(0);
  });

  test('getDirectionFromCoords should return correct directions', () => {
    expect(page.getDirectionFromCoords(100, 100)).toBe('center');
    expect(page.getDirectionFromCoords(100, 50)).toBe('top');
    expect(page.getDirectionFromCoords(100, 150)).toBe('bottom');
    expect(page.getDirectionFromCoords(50, 100)).toBe('left');
    expect(page.getDirectionFromCoords(150, 100)).toBe('right');
    expect(page.getDirectionFromCoords(150, 50)).toBe('right_top');
  });

  test('getCoordsFromRingDirection should return valid coordinates', () => {
    const coords = page.getCoordsFromRingDirection(10, 'zentrum');
    expect(typeof coords.x).toBe('number');
    expect(typeof coords.y).toBe('number');

    const topCoords = page.getCoordsFromRingDirection(5, 'oben');
    expect(topCoords.x).toBeDefined();
    expect(topCoords.y).toBeDefined();
  });

  test('addHit should update shots array', () => {
    page.addHit(10, 'zentrum', 100, 100);
    expect(page.shots.length).toBe(1);
    expect(page.shots[0].ring).toBe(10);
    expect(page.shots[0].hit).toBe(true);
  });

  test('isValidShot should return correct hit validity depending on stance', () => {
    // Default stance is Liegend (Prone)
    page.stance = 'Liegend';
    expect(page.isValidShot(10)).toBe(true);
    expect(page.isValidShot(8)).toBe(true);
    expect(page.isValidShot(7)).toBe(false);
    expect(page.isValidShot(3)).toBe(false);

    // Switch to Stehend (Standing)
    page.stance = 'Stehend';
    expect(page.isValidShot(10)).toBe(true);
    expect(page.isValidShot(4)).toBe(true);
    expect(page.isValidShot(3)).toBe(false);
    expect(page.isValidShot(0)).toBe(false);
  });

  test('getSVGCoords should transform client coordinates using SVG matrix', () => {
    const mockMatrix = {
      a: 2,
      b: 0,
      c: 0,
      d: 2,
      e: 10,
      f: 20,
      inverse: () => ({
        a: 0.5,
        b: 0,
        c: 0,
        d: 0.5,
        e: -5,
        f: -10,
      }),
    };
    page.svg.getScreenCTM = jest.fn(() => mockMatrix);
    const mockPoint = {
      x: 0,
      y: 0,
      matrixTransform: jest.fn((m) => ({
        x: mockPoint.x * m.a + m.e,
        y: mockPoint.y * m.d + m.f,
      })),
    };
    page.svg.createSVGPoint = jest.fn(() => {
      mockPoint.x = 30;
      mockPoint.y = 40;
      return mockPoint;
    });

    const coords = page.getSVGCoords({ clientX: 30, clientY: 40 });
    expect(coords.x).toBe(10);
    expect(coords.y).toBe(10);
  });

  test('renderGhostShots should use configured shot size for correction markers', () => {
    global.getShotSize.mockReturnValue(10);
    page.ghostGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    page.showGhost = true;
    page.shots = [
      { id: 1, shot: 1, ring: 9, x: 100, y: 100, hit: true, intensity: 'Ruhe' },
      { id: 2, shot: 2, ring: 8, x: 102, y: 98, hit: true, intensity: 'Ruhe' },
    ];

    page.renderGhostShots();

    const firstMarker = page.ghostGroup.querySelector('circle');
    expect(firstMarker).toBeTruthy();
    expect(firstMarker.getAttribute('r')).toBe('10');
    expect(firstMarker.getAttribute('stroke-width')).toBe('2.5');
  });

  test('should support dynamic shotsPerSeries', () => {
    page.shotsPerSeries = 3;
    page.shots = [
      { id: 1, shot: 1, ring: 10, x: 100, y: 100, hit: true },
      { id: 2, shot: 2, ring: 9, x: 100, y: 100, hit: true },
      { id: 3, shot: 3, ring: 8, x: 100, y: 100, hit: true },
    ];
    page.status = jest.fn();
    page.handleTargetClick({ clientX: 100, clientY: 100 });
    expect(page.status).toHaveBeenCalledWith('series_finished');
  });
});
