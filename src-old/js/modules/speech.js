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

let recognition = null;
let isRecording = false;

function setupSpeechRecognition() {
  if (!SpeechRecognition) {
    statusMessage.textContent = 'Error: Sprachsteuerung wird von diesem Browser nicht unterstützt.';
    toggleButton.disabled = true;
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.continuous = true;
  recognition.interimResults = true;

  let pendingShotQueue = [];
  let processingTimeout = null;

  recognition.onresult = (event) => {
    let interimText = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcript + ' ';
      } else {
        interimText += transcript;
      }
    }

    if (interimText.trim()) {
      targetElement.textContent = interimText.trim() + ' ...';
    } else if (finalText.trim()) {
      targetElement.textContent = finalText.trim();
    }

    if (finalText.trim()) {
      let processedText = convertNumberWords(finalText.trim());
      processedText = processedText.toLowerCase().replace(/,/g, '');

      if (processedText.includes('neue serie') || processedText.includes('neue serie')) {
        window.finishSeries();
        targetElement.textContent = '';
        return;
      }

      if (processedText.includes('+') || processedText.includes('plus')) {
        const session = sessions[currentSessionIndex];
        const isStaffel = session?.zusatz?.toLowerCase().includes('staffel');

        if (currentShots.length === 5 && isStaffel && MAX_SHOTS === 5) {
          MAX_SHOTS = 8;
          statusMessage.textContent = 'Weitere 3 Schüsse freigegeben (insgesamt 8 möglich).';
          updateShotCounter();
          targetElement.textContent = '';
          return;
        } else if (currentShots.length < 5) {
          statusMessage.textContent = 'Plus-Kommando nur nach 5 Schüssen bei Staffel möglich.';
          targetElement.textContent = '';
          return;
        } else if (!isStaffel) {
          statusMessage.textContent = 'Plus-Kommando nur bei Staffel-Einheiten möglich.';
          targetElement.textContent = '';
          return;
        } else {
          statusMessage.textContent =
            'Zusätzliche Schüsse bereits freigegeben oder Serie zu weit fortgeschritten.';
          targetElement.textContent = '';
          return;
        }
      }

      if (processedText.includes('liegend')) {
        setPosition('Liegend');
        statusMessage.textContent = 'Position: Liegend (min. Ring 8)';
        targetElement.textContent = '';
        return;
      }

      if (processedText.includes('stehend')) {
        setPosition('Stehend');
        statusMessage.textContent = 'Position: Stehend (min. Ring 3)';
        targetElement.textContent = '';
        return;
      }

      if (processedText.includes('zurück') || processedText.includes('zurueck')) {
        window.undoLastShot();
        targetElement.textContent = '';
        return;
      }

      if (
        processedText.includes('verrastung') &&
        (processedText.includes('hoch') ||
          processedText.includes('runter') ||
          processedText.includes('tief') ||
          processedText.includes('links') ||
          processedText.includes('rechts'))
      ) {
        let count = 1;
        const numberMatch = processedText.match(/verrastung\s+(\d+)/);
        if (numberMatch) {
          count = Math.min(parseInt(numberMatch[1]), 10);
        }

        if (processedText.includes('hoch')) {
          for (let i = 0; i < count; i++) window.adjustCorrectionUp();
        } else if (processedText.includes('runter') || processedText.includes('tief')) {
          for (let i = 0; i < count; i++) window.adjustCorrectionDown();
        } else if (processedText.includes('links')) {
          for (let i = 0; i < count; i++) window.adjustCorrectionLeft();
        } else if (processedText.includes('rechts')) {
          for (let i = 0; i < count; i++) window.adjustCorrectionRight();
        }
        targetElement.textContent = '';
        return;
      }

      if (processedText.includes('pfeile ein') || processedText.includes('pfeile an')) {
        const adjustmentToggle = document.getElementById('adjustment-toggle');
        if (adjustmentToggle && !adjustmentToggle.checked) {
          adjustmentToggle.checked = true;
          window.toggleAdjustment();
        }
        targetElement.textContent = '';
        return;
      }

      if (processedText.includes('pfeile aus')) {
        const adjustmentToggle = document.getElementById('adjustment-toggle');
        if (adjustmentToggle && adjustmentToggle.checked) {
          adjustmentToggle.checked = false;
          window.toggleAdjustment();
        }
        targetElement.textContent = '';
        return;
      }

      if (processedText.includes('fehler')) {
        if (currentShots.length >= MAX_SHOTS) {
          statusMessage.textContent = 'Serie abgeschlossen. Starte eine neue Serie.';
          return;
        }
        window.addHit(0, 'außen', 170, 100);
        targetElement.textContent = '';
        return;
      }

      if (processedText.includes('korrektur')) {
        if (currentShots.length === MAX_SHOTS) {
          correctionToggle.checked = !correctionToggle.checked;
          window.toggleCorrection();
          targetElement.textContent = '';
          return;
        } else {
          statusMessage.textContent =
            'Korrektur kann nur angezeigt werden, wenn die Serie beendet ist.';
          targetElement.textContent = '';
          return;
        }
      }

      const session = sessions[currentSessionIndex];
      if (session) {
        for (const athleteName of session.athletes) {
          if (processedText.includes(athleteName.toLowerCase())) {
            showAthleteDetail(athleteName);
            setTimeout(() => {
              openShootingInterface();
            }, 300);
            targetElement.textContent = '';
            return;
          }
        }
      }

      if (currentShots.length >= MAX_SHOTS) {
        statusMessage.textContent = 'Serie abgeschlossen. Starte eine neue Serie.';
        return;
      }

      const detectedShots = [];
      const biathlonSeriesRegex = new RegExp(`${numberPattern}${directionPattern}`, 'gi');
      let match;
      while ((match = biathlonSeriesRegex.exec(processedText)) !== null) {
        if (currentShots.length + detectedShots.length >= MAX_SHOTS) break;
        let ringNumber = null;
        let direction = 'zentrum';
        const ringInput = match[1] || match[2];
        let directionInput = match[3];

        if (ringInput) {
          if (ringInput === 'fehler' || ringInput === 'null' || ringInput === '0') {
            ringNumber = 0;
          } else {
            const num = parseInt(ringInput, 10);
            if (!isNaN(num) && num >= 0 && num <= 10) {
              ringNumber = num;
            }
          }
        }

        if (directionInput) {
          directionInput = directionInput.trim().toLowerCase();
          if (directionInput.includes('rechts') && directionInput.includes('hoch')) {
            direction = 'rechts hoch';
          } else if (directionInput.includes('rechts') && directionInput.includes('unten')) {
            direction = 'rechts unten';
          } else if (directionInput.includes('links') && directionInput.includes('hoch')) {
            direction = 'links hoch';
          } else if (directionInput.includes('links') && directionInput.includes('unten')) {
            direction = 'links unten';
          } else {
            direction = directionInput;
          }
        }
        if (ringNumber !== null) {
          detectedShots.push({
            ring: ringNumber,
            direction: direction,
          });
        }
      }

      if (detectedShots.length === 0) {
        const numberOnlyPattern = new RegExp(numberPattern, 'gi');
        const numberMatch = numberOnlyPattern.exec(processedText);
        if (numberMatch) {
          const ringInput = numberMatch[1] || numberMatch[2];
          let ringNumber = null;
          if (ringInput === 'fehler' || ringInput === 'null' || ringInput === '0') {
            ringNumber = 0;
          } else {
            const num = parseInt(ringInput, 10);
            if (!isNaN(num) && num >= 0 && num <= 10) {
              ringNumber = num;
            }
          }
          if (ringNumber !== null) {
            if (pendingShotQueue.length > 0 && pendingShotQueue[0].ring === ringNumber) {
              return;
            }

            const fullPattern = new RegExp(
              `(?:^|\\s)${ringNumber}(?:\\s+(?:und)?\\s*(hoch\\s+links|hoch\\s+rechts|unten\\s+links|unten\\s+rechts|oben\\s+links|oben\\s+rechts|tief\\s+links|tief\\s+rechts|links|rechts|oben|hoch|unten|tief|zentrum|mitte))?`,
              'i'
            );
            const fullMatch = fullPattern.exec(processedText);
            let direction = 'zentrum';

            if (fullMatch && fullMatch[1]) {
              let directionInput = fullMatch[1].trim().toLowerCase();
              if (directionInput.includes('rechts') && directionInput.includes('hoch')) {
                direction = 'rechts hoch';
              } else if (directionInput.includes('rechts') && directionInput.includes('unten')) {
                direction = 'rechts unten';
              } else if (directionInput.includes('links') && directionInput.includes('hoch')) {
                direction = 'links hoch';
              } else if (directionInput.includes('links') && directionInput.includes('unten')) {
                direction = 'links unten';
              } else {
                direction = directionInput;
              }
            }

            clearTimeout(processingTimeout);
            pendingShotQueue = [
              {
                ring: ringNumber,
                direction: direction,
                timestamp: Date.now(),
                text: processedText,
              },
            ];

            statusMessage.textContent = `Ring ${ringNumber} erkannt. Warte auf Richtung...`;
            targetElement.textContent = '';

            processingTimeout = setTimeout(() => {
              pendingShotQueue.forEach((shot) => {
                if (currentShots.length < MAX_SHOTS) {
                  window.addHit(shot.ring, shot.direction);
                }
              });
              pendingShotQueue = [];
            }, 1200);
            return;
          }
        }
        statusMessage.textContent = 'Befehl nicht verstanden. Versuchen Sie: "[Ring], [Richtung]".';
      } else {
        clearTimeout(processingTimeout);
        pendingShotQueue = [];
        detectedShots.forEach((shot) => {
          if (currentShots.length < MAX_SHOTS) {
            window.addHit(shot.ring, shot.direction);
          }
        });
        targetElement.textContent = '';
      }
    }
  };

  recognition.onstart = () => {
    isRecording = true;
    toggleButton.classList.add('recording');
    buttonText.textContent = 'Aufnahme';
    statusMessage.textContent = 'Nimmt auf';
  };

  recognition.onend = () => {
    isRecording = false;
    toggleButton.classList.remove('recording');
    buttonText.textContent = 'Start Aufnahme';
    if (currentShots.length >= MAX_SHOTS) {
      // Serie voll
    } else if (recognition.manualStop) {
      statusMessage.textContent =
        'Aufnahme gestoppt. Klicken Sie auf "Start Aufnahme", um fortzufahren.';
    }
    recognition.manualStop = false;
    console.log('Spracherkennung beendet.');
  };

  recognition.onerror = (event) => {
    console.error('Aufnahme Fehler:', event.error);
    statusMessage.textContent = `Fehler: ${event.error}. Bitte versuchen Sie es erneut.`;
    isRecording = false;
    toggleButton.classList.remove('aufnehmen');
    buttonText.textContent = 'Start Aufnahme';
    recognition.manualStop = false;
  };
}

window.toggleSpeech = function () {
  if (!recognition) {
    setupSpeechRecognition();
    if (!recognition) return;
  }
  if (currentShots.length >= MAX_SHOTS) {
    statusMessage.textContent = 'Series complete. Start a new series to add shots.';
    return;
  }
  if (isRecording) {
    recognition.manualStop = true;
    recognition.stop();
    isRecording = false;
    toggleButton.classList.remove('recording');
    buttonText.textContent = 'Start Aufnahme';
  } else {
    try {
      isRecording = true;
      toggleButton.classList.add('recording');
      buttonText.textContent = 'Aufnahme';
      recognition.start();
    } catch (e) {
      if (e.name !== 'InvalidStateError') {
        console.error('Error starting speech recognition:', e);
        isRecording = false;
        toggleButton.classList.remove('recording');
        buttonText.textContent = 'Start Aufnahme';
      }
    }
  }
};
