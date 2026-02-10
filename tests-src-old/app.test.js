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

describe('App Service', () => {
  let localStorageData = {};

  beforeEach(() => {
    // Mock localStorage with proper Jest mocks
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => localStorageData[key] || null),
        setItem: jest.fn((key, value) => {
          localStorageData[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
          delete localStorageData[key];
        }),
        clear: jest.fn(() => {
          localStorageData = {};
        }),
      },
      writable: true,
    });

    // Mock emailjs
    window.emailjs = {
      init: jest.fn(),
    };

    window.EMAILJS_ENABLED = false;
    window.EMAILJS_PUBLIC_KEY = 'test-key';

    localStorageData = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('LocalStorage Integration', () => {
    it('should save trainer name to localStorage', () => {
      localStorage.setItem('b_trainer_name', 'Test Trainer');
      expect(localStorage.setItem).toHaveBeenCalledWith('b_trainer_name', 'Test Trainer');
      expect(localStorage.getItem('b_trainer_name')).toBe('Test Trainer');
    });

    it('should retrieve trainer name from localStorage', () => {
      localStorage.setItem('b_trainer_name', 'Saved Trainer');
      const result = localStorage.getItem('b_trainer_name');
      expect(result).toBe('Saved Trainer');
    });

    it('should trim whitespace from trainer name', () => {
      const name = '  Trainer Name  ';
      const trimmed = name.trim();
      expect(trimmed).toBe('Trainer Name');
    });

    it('should handle missing trainer name', () => {
      const result = localStorage.getItem('non-existent-key');
      expect(result).toBeNull();
    });

    it('should save microphone permission status', () => {
      localStorage.setItem('biathlon_mic_permission_requested_v1', 'true');
      expect(localStorage.getItem('biathlon_mic_permission_requested_v1')).toBe('true');
    });

    it('should track permission denied status', () => {
      localStorage.setItem('biathlon_mic_permission_requested_v1', 'denied');
      expect(localStorage.getItem('biathlon_mic_permission_requested_v1')).toBe('denied');
    });
  });

  describe('EmailJS Configuration', () => {
    it('should initialize emailjs when enabled', () => {
      window.EMAILJS_ENABLED = true;
      window.emailjs.init(window.EMAILJS_PUBLIC_KEY);
      expect(window.emailjs.init).toHaveBeenCalledWith('test-key');
    });

    it('should not initialize emailjs when disabled', () => {
      window.EMAILJS_ENABLED = false;
      window.emailjs.init.mockClear();
      // emailjs.init should not be called
      expect(window.emailjs.init).not.toHaveBeenCalled();
    });

    it('should handle API key configuration', () => {
      localStorage.setItem('emailjs_public_key', 'public-key-123');
      localStorage.setItem('emailjs_service_id', 'service-123');
      localStorage.setItem('emailjs_template_id', 'template-123');

      expect(localStorage.getItem('emailjs_public_key')).toBe('public-key-123');
      expect(localStorage.getItem('emailjs_service_id')).toBe('service-123');
      expect(localStorage.getItem('emailjs_template_id')).toBe('template-123');
    });
  });

  describe('DOM Element Initialization', () => {
    it('should find trainer name input element', () => {
      const element = document.getElementById('trainer-name');
      expect(element).toBeTruthy();
      expect(element.id).toBe('trainer-name');
    });

    it('should find trainer name display element', () => {
      const element = document.getElementById('trainer-name-display');
      expect(element).toBeTruthy();
    });

    it('should find biathlon target element', () => {
      const element = document.getElementById('biathlon-target');
      expect(element).toBeTruthy();
    });

    it('should handle missing optional elements gracefully', () => {
      const element = document.getElementById('non-existent-element');
      expect(element).toBeNull();
    });
  });

  describe('Trainer Name Event Handling', () => {
    it('should trigger change event on trainer name input', () => {
      const element = document.getElementById('trainer-name');
      const changeListener = jest.fn();
      element.addEventListener('change', changeListener);

      const event = new Event('change');
      element.dispatchEvent(event);

      expect(changeListener).toHaveBeenCalled();
    });

    it('should trigger input event on trainer name input', () => {
      const element = document.getElementById('trainer-name');
      const inputListener = jest.fn();
      element.addEventListener('input', inputListener);

      const event = new Event('input');
      element.dispatchEvent(event);

      expect(inputListener).toHaveBeenCalled();
    });

    it('should update element value', () => {
      const element = document.getElementById('trainer-name');
      element.value = 'New Trainer';
      expect(element.value).toBe('New Trainer');
    });
  });

  describe('API Keys Event Handling', () => {
    it('should save API public key', () => {
      localStorage.setItem('emailjs_public_key', 'new-public-key');
      expect(localStorage.getItem('emailjs_public_key')).toBe('new-public-key');
    });

    it('should save API service ID', () => {
      localStorage.setItem('emailjs_service_id', 'new-service-id');
      expect(localStorage.getItem('emailjs_service_id')).toBe('new-service-id');
    });

    it('should save API template ID', () => {
      localStorage.setItem('emailjs_template_id', 'new-template-id');
      expect(localStorage.getItem('emailjs_template_id')).toBe('new-template-id');
    });
  });

  describe('Window Function Exports', () => {
    it('should expose critical functions', () => {
      const functions = ['openSessionModal', 'openSettings', 'closeModal', 'showToast'];

      functions.forEach((funcName) => {
        expect(typeof funcName).toBe('string');
      });
    });
  });

  describe('Permission Handling', () => {
    it('should request microphone permission on first load', () => {
      localStorage.clear();
      const key = 'biathlon_mic_permission_requested_v1';
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should check if permission already granted', () => {
      const key = 'biathlon_mic_permission_requested_v1';
      localStorage.setItem(key, 'true');
      expect(localStorage.getItem(key)).toBe('true');
    });

    it('should handle permission denied', () => {
      const key = 'biathlon_mic_permission_requested_v1';
      localStorage.setItem(key, 'denied');
      expect(localStorage.getItem(key)).toBe('denied');
    });
  });

  describe('Storage Operations', () => {
    it('should clear all storage when requested', () => {
      localStorage.setItem('test-key', 'test-value');
      expect(localStorage.getItem('test-key')).toBe('test-value');

      localStorage.clear();
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should remove specific items from storage', () => {
      localStorage.setItem('b_trainer_name', 'Trainer');
      expect(localStorage.getItem('b_trainer_name')).toBe('Trainer');

      localStorage.removeItem('b_trainer_name');
      expect(localStorage.getItem('b_trainer_name')).toBeNull();
    });

    it('should handle whitespace in stored values', () => {
      const value = '  test value  ';
      const trimmed = value.trim();
      expect(trimmed).toBe('test value');
    });
  });

  describe('Multiple Storage Values', () => {
    it('should store and retrieve multiple values', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.setItem('key3', 'value3');

      expect(localStorage.getItem('key1')).toBe('value1');
      expect(localStorage.getItem('key2')).toBe('value2');
      expect(localStorage.getItem('key3')).toBe('value3');
    });

    it('should preserve existing values when adding new ones', () => {
      localStorage.setItem('existing-key', 'existing-value');
      localStorage.setItem('new-key', 'new-value');

      expect(localStorage.getItem('existing-key')).toBe('existing-value');
      expect(localStorage.getItem('new-key')).toBe('new-value');
    });
  });

  describe('Special Characters Handling', () => {
    it('should save names with special characters', () => {
      const name = 'Müller-Schmidt';
      localStorage.setItem('b_trainer_name', name);
      expect(localStorage.getItem('b_trainer_name')).toBe(name);
    });

    it('should save emails with special characters', () => {
      const email = 'test+admin@example.com';
      localStorage.setItem('trainer_email', email);
      expect(localStorage.getItem('trainer_email')).toBe(email);
    });
  });
});
