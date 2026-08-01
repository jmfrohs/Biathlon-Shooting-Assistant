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
 * Test Suite for Calendar Module
 * Tests calendar functionality
 */

const calendar = require('../src/js/pages/calendar.js');

Object.defineProperty(global, 'currentView', {
  get() {
    return calendar.currentView;
  },
  set(v) {
    calendar.currentView = v;
  },
  configurable: true,
});

Object.defineProperty(global, 'currentDate', {
  get() {
    return calendar.currentDate;
  },
  set(v) {
    calendar.currentDate = v;
  },
  configurable: true,
});

global.renderWeekView = calendar.renderWeekView;

describe('Calendar Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <button id="backBtn"></button>
      <button id="prevBtn"></button>
      <button id="nextBtn"></button>
      <button id="datePickerBtn"></button>
      <div id="datePickerModal"></div>
      <input id="datePickerInput" />
      <button id="confirmDatePicker"></button>
      <button id="cancelDatePicker"></button>
      <button id="closeDatePicker"></button>
      <button id="viewSelectorBtn"></button>
      <div id="viewDropdown"></div>
      <span id="view-chevron"></span>
      <span id="currentDate"></span>
      <span id="currentView"></span>
      <h2 id="titleLabel"></h2>
      <div id="monthView"></div>
      <div id="dayView"></div>
      <div id="weekView"></div>
      <div id="weekSchedule"></div>
      <div id="daysGrid"></div>
      <div id="daySchedule"></div>
      <button class="view-option" data-view="day"></button>
      <button class="view-option selected" data-view="month"></button>
      <button class="view-option" data-view="week"></button>
    `;

    global.apiService = {
      getSessions: jest.fn().mockResolvedValue([]),
    };
    global.getLanguage = jest.fn(() => 'de');
    global.t = jest.fn((key) => key);

    currentView = 'week';
    currentDate = new Date(2026, 4, 17);
  });

  test('should exist and be loadable', () => {
    expect(true).toBe(true);
  });

  test('renderWeekView should include the calendar week in the title', () => {
    renderWeekView();

    const title = document.getElementById('titleLabel').textContent;

    expect(title).toContain('KW 20');
    expect(title).toContain('11.05.');
    expect(title).toContain('17.05.');
  });
});
