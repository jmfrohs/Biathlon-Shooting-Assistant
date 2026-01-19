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

let currentShots = [];
let currentPosition = 'Liegend';
let MAX_SHOTS = 5;
let correctionVisible = false;
let adjustmentVisible = false;
let avgX = 100;
let avgY = 100;
let corrH = 0;
let corrV = 0;

// Konstanten für die Scheibe
const MAX_RADIUS = 100; // Maximaler Radius der Scheibe (Ring 1)
const RING_STEP = 10; // Abstand zwischen den Ringen
const CENTER_RADIUS = 10; // Radius des inneren Bullseye
const CORRECTION_UNIT = 10; // Korrektureinheit in Pixeln

let targetElement;
let toggleButton;
let buttonText;
let statusMessage;
let svgTarget;
let targetContainer;
let shotCounterElement;
let correctionToggle;

function openShootingInterface() {
  MAX_SHOTS = 5;

  document.getElementById('shooting-modal').classList.replace('hidden', 'flex');
  setTimeout(() => {
    window.targetElement = document.getElementById('transcription-target');
    window.toggleButton = document.getElementById('toggle-button');
    window.buttonText = document.getElementById('button-text');
    window.statusMessage = document.getElementById('status-message');
    window.targetContainer = document.getElementById('target-container');
    window.shotCounterElement = document.getElementById('shot-counter');
    window.correctionToggle = document.getElementById('correction-toggle');

    // Lade die aktuelle Scheibe
    resetTargetVisuals();

    // Erhalte die aktualisierte SVG-Referenz nach dem Laden
    window.svgTarget = document.getElementById('biathlon-target');

    targetElement = window.targetElement;
    toggleButton = window.toggleButton;
    buttonText = window.buttonText;
    statusMessage = window.statusMessage;
    svgTarget = window.svgTarget;
    targetContainer = window.targetContainer;
    shotCounterElement = window.shotCounterElement;
    correctionToggle = window.correctionToggle;

    setPosition('Liegend');
    if (targetContainer) {
      targetContainer.removeEventListener('click', handleTargetClick);
      targetContainer.addEventListener('click', handleTargetClick);
    }
    if (targetElement) {
      targetElement.removeEventListener('keydown', handleTextfieldInput);
      targetElement.addEventListener('keydown', handleTextfieldInput);
    }
    if (!recognition) {
      setupSpeechRecognition();
    }
    updateShotCounter();
    updateStatusMessage();
  }, 100);
}

function closeShootingInterface() {
  document.getElementById('shooting-modal').classList.replace('flex', 'hidden');
  if (isRecording) {
    recognition.manualStop = true;
    recognition.stop();
  }
  currentShots = [];
}

function resetTargetVisuals() {
  const svg = document.getElementById('biathlon-target');
  const container = document.getElementById('target-container');

  // Regeneriere die Scheibe mit der aktuell ausgewählten Scheibe
  const targetSvg = getTargetSvgBase();
  // Füge das id Attribut zur SVG hinzu
  const svgWithId = targetSvg.replace('<svg ', '<svg id="biathlon-target" ');
  container.innerHTML = svgWithId + '</svg>';

  // Aktualisiere die svgTarget Referenz
  svgTarget = document.getElementById('biathlon-target');
  window.svgTarget = svgTarget;
}

function setPosition(position) {
  currentPosition = position;
  document.getElementById('pos-btn-prone').className =
    position === 'Liegend'
      ? 'p-3 rounded-lg border-2 border-indigo-500 bg-indigo-500/20 font-bold text-white'
      : 'p-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-400';
  document.getElementById('pos-btn-standing').className =
    position === 'Stehend'
      ? 'p-3 rounded-lg border-2 border-indigo-500 bg-indigo-500/20 font-bold text-white'
      : 'p-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-400';
  updateStatusMessage();
}

function handleTargetClick(event) {
  if (currentShots.length >= MAX_SHOTS) {
    statusMessage.textContent = 'Serie abgeschlossen. Starte eine neue Serie.';
    return;
  }
  const pt = svgTarget.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgCords = pt.matrixTransform(svgTarget.getScreenCTM().inverse());
  const cx = svgCords.x;
  const cy = svgCords.y;
  const centerX = 100;
  const centerY = 100;
  const distance = Math.sqrt(Math.pow(cx - centerX, 2) + Math.pow(cy - centerY, 2));
  const ringNumber = getRingFromDistance(distance);
  let direction = 'zentrum';
  const dx = cx - centerX;
  const dy = centerY - cy;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angleDeg > 22.5 && angleDeg <= 67.5) direction = 'rechts hoch';
  else if (angleDeg > 67.5 && angleDeg <= 112.5) direction = 'oben';
  else if (angleDeg > 112.5 && angleDeg <= 157.5) direction = 'links hoch';
  else if (angleDeg > 157.5 || angleDeg <= -157.5) direction = 'links';
  else if (angleDeg > -157.5 && angleDeg <= -112.5) direction = 'links unten';
  else if (angleDeg > -112.5 && angleDeg <= -67.5) direction = 'unten';
  else if (angleDeg > -67.5 && angleDeg <= -22.5) direction = 'rechts unten';
  else if (angleDeg > -22.5 && angleDeg <= 22.5) direction = 'rechts';
  else direction = 'zentrum';
  window.addHit(ringNumber, direction, cx, cy);
}

window.addHit = function (ringNumber, direction = 'center', cx = null, cy = null) {
  if (currentShots.length >= MAX_SHOTS) {
    statusMessage.textContent = 'Serie abgeschlossen. Starte eine neue Serie.';
    return;
  }
  const currentShotNumber = currentShots.length + 1;
  if (cx === null || cy === null) {
    let maxRadius;
    let minRadius;
    if (ringNumber === 10) {
      minRadius = 0;
      maxRadius = CENTER_RADIUS;
    } else if (ringNumber >= 1 && ringNumber <= 9) {
      minRadius = (10 - ringNumber) * RING_STEP;
      maxRadius = (11 - ringNumber) * RING_STEP;
    } else {
      minRadius = MAX_RADIUS;
      maxRadius = MAX_RADIUS + 20;
    }
    const radius = getRandomArbitrary(minRadius, maxRadius);
    const angle = getBiasedAngle(direction);
    if (ringNumber === 0) {
      cx = radius * Math.cos(angle) + 100;
      cy = 100 - radius * Math.sin(angle);
    } else {
      cx = radius * Math.cos(angle) + 100;
      cy = 100 - radius * Math.sin(angle);
    }
  }
  const isValid = isValidShot(ringNumber);
  const isHit = isValid && ringNumber >= 1;
  const hit_color = isHit ? '#228B22' : '#ef4444';
  const hitCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hitCircle.setAttribute('cx', cx);
  hitCircle.setAttribute('cy', cy);
  hitCircle.setAttribute('r', 6);
  hitCircle.setAttribute('class', 'hit-mark');
  hitCircle.setAttribute('stroke', '#FFFFFF');
  hitCircle.setAttribute('stroke-width', '1.5');
  hitCircle.style.fill = hit_color;
  hitCircle.style.opacity = isHit ? '1' : '1';
  svgTarget.appendChild(hitCircle);
  const hitNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  hitNumber.setAttribute('x', cx);
  hitNumber.setAttribute('y', cy + 0.5);
  hitNumber.textContent = currentShotNumber;
  hitNumber.setAttribute('class', 'shot-number');
  hitNumber.style.fill = (isHit && ringNumber >= 4) || !isHit ? 'white' : 'black';
  hitNumber.style.fontSize = !isHit ? '7px' : '6px';
  svgTarget.appendChild(hitNumber);
  currentShots.push({
    shot: currentShotNumber,
    ring: ringNumber,
    direction: direction,
    x: cx,
    y: cy,
    hit: isHit,
    timestamp: Date.now(),
  });
  const placement = direction !== 'center' ? `, ${direction}` : '';
  const validText = !isValid ? ' (INVALID)' : '';
  statusMessage.textContent = `Schuss ${currentShotNumber} (Ring ${ringNumber}${placement}) registriert. ${isHit ? 'HIT!' : 'MISS!'}${validText}`;
  updateShotCounter();
  getAverageShot();
  if (currentShots.length === MAX_SHOTS) {
    saveHistory();
    if (correctionToggle.checked) {
      showCorrectionMarks();
    }
  }
};

function updateShotCounter() {
  if (shotCounterElement) {
    shotCounterElement.textContent = `Schüsse: ${currentShots.length} / ${MAX_SHOTS}`;
  }
}

window.finishSeries = function () {
  if (currentShots.length === 0) {
    statusMessage.textContent = 'Keine Schüsse vorhanden. Bitte mindestens einen Schuss abgeben.';
    return;
  }
  saveHistory();
  window.resetTarget();
};

window.resetTarget = function () {
  const hitMarks = svgTarget.querySelectorAll(
    '.hit-mark, .shot-number, .correction-mark, .correction-number'
  );
  hitMarks.forEach((mark) => mark.remove());
  currentShots = [];
  statusMessage.textContent =
    'Neue Serie gestartet. Sage deinen ersten Schuss oder klicke auf die Zielscheibe.';
  updateShotCounter();
  correctionToggle.checked = false;
  correctionVisible = false;
  if (toggleButton.disabled) {
    toggleButton.disabled = false;
  }
};

window.undoLastShot = function () {
  if (currentShots.length === 0) {
    statusMessage.textContent = 'Keine Schüsse zum Rückgängig machen.';
    return;
  }
  const lastShot = currentShots.pop();
  const allMarks = svgTarget.querySelectorAll('.hit-mark, .shot-number');
  if (allMarks.length >= 2) {
    allMarks[allMarks.length - 1].remove();
    allMarks[allMarks.length - 2].remove();
  }
  const correctionMarks = svgTarget.querySelectorAll('.correction-mark, .correction-number');
  correctionMarks.forEach((mark) => mark.remove());
  correctionVisible = false;
  correctionToggle.checked = false;
  statusMessage.textContent = `Schuss ${lastShot.shot} (Ring ${lastShot.ring}) undone.`;
  updateShotCounter();
  getAverageShot();
  console.log(`Schuss ${lastShot.shot} undone.`);
};

function isValidShot(ringNumber) {
  if (currentPosition === 'Liegend') {
    return ringNumber >= 8;
  } else if (currentPosition === 'Stehend') {
    return ringNumber >= 3;
  }
  return false;
}

function updateStatusMessage() {
  let positionText = currentPosition === 'Liegend' ? 'Liegend' : 'Stehend';
  let minRing = currentPosition === 'Liegend' ? '8' : '3';
  if (statusMessage) {
    statusMessage.textContent = `Position: ${positionText}.`;
  }
}

function toggleTranscriptionView() {
  const container = document.getElementById('transcription-container');
  const btn = document.getElementById('transcription-toggle-btn');

  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    btn.textContent = 'Sprachausgabe ausblenden ▲';
  } else {
    container.classList.add('hidden');
    btn.textContent = 'Sprachausgabe anzeigen ▼';
  }
}
