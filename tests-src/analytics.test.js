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
 * Test Suite for Analytics Module
 * Tests analytics functionality
 */

const fs = require('fs');
const path = require('path');

// Load the script
const analyticsCode = fs.readFileSync(
  path.resolve(__dirname, '../src/js/pages/analytics.js'),
  'utf8'
);

// Mock AnalyticsPage dependencies
const mockElements = {
  'analytics-content': document.createElement('div'),
  'analysis-content': document.createElement('div'),
  'athlete-filter': document.createElement('div'),
  'series-filter': document.createElement('div'),
};

const vm = require('vm');

document.getElementById = jest.fn((id) => mockElements[id] || document.createElement('div'));

// Execute the script in the window context
const context = {
  window,
  document,
  navigator,
  console,
  localStorage,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  t: (key) => key, // Mock translation function
  AnalyticsPage: null,
};
vm.runInNewContext(analyticsCode, context);

// Promote AnalyticsPage from context to global
global.AnalyticsPage = context.AnalyticsPage || context.window.AnalyticsPage;

describe('Analytics Module', () => {
  let page;

  beforeEach(() => {
    jest.clearAllMocks();
    page = new AnalyticsPage();
  });

  test('getInitials should return first letter of each name', () => {
    expect(page.getInitials('John Doe')).toBe('JD');
    expect(page.getInitials('Alice')).toBe('A');
    expect(page.getInitials('')).toBe('');
  });

  test('escapeHtml should sanitize HTML characters', () => {
    expect(page.escapeHtml('<b>Text</b>')).toBe('&lt;b&gt;Text&lt;/b&gt;');
    expect(page.escapeHtml('"Quote"')).toBe('&quot;Quote&quot;');
  });

  test('renderWindFlag should return SVG string', () => {
    const svg = page.renderWindFlag(45);
    expect(svg).toContain('<svg');
    expect(svg).toContain('rotate(45');
  });
});
