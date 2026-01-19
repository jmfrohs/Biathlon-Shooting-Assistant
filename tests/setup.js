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

// Mock localStorage with proper Jest mock functions
const storageData = {};

// Create mock functions individually
const getItemMock = jest.fn();
const setItemMock = jest.fn();
const removeItemMock = jest.fn();
const clearMock = jest.fn();

// Set up implementations
getItemMock.mockImplementation((key) => storageData[key] || null);
setItemMock.mockImplementation((key, value) => {
  storageData[key] = value.toString();
});
removeItemMock.mockImplementation((key) => {
  delete storageData[key];
});
clearMock.mockImplementation(() => {
  Object.keys(storageData).forEach((key) => delete storageData[key]);
});

global.localStorage = {
  getItem: getItemMock,
  setItem: setItemMock,
  removeItem: removeItemMock,
  clear: clearMock,
};

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve({ getTracks: () => [] })),
};

// Mock SpeechRecognition
global.SpeechRecognition = jest.fn(() => ({
  continuous: false,
  interimResults: false,
  lang: 'de-DE',
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null,
}));

// Mock emailjs
global.emailjs = {
  init: jest.fn(),
  send: jest.fn(() => Promise.resolve()),
};

// Global variables
global.sessions = [];
global.globalAthletes = [];
global.globalHistory = {};
global.trainerEmails = [];
global.currentSessionIndex = null;
global.currentAthleteName = null;
global.currentShots = [];
global.currentPosition = 'Liegend';

// Mock DOM elements
document.body.innerHTML = `
  <div id="view-sessions" class="hidden"></div>
  <div id="view-athletes" class="hidden"></div>
  <div id="view-athlete-detail" class="hidden"></div>
  <div id="session-list"></div>
  <div id="athletes-in-session-list"></div>
  <div id="athlete-history-list"></div>
  <div id="athlete-detail-name"></div>
  <div id="trainer-name"></div>
  <div id="trainer-name-display"></div>
  <div id="session-modal" class="hidden"></div>
  <div id="settings-modal" class="hidden"></div>
  <div id="status-message"></div>
  <div id="biathlon-target"></div>
  <div id="target-container"></div>
  <div id="shot-counter"></div>
  <div id="toggle-button"></div>
  <div id="button-text"></div>
  <div id="transcription-target"></div>
  <div id="shooting-modal" class="hidden"></div>
  <input id="s-ort" type="text" />
  <input id="s-datum" type="date" />
  <input id="s-zusatz" type="text" />
  <div id="athlete-checkboxes"></div>
  <button id="s-btn-t"></button>
  <button id="s-btn-w"></button>
  <button id="s-btn-a"></button>
  <form id="session-form"></form>
  <div id="email-list"></div>
  <div id="global-athlete-list"></div>
  <div id="new-athlete-name"></div>
  <div id="new-email-input"></div>
  <input id="new-athlete-name" type="text" />
  <input id="new-email-input" type="email" />
`;
