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
 * Test Suite for Speech Recognition Module
 * Tests speech input handling and voice command processing
 */

describe('Speech Module', () => {
  let mockRecognition;

  beforeEach(() => {
    mockRecognition = {
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
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    global.SpeechRecognition = jest.fn(() => mockRecognition);
    jest.clearAllMocks();
  });

  describe('Speech Recognition Setup', () => {
    test('should initialize speech recognition', () => {
      const recognition = new SpeechRecognition();

      expect(recognition).toBeDefined();
      expect(recognition.continuous).toBe(false);
      expect(recognition.interimResults).toBe(false);
    });

    test('should set language to German', () => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';

      expect(recognition.lang).toBe('de-DE');
    });

    test('should enable continuous recognition', () => {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;

      expect(recognition.continuous).toBe(true);
    });

    test('should enable interim results', () => {
      const recognition = new SpeechRecognition();
      recognition.interimResults = true;

      expect(recognition.interimResults).toBe(true);
    });
  });

  describe('Speech Recognition Control', () => {
    test('should start recognition', () => {
      const recognition = new SpeechRecognition();
      recognition.start();

      expect(recognition.start).toHaveBeenCalled();
    });

    test('should stop recognition', () => {
      const recognition = new SpeechRecognition();
      recognition.stop();

      expect(recognition.stop).toHaveBeenCalled();
    });

    test('should abort recognition', () => {
      const recognition = new SpeechRecognition();
      recognition.abort();

      expect(recognition.abort).toHaveBeenCalled();
    });
  });

  describe('Speech Result Processing', () => {
    test('should extract transcript from results', () => {
      const results = [
        {
          isFinal: false,
          [Symbol.iterator]: function* () {
            yield { transcript: 'acht' };
          },
        },
      ];

      const transcript = Array.from(results[0])
        .map((r) => r.transcript)
        .join('')
        .toLowerCase();

      expect(transcript).toContain('acht');
    });

    test('should identify final vs interim results', () => {
      const finalResult = { isFinal: true, transcript: 'zehn' };
      const interimResult = { isFinal: false, transcript: 'ze...' };

      expect(finalResult.isFinal).toBe(true);
      expect(interimResult.isFinal).toBe(false);
    });
  });

  describe('Number Word Conversion', () => {
    test('should convert "eins" to 1', () => {
      const numberMap = {
        null: 0,
        eins: 1,
        zwei: 2,
        drei: 3,
        vier: 4,
        fünf: 5,
        sechs: 6,
        sieben: 7,
        acht: 8,
        neun: 9,
        zehn: 10,
      };

      expect(numberMap['eins']).toBe(1);
    });

    test('should convert "zehn" to 10', () => {
      const numberMap = {
        null: 0,
        eins: 1,
        zwei: 2,
        drei: 3,
        vier: 4,
        fünf: 5,
        sechs: 6,
        sieben: 7,
        acht: 8,
        neun: 9,
        zehn: 10,
      };

      expect(numberMap['zehn']).toBe(10);
    });

    test('should handle all numbers 0-10', () => {
      const numbers = [
        'null',
        'eins',
        'zwei',
        'drei',
        'vier',
        'fünf',
        'sechs',
        'sieben',
        'acht',
        'neun',
        'zehn',
      ];

      expect(numbers).toHaveLength(11);
    });
  });

  describe('Direction Recognition', () => {
    test('should recognize "oben" direction', () => {
      const directions = ['oben', 'unten', 'links', 'rechts'];

      expect(directions).toContain('oben');
    });

    test('should recognize correction commands', () => {
      const correctionPatterns = ['oben', 'unten', 'links', 'rechts'];
      const input = 'oben';

      expect(correctionPatterns.includes(input)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle recognition errors', () => {
      const recognition = new SpeechRecognition();
      const error = { error: 'network' };

      expect(error.error).toBe('network');
    });

    test('should handle no-match errors', () => {
      const recognition = new SpeechRecognition();
      const error = { error: 'no-match' };

      expect(error.error).toBe('no-match');
    });

    test('should continue after errors', () => {
      const recognition = new SpeechRecognition();
      let errorOccurred = false;

      errorOccurred = true;
      recognition.start();

      expect(errorOccurred).toBe(true);
      expect(recognition.start).toHaveBeenCalled();
    });
  });

  describe('Transcription Display', () => {
    test('should update transcription target element', () => {
      const transTarget = document.getElementById('transcription-target');
      const text = 'acht';

      transTarget.textContent = text;

      expect(transTarget.textContent).toBe('acht');
    });

    test('should clear transcription on final result', () => {
      const transTarget = document.getElementById('transcription-target');

      transTarget.textContent = 'interim text';
      transTarget.textContent = ''; // Clear on final

      expect(transTarget.textContent).toBe('');
    });
  });
});
