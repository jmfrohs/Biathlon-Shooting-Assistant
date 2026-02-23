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
 * Test Suite for Target Manager Module
 * Tests target management and visualization
 */

const fs = require('fs');
const path = require('path');

const vm = require('vm');

// Load the script
const targetManagerCode = fs.readFileSync(
  path.resolve(__dirname, '../src/js/managers/target-manager.js'),
  'utf8'
);

// Execute in current context to share globals
const context = {
  console,
  localStorage,
  setTimeout,
  setInterval,
  Date,
  JSON,
};
const script = new vm.Script(
  targetManagerCode + '\nthis.TargetManager = TargetManager; this.targetManager = targetManager;'
);
vm.createContext(context);
script.runInContext(context);

// Promote interesting items to global for the test
global.TargetManager = context.TargetManager;
global.targetManager = context.targetManager;

describe('Target Manager Module', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Re-instantiate since it's a global in the script
    manager = new TargetManager();
  });

  test('should load system targets by default', () => {
    const targets = manager.getAllTargets();
    expect(targets.length).toBeGreaterThanOrEqual(2);
    expect(targets[0].id).toBe('scheibe1');
  });

  test('createTarget should add a new custom target', () => {
    const newTarget = manager.createTarget('My Target');
    expect(newTarget.name).toBe('My Target');
    expect(newTarget.id).toContain('custom_');
    expect(manager.customTargets.length).toBe(1);
    expect(localStorage.getItem('custom_targets')).toContain('My Target');
  });

  test('getTargetById should return system target', () => {
    const target = manager.getTargetById('scheibe2');
    expect(target.name).toContain('Präzision');
  });

  test('getTargetById should return custom target', () => {
    const newTarget = manager.createTarget('Custom X');
    const found = manager.getTargetById(newTarget.id);
    expect(found.name).toBe('Custom X');
  });

  test('updateTarget should modify custom target', () => {
    const newTarget = manager.createTarget('Old Name');
    const result = manager.updateTarget(newTarget.id, { name: 'New Name' });
    expect(result).toBe(true);
    expect(manager.getTargetById(newTarget.id).name).toBe('New Name');
  });

  test('deleteTarget should remove custom target', () => {
    const newTarget = manager.createTarget('To Delete');
    manager.deleteTarget(newTarget.id);
    expect(manager.customTargets.length).toBe(0);
  });

  test('generateSvgFromObject should generate SVG string', () => {
    const target = {
      background: '#ffffff',
      rings: [
        { r: 50, fill: 'red', stroke: 'black', strokeWidth: 1, text: 'X', textColor: 'white' },
      ],
      crosshair: { visible: true, color: 'blue', width: 2, opacity: 0.5 },
    };
    const svg = manager.generateSvgFromObject(target);
    expect(svg).toContain('<svg');
    expect(svg).toContain('style="background-color: #ffffff; border-radius: 50%;"');
    expect(svg).toContain('r="50"');
    expect(svg).toContain('fill="red"');
    expect(svg).toContain('class="crosshair-line"');
    expect(svg).toContain('stroke: blue;');
  });
});
