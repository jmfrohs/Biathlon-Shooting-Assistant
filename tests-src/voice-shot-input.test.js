const fs = require('fs');
const path = require('path');

// Mock SpeechRecognition since it is a browser API
class MockSpeechRecognition {
  constructor() {
    this.lang = '';
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.start = jest.fn();
    this.stop = jest.fn();
  }
}
global.SpeechRecognition = MockSpeechRecognition;
global.webkitSpeechRecognition = MockSpeechRecognition;

// Require voice-shot-input.js directly
const { VoiceShotInput } = require('../src/js/services/voice-shot-input.js');
global.VoiceShotInput = VoiceShotInput;

describe('Voice Shot Input Module', () => {
  let voiceInput;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('German Language Parsing', () => {
    beforeEach(() => {
      localStorage.setItem('b_language', 'de');
      voiceInput = new VoiceShotInput();
    });

    test('should parse "zwei oben" correctly', () => {
      const processed = voiceInput.processTranscript('zwei oben');
      expect(processed).toBe('2 oben');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 2, direction: 'hoch' });
    });

    test('should report "zwei oben" as complete', () => {
      expect(voiceInput.isCommandComplete('zwei oben')).toBe(true);
    });

    test('should parse "oben zwei" correctly', () => {
      const processed = voiceInput.processTranscript('oben zwei');
      expect(processed).toBe('oben 2');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 2, direction: 'hoch' });
    });

    test('should report "oben zwei" as complete', () => {
      expect(voiceInput.isCommandComplete('oben zwei')).toBe(true);
    });

    test('should fuzzy correct and parse "oben frei" as "oben 3"', () => {
      const processed = voiceInput.processTranscript('oben frei');
      expect(processed).toBe('oben 3');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 3, direction: 'hoch' });
    });

    test('should fuzzy correct and parse "frei oben" as "3 oben"', () => {
      const processed = voiceInput.processTranscript('frei oben');
      expect(processed).toBe('3 oben');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 3, direction: 'hoch' });
    });

    test('should parse "rechts drei" correctly', () => {
      const processed = voiceInput.processTranscript('rechts drei');
      expect(processed).toBe('rechts 3');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 3, direction: 'rechts' });
    });

    test('should parse "zentrum fünf" correctly', () => {
      const processed = voiceInput.processTranscript('zentrum fünf');
      expect(processed).toBe('zentrum 5');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 5, direction: 'zentrum' });
    });
  });

  describe('English Language Parsing', () => {
    beforeEach(() => {
      localStorage.setItem('b_language', 'en');
      voiceInput = new VoiceShotInput();
    });

    test('should parse "three left" correctly', () => {
      const processed = voiceInput.processTranscript('three left');
      expect(processed).toBe('3 left');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 3, direction: 'links' });
    });

    test('should parse "left three" correctly', () => {
      const processed = voiceInput.processTranscript('left three');
      expect(processed).toBe('left 3');
      const shot = voiceInput.parseShot(processed);
      expect(shot).toEqual({ ring: 3, direction: 'links' });
    });
  });
});
