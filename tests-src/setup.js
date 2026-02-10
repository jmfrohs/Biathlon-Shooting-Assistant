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
  data: storageData,
  length: 0,
};

// Mock DOM elements
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock sessionStorage
const sessionStorageData = {};
const getSessionItemMock = jest.fn();
const setSessionItemMock = jest.fn();
const removeSessionItemMock = jest.fn();
const clearSessionMock = jest.fn();

getSessionItemMock.mockImplementation((key) => sessionStorageData[key] || null);
setSessionItemMock.mockImplementation((key, value) => {
  sessionStorageData[key] = value.toString();
});
removeSessionItemMock.mockImplementation((key) => {
  delete sessionStorageData[key];
});
clearSessionMock.mockImplementation(() => {
  Object.keys(sessionStorageData).forEach((key) => delete sessionStorageData[key]);
});

global.sessionStorage = {
  getItem: getSessionItemMock,
  setItem: setSessionItemMock,
  removeItem: removeSessionItemMock,
  clear: clearSessionMock,
  data: sessionStorageData,
  length: 0,
};

// Mock fetch globally
global.fetch = jest.fn();
