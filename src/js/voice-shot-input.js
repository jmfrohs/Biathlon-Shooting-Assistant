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
class VoiceShotInput {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.onShotDetected = null;
    this.onStatusChange = null;
    this.onCommandDetected = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }
    this.setupRecognition(SpeechRecognition);
  }

setupRecognition(SpeechRecognition) {
    this.recognition = new SpeechRecognition();
    const appLang = localStorage.getItem('b_language') || 'de';
    this.recognition.lang = appLang === 'de' ? 'de-DE' : 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.onresult = (event) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        }
      }

if (finalText.trim()) {
        this.processInput(finalText.trim());
      }
    };
    this.recognition.onstart = () => {
      this.isRecording = true;
      if (this.onStatusChange) {
        this.onStatusChange('recording');
      }
    };
    this.recognition.onend = () => {
      this.isRecording = false;
      if (this.onStatusChange) {
        this.onStatusChange('stopped');
      }
    };
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isRecording = false;
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (this.isRecording) {
            this.start();
          }
        }, 100);
      }

if (this.onStatusChange) {
        this.onStatusChange('error', event.error);
      }
    };
  }

processInput(text) {
    const processed = this.convertNumberWords(text.toLowerCase().trim());
    const appLang = localStorage.getItem('b_language') || 'de';
    if (appLang === 'de') {
      if (processed.includes('liegend')) {
        if (this.onCommandDetected) this.onCommandDetected('stance_prone');
        return;
      }

if (processed.includes('stehend')) {
        if (this.onCommandDetected) this.onCommandDetected('stance_standing');
        return;
      }
    } else {
      if (processed.includes('prone')) {
        if (this.onCommandDetected) this.onCommandDetected('stance_prone');
        return;
      }

if (processed.includes('standing')) {
        if (this.onCommandDetected) this.onCommandDetected('stance_standing');
        return;
      }
    }
    const adjMatch = processed.match(/(\d+)?\s*(hoch|runter|tief|links|rechts|up|down|left|right)/);
    if (adjMatch) {
      const count = adjMatch[1] ? parseInt(adjMatch[1]) : 1;
      const dir = adjMatch[2];
      let command = null;
      if (dir === 'hoch' || dir === 'up') command = 'adjust_up';
      else if (dir === 'runter' || dir === 'tief' || dir === 'down') command = 'adjust_down';
      else if (dir === 'links' || dir === 'left') command = 'adjust_left';
      else if (dir === 'rechts' || dir === 'right') command = 'adjust_right';
      if (command && this.onCommandDetected) {
        this.onCommandDetected(command, count);
        return;
      }
    }

if (
      (appLang === 'de' &&
        (processed.includes('zurücksetzen') || processed.includes('zuruecksetzen'))) ||
      (appLang === 'en' && processed.includes('reset'))
    ) {
      if (!processed.includes('wind')) {
        if (this.onCommandDetected) this.onCommandDetected('reset_clicks');
        return;
      }
    }

if (appLang === 'de') {
      if (processed.includes('geister ein') || processed.includes('marker ein')) {
        if (this.onCommandDetected) this.onCommandDetected('ghost_on');
        return;
      }

if (processed.includes('geister aus') || processed.includes('marker aus')) {
        if (this.onCommandDetected) this.onCommandDetected('ghost_off');
        return;
      }

if (processed.includes('geister') || processed.includes('marker')) {
        if (this.onCommandDetected) this.onCommandDetected('ghost_toggle');
        return;
      }
    } else {
      if (processed.includes('ghost on') || processed.includes('markers on')) {
        if (this.onCommandDetected) this.onCommandDetected('ghost_on');
        return;
      }

if (processed.includes('ghost off') || processed.includes('markers off')) {
        if (this.onCommandDetected) this.onCommandDetected('ghost_off');
        return;
      }

if (
        processed.includes('ghost') ||
        processed.includes('markers') ||
        processed.includes('toggle markers')
      ) {
        if (this.onCommandDetected) this.onCommandDetected('ghost_toggle');
        return;
      }
    }

if (
      (appLang === 'de' && (processed.includes('gruppierung') || processed.includes('gruppe'))) ||
      (appLang === 'en' && (processed.includes('grouping') || processed.includes('group')))
    ) {
      if (this.onCommandDetected) this.onCommandDetected('toggle_grouping');
      return;
    }
    const windMatch = processed.match(/wind\s*(-?\d+)/);
    if (windMatch) {
      const value = parseInt(windMatch[1]);
      if (this.onCommandDetected) this.onCommandDetected('set_wind', value);
      return;
    }

if (processed.includes('wind')) {
      if (this.onCommandDetected) this.onCommandDetected('open_wind');
      return;
    }

if (
      (appLang === 'de' &&
        (processed.includes('speichern') || processed.includes('serie speichern'))) ||
      (appLang === 'en' && processed.includes('save') && !processed.includes('auto'))
    ) {
      if (this.onCommandDetected) this.onCommandDetected('save');
      return;
    }

if (appLang === 'de') {
      if (processed.includes('nächster schütze') || processed.includes('naechster schuetze')) {
        if (this.onCommandDetected) this.onCommandDetected('next_athlete');
        return;
      }

if (processed.includes('vorheriger schütze') || processed.includes('vorheriger schuetze')) {
        if (this.onCommandDetected) this.onCommandDetected('prev_athlete');
        return;
      }

if (
        processed.includes('zurück zur übersicht') ||
        processed.includes('zurueck zur uebersicht') ||
        processed.includes('übersicht')
      ) {
        if (this.onCommandDetected) this.onCommandDetected('go_back');
        return;
      }
    } else {
      if (processed.includes('next athlete')) {
        if (this.onCommandDetected) this.onCommandDetected('next_athlete');
        return;
      }

if (processed.includes('previous athlete') || processed.includes('prev athlete')) {
        if (this.onCommandDetected) this.onCommandDetected('prev_athlete');
        return;
      }

if (processed.includes('back to overview') || processed.includes('overview')) {
        if (this.onCommandDetected) this.onCommandDetected('go_back');
        return;
      }
    }

if (processed.includes('fehler') || processed.includes('miss')) {
      if (this.onCommandDetected) this.onCommandDetected('miss');
      return;
    }

if (
      processed.includes('zurück') ||
      processed.includes('zurueck') ||
      processed.includes('undo') ||
      processed.includes('back')
    ) {
      if (this.onCommandDetected) this.onCommandDetected('undo');
      return;
    }
    const shot = this.parseShot(processed);
    if (shot && this.onShotDetected) {
      this.onShotDetected(shot.ring, shot.direction);
    }
  }

parseShot(text) {
    const appLang = localStorage.getItem('b_language') || 'de';
    const ringMatch = text.match(/\b(null|fehler|miss|zero|[0-9]|10)\b/);
    if (!ringMatch) return null;
    let ring = ringMatch[1];
    if (ring === 'null' || ring === 'fehler' || ring === 'miss' || ring === 'zero') {
      ring = 0;
    } else {
      ring = parseInt(ring, 10);
    }

if (isNaN(ring) || ring < 0 || ring > 10) return null;
    let direction = 'zentrum';
    if (appLang === 'de') {
      if (
        (text.includes('rechts') || text.includes('recht')) &&
        (text.includes('oben') || text.includes('hoch'))
      ) {
        direction = 'rechts hoch';
      } else if (
        (text.includes('rechts') || text.includes('recht')) &&
        (text.includes('unten') || text.includes('tief'))
      ) {
        direction = 'rechts unten';
      } else if (text.includes('links') && (text.includes('oben') || text.includes('hoch'))) {
        direction = 'links hoch';
      } else if (text.includes('links') && (text.includes('unten') || text.includes('tief'))) {
        direction = 'links unten';
      } else if (text.includes('links')) {
        direction = 'links';
      } else if (text.includes('rechts') || text.includes('recht')) {
        direction = 'rechts';
      } else if (text.includes('oben') || text.includes('hoch')) {
        direction = 'hoch';
      } else if (text.includes('unten') || text.includes('tief')) {
        direction = 'unten';
      } else if (text.includes('mitte') || text.includes('zentrum')) {
        direction = 'zentrum';
      }
    } else {
      if (
        text.includes('right') &&
        (text.includes('up') || text.includes('top') || text.includes('high'))
      ) {
        direction = 'rechts hoch';
      } else if (
        text.includes('right') &&
        (text.includes('down') || text.includes('bottom') || text.includes('low'))
      ) {
        direction = 'rechts unten';
      } else if (
        text.includes('left') &&
        (text.includes('up') || text.includes('top') || text.includes('high'))
      ) {
        direction = 'links hoch';
      } else if (
        text.includes('left') &&
        (text.includes('down') || text.includes('bottom') || text.includes('low'))
      ) {
        direction = 'links unten';
      } else if (text.includes('left')) {
        direction = 'links';
      } else if (text.includes('right')) {
        direction = 'rechts';
      } else if (text.includes('up') || text.includes('top') || text.includes('high')) {
        direction = 'hoch';
      } else if (text.includes('down') || text.includes('bottom') || text.includes('low')) {
        direction = 'unten';
      } else if (text.includes('center') || text.includes('middle')) {
        direction = 'zentrum';
      }
    }
    return { ring, direction };
  }

convertNumberWords(text) {
    const appLang = localStorage.getItem('b_language') || 'de';
    const numberMapDE = {
      null: '0',
      eins: '1',
      zwei: '2',
      drei: '3',
      vier: '4',
      fünf: '5',
      sechs: '6',
      sieben: '7',
      acht: '8',
      neun: '9',
      zehn: '10',
    };
    const numberMapEN = {
      zero: '0',
      one: '1',
      two: '2',
      three: '3',
      four: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      nine: '9',
      ten: '10',
    };
    const numberMap = appLang === 'de' ? numberMapDE : numberMapEN;
    let converted = text;
    for (const [word, digit] of Object.entries(numberMap)) {
      converted = converted.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }
    return converted;
  }

start() {
    if (!this.recognition) {
      console.error('Speech recognition not available');
      return false;
    }

if (this.isRecording) {
      return true;
    }
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      if (e.name !== 'InvalidStateError') {
        console.error('Error starting recognition:', e);
      }
      return false;
    }
  }

stop() {
    if (!this.recognition || !this.isRecording) {
      return;
    }
    try {
      this.recognition.stop();
    } catch (e) {
      console.error('Error stopping recognition:', e);
    }
  }

toggle() {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
  }

isSupported() {
    return this.recognition !== null;
  }

isActive() {
    return this.isRecording;
  }
}