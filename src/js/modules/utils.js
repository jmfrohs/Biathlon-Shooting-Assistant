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

let currentAthleteName = '';

function convertNumberWords(text) {
  let modifiedText = text.toLowerCase();
  for (const word in NumberMap) {
    const regex = new RegExp('\\b' + word + '\\b', 'g');
    modifiedText = modifiedText.replace(regex, NumberMap[word]);
  }
  return modifiedText;
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getRingFromDistance(distance) {
  if (distance > MAX_RADIUS) return 0;
  for (let ring = 10; ring >= 1; ring--) {
    const maxRadiusForRing = (11 - ring) * RING_STEP;
    if (distance <= maxRadiusForRing) {
      return ring;
    }
  }
  return 0;
}

function getBiasedAngle(direction) {
  let targetAngle = 0;
  let angleRange = Math.PI / 4;
  switch (direction.toLowerCase()) {
    case 'hoch':
    case 'oben':
      targetAngle = Math.PI / 2;
      angleRange = Math.PI / 4;
      break;
    case 'tief':
    case 'unten':
      targetAngle = (3 * Math.PI) / 2;
      angleRange = Math.PI / 4;
      break;
    case 'links':
      targetAngle = Math.PI;
      angleRange = Math.PI / 4;
      break;
    case 'rechts':
      targetAngle = 0;
      angleRange = Math.PI / 4;
      break;
    case 'hoch rechts':
    case 'rechts hoch':
    case 'oben rechts':
    case 'rechts oben':
      targetAngle = Math.PI / 4;
      angleRange = Math.PI / 6;
      break;
    case 'hoch links':
    case 'links hoch':
    case 'oben links':
    case 'links oben':
      targetAngle = (3 * Math.PI) / 4;
      angleRange = Math.PI / 6;
      break;
    case 'tief links':
    case 'links tief':
    case 'unten links':
    case 'links unten':
      targetAngle = (5 * Math.PI) / 4;
      angleRange = Math.PI / 6;
      break;
    case 'tief rechts':
    case 'rechts tief':
    case 'unten rechts':
    case 'rechts unten':
      targetAngle = (7 * Math.PI) / 4;
      angleRange = Math.PI / 6;
      break;
    case 'zentrum':
    case 'mitte':
      angleRange = 2 * Math.PI;
      targetAngle = 0;
      radius = 0;
      break;
    default:
      angleRange = 2 * Math.PI;
      targetAngle = 0;
  }
  const minAngle = targetAngle - angleRange / 2;
  const maxAngle = targetAngle + angleRange / 2;
  let angle = getRandomArbitrary(minAngle, maxAngle);
  angle = angle % (2 * Math.PI);
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

function handleTextfieldInput(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    const inputText = targetElement.textContent.trim();
    if (!inputText) return;
    if (currentShots.length >= MAX_SHOTS) {
      statusMessage.textContent = 'Serie abgeschlossen. Starte eine neue Serie.';
      return;
    }
    let processedText = convertNumberWords(inputText);
    processedText = processedText.toLowerCase().trim();
    const detectedShots = [];
    const itemPattern = new RegExp(`${numberPattern}${directionPattern}`, 'gi');
    let match;
    while ((match = itemPattern.exec(processedText)) !== null) {
      if (currentShots.length + detectedShots.length >= MAX_SHOTS) break;
      let ringNumber = null;
      let direction = 'zentrum';
      const ringInput = match[1] || match[2];
      const directionInput = match[3];
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
        direction = directionInput.trim();
      }
      if (ringNumber !== null) {
        detectedShots.push({
          ring: ringNumber,
          direction: direction,
        });
      }
    }
    if (detectedShots.length > 0) {
      detectedShots.forEach((shot) => {
        if (currentShots.length < MAX_SHOTS) {
          window.addHit(shot.ring, shot.direction);
        }
      });
      targetElement.textContent = '';
    } else {
      statusMessage.textContent = 'Befehl nicht erkannt. Versuche es erneut.';
    }
  }
}

let touchStartX = 0;
let touchEndX = 0;

function initSwipeHandlers() {
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const target = e.target.closest('.swipe-item');

    if (target) {
      const swipeDistance = touchStartX - touchEndX;
      const minSwipeDistance = 50;

      if (swipeDistance > minSwipeDistance) {
        target.classList.add('swiped');
        if (!target.querySelector('.swipe-delete-btn')) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'swipe-delete-btn';
          deleteBtn.textContent = '🗑️';
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            handleSwipeDelete(target);
          };
          target.appendChild(deleteBtn);
        }
      } else if (swipeDistance < -minSwipeDistance) {
        target.classList.remove('swiped');
        target.querySelector('.swipe-delete-btn')?.remove();
      }
    }
  });
}

function handleSwipeDelete(element) {
  const sessionIndex = element.dataset.sessionIndex;
  const athleteIndex = element.dataset.athleteIndex;
  const seriesIndex = element.dataset.seriesIndex;

  if (sessionIndex !== undefined) {
    deleteSession(parseInt(sessionIndex));
  } else if (athleteIndex !== undefined) {
    removeGlobalAthlete(parseInt(athleteIndex));
  } else if (seriesIndex !== undefined) {
    deleteSeries(parseInt(seriesIndex));
  }
}

function getAverageShot() {
  const OUTLIER_THRESHOLD = 40;
  const MAX_ITERATIONS = 3;

  let validShots = [...currentShots];
  let outliers = [];
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    if (validShots.length === 0) break;

    const sumX = validShots.reduce((sum, shot) => sum + shot.x, 0);
    const sumY = validShots.reduce((sum, shot) => sum + shot.y, 0);
    const tempAvgX = sumX / validShots.length;
    const tempAvgY = sumY / validShots.length;

    const beforeCount = validShots.length;
    const newOutliers = [];

    validShots = validShots.filter((shot) => {
      const distance = Math.sqrt(Math.pow(shot.x - tempAvgX, 2) + Math.pow(shot.y - tempAvgY, 2));
      if (distance > OUTLIER_THRESHOLD) {
        newOutliers.push(shot);
        return false;
      }
      return true;
    });

    outliers = newOutliers;

    if (validShots.length === beforeCount) break;
    iteration++;
  }

  const sumX = validShots.length > 0 ? validShots.reduce((sum, shot) => sum + shot.x, 0) : 0;
  const sumY = validShots.length > 0 ? validShots.reduce((sum, shot) => sum + shot.y, 0) : 0;

  avgX = validShots.length > 0 ? sumX / validShots.length : 100;
  avgY = validShots.length > 0 ? sumY / validShots.length : 100;

  const centerX = 100;
  const centerY = 100;
  const deviationX = avgX - centerX;
  const deviationY = centerY - avgY;
  corrH = deviationX / CORRECTION_UNIT;
  corrV = deviationY / CORRECTION_UNIT;

  let correctionMessage = 'Korrektur: ';

  // Warnung bei Ausreißern
  if (outliers.length > 0) {
    const outlierShots = outliers.map((s) => s.shot).join(', ');
  }

  if (Math.abs(corrH) >= 1.0) {
    const direction = corrH > 0 ? 'Rechts' : 'Links';
    correctionMessage += `${Math.round(Math.abs(corrH))} ${direction}`;
  } else {
    correctionMessage += 'OK';
  }
  correctionMessage += ' | ';
  if (Math.abs(corrV) >= 1.0) {
    const direction = corrV > 0 ? 'Hoch' : 'Tief';
    correctionMessage += `${Math.round(Math.abs(corrV))} ${direction}`;
  } else {
    correctionMessage += 'OK';
  }

  if (statusMessage) {
    statusMessage.textContent = correctionMessage;
  }
  return {
    avgX: avgX,
    avgY: avgY,
    corrH: corrH,
    corrV: corrV,
    validShotsCount: validShots.length,
    outliersCount: outliers.length,
  };
}

function showCorrectionMarks() {
  const OUTLIER_THRESHOLD = 30;
  let validShots = [...currentShots];
  let iteration = 0;
  const MAX_ITERATIONS = 3;

  while (iteration < MAX_ITERATIONS) {
    if (validShots.length === 0) break;

    const sumX = validShots.reduce((sum, shot) => sum + shot.x, 0);
    const sumY = validShots.reduce((sum, shot) => sum + shot.y, 0);
    const tempAvgX = sumX / validShots.length;
    const tempAvgY = sumY / validShots.length;

    const beforeCount = validShots.length;
    validShots = validShots.filter((shot) => {
      const distance = Math.sqrt(Math.pow(shot.x - tempAvgX, 2) + Math.pow(shot.y - tempAvgY, 2));
      return distance <= OUTLIER_THRESHOLD;
    });

    if (validShots.length === beforeCount) break;
    iteration++;
  }

  const correctionShiftX = avgX - 100;
  const correctionShiftY = avgY - 100;
  validShots.forEach((shot, index) => {
    const corrected_x = shot.x - correctionShiftX;
    const corrected_y = shot.y - correctionShiftY;
    const correctedCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    correctedCircle.setAttribute('cx', corrected_x);
    correctedCircle.setAttribute('cy', corrected_y);
    correctedCircle.setAttribute('r', 6);
    correctedCircle.setAttribute('class', 'correction-mark');
    correctedCircle.style.fill = '#0000ff';
    correctedCircle.style.opacity = '0.6';
    correctedCircle.style.stroke = '#ffffff';
    correctedCircle.style.strokeWidth = '1.5px';
    svgTarget.appendChild(correctedCircle);
    const correctedNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    correctedNumber.setAttribute('x', corrected_x);
    correctedNumber.setAttribute('y', corrected_y + 0.5);
    correctedNumber.textContent = shot.shot;
    correctedNumber.setAttribute('class', 'correction-number');
    correctedNumber.style.fill = 'white';
    correctedNumber.style.fontSize = '8px';
    correctedNumber.style.textAnchor = 'middle';
    correctedNumber.style.dominantBaseline = 'central';
    svgTarget.appendChild(correctedNumber);
  });
  if (statusMessage) {
    const adjH = Math.round((avgX - 100) / CORRECTION_UNIT); // Jeder Klick = 5 Punkte
    const adjV = Math.round((avgY - 100) / CORRECTION_UNIT);

    let corrMessage = 'Korrektur: ';
    if (Math.abs(corrH) >= 1.0) {
      const dir = corrH > 0 ? 'Rechts' : 'Links';
      corrMessage += `${Math.round(Math.abs(corrH))} ${dir}`;
    } else {
      corrMessage += 'OK';
    }
    corrMessage += ' | ';
    if (Math.abs(corrV) >= 1.0) {
      const dir = corrV > 0 ? 'Hoch' : 'Tief';
      corrMessage += `${Math.round(Math.abs(corrV))} ${dir}`;
    } else {
      corrMessage += 'OK';
    }

    corrMessage += ' | Verstellung: ';
    if (adjH !== 0) {
      const dir = adjH > 0 ? 'Rechts' : 'Links';
      corrMessage += `${Math.abs(adjH)} ${dir}`;
    } else {
      corrMessage += 'OK';
    }
    corrMessage += ' | ';
    if (adjV !== 0) {
      const dir = adjV > 0 ? 'Hoch' : 'Tief';
      corrMessage += `${Math.abs(adjV)} ${dir}`;
    } else {
      corrMessage += 'OK';
    }

    statusMessage.textContent = corrMessage;
  }
  correctionVisible = true;
}

function hideCorrectionMarks() {
  const oldCorrectionMarks = svgTarget.querySelectorAll('.correction-mark, .correction-number');
  oldCorrectionMarks.forEach((mark) => mark.remove());
  if (currentShots.length === MAX_SHOTS && !adjustmentVisible) {
    getAverageShot();
  }
  correctionVisible = false;
}

window.toggleCorrection = function () {
  if (correctionToggle && correctionToggle.checked) {
    showCorrectionMarks();
  } else {
    hideCorrectionMarks();
  }
};

window.toggleAdjustment = function () {
  const adjustmentToggle = document.getElementById('adjustment-toggle');

  // Nur aktivieren wenn mindestens 1 Schuss vorhanden ist
  if (currentShots.length === 0) {
    adjustmentToggle.checked = false;
    adjustmentVisible = false;
    hideCorrectionMarks();
    return;
  }

  adjustmentVisible = adjustmentToggle && adjustmentToggle.checked;

  if (adjustmentVisible) {
    // Pfeile eingeschaltet - zeige Korrektur-Marker
    avgX = 100;
    avgY = 100;
    showCorrectionMarks();
  } else {
    // Pfeile ausgeschaltet
    hideCorrectionMarks();
  }
};

function adjustCorrectionUp() {
  const adjustmentToggle = document.getElementById('adjustment-toggle');
  if (!adjustmentToggle.checked) {
    adjustmentToggle.checked = true;
    adjustmentVisible = true;
  }
  avgY += 10;
  hideCorrectionMarks();
  showCorrectionMarks();
}

function adjustCorrectionDown() {
  const adjustmentToggle = document.getElementById('adjustment-toggle');
  if (!adjustmentToggle.checked) {
    adjustmentToggle.checked = true;
    adjustmentVisible = true;
  }
  avgY -= 10;
  hideCorrectionMarks();
  showCorrectionMarks();
}

function adjustCorrectionLeft() {
  const adjustmentToggle = document.getElementById('adjustment-toggle');
  if (!adjustmentToggle.checked) {
    adjustmentToggle.checked = true;
    adjustmentVisible = true;
  }
  avgX += 10;
  hideCorrectionMarks();
  showCorrectionMarks();
}

function adjustCorrectionRight() {
  const adjustmentToggle = document.getElementById('adjustment-toggle');
  if (!adjustmentToggle.checked) {
    adjustmentToggle.checked = true;
    adjustmentVisible = true;
  }
  avgX -= 10;
  hideCorrectionMarks();
  showCorrectionMarks();
}
