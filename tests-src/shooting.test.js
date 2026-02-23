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

// ── Load shooting.js using new Function() with explicit argument injection ───
//    The code+return trick exposes ShootingPage outside the function scope.

const shootingCode = fs.readFileSync(
  path.resolve(__dirname, '../src/js/pages/shooting.js'),
  'utf8'
);

const argNames = [
  'window',
  'document',
  'navigator',
  'console',
  'localStorage',
  'sessionStorage',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'URLSearchParams',
  'bootstrap',
  't',
  'getTargetConstants',
  'getHitColor',
  'getMissColor',
  'getHitLabelColor',
  'getMissLabelColor',
  'getGhostShotColor',
  'getGhostLabelColor',
  'getShotSize',
  'getShotLabelContent',
  'getRandomRadiusForRing',
  'getBiasedAngle',
];

// eslint-disable-next-line no-new-func
const loadShootingModule = new Function(
  ...argNames,
  shootingCode + '\nreturn typeof ShootingPage !== "undefined" ? ShootingPage : undefined;'
);

global.ShootingPage = loadShootingModule(
  window,
  document,
  navigator,
  console,
  localStorage,
  sessionStorage,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  global.URLSearchParams,
  global.bootstrap,
  global.t,
  global.getTargetConstants,
  global.getHitColor,
  global.getMissColor,
  global.getHitLabelColor,
  global.getMissLabelColor,
  global.getGhostShotColor,
  global.getGhostLabelColor,
  global.getShotSize,
  global.getShotLabelContent,
  global.getRandomRadiusForRing,
  global.getBiasedAngle
);

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
});
