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

function renderTrainerName() {
  const savedName = localStorage.getItem('b_trainer_name');
  if (savedName) {
    const display = document.getElementById('trainer-name-display');
    if (display) display.textContent = savedName;
    const input = document.getElementById('trainer-name');
    if (input) input.value = savedName;
  }
}

function openSessionModal() {
  document.getElementById('session-modal').classList.replace('hidden', 'flex');
  document.getElementById('s-datum').valueAsDate = new Date();
  renderAthleteCheckboxes();
  setSType('Training');
}

function openSettings() {
  document.getElementById('settings-modal').classList.replace('hidden', 'flex');
  renderGlobalAthletes();
  renderTrainerEmails();
  renderTrainerName();
  const savedName = localStorage.getItem('b_trainer_name') || '';
  document.getElementById('trainer-name').value = savedName;
  document.getElementById('auto-send-checkbox').checked =
    localStorage.getItem('b_auto_send_enabled') === 'true';
  document.getElementById('auto-send-checkbox').checked =
    localStorage.getItem('b_auto_send_enabled') === 'true';
  document.getElementById('api-public-key').value = EMAILJS_PUBLIC_KEY;
  document.getElementById('api-service-id').value = EMAILJS_SERVICE_ID;
  document.getElementById('api-template-id').value = EMAILJS_TEMPLATE_ID;

  // Render device type selector
  const deviceTypeSelect = document.getElementById('device-type');
  if (deviceTypeSelect) {
    deviceTypeSelect.value = getDeviceType();
  }

  // Render target selection
  const targetSelect = document.getElementById('target-selection');
  if (targetSelect) {
    targetSelect.value = getSelectedTarget();
  }
}

function closeModal(id) {
  document.getElementById(id).classList.replace('flex', 'hidden');
  if (id === 'session-modal') {
    document.getElementById('session-form').reset();
  } else if (id === 'settings-modal') {
    const trainerNameInput = document.getElementById('trainer-name');
    if (trainerNameInput && trainerNameInput.value.trim()) {
      localStorage.setItem('b_trainer_name', trainerNameInput.value.trim());
    }
    saveEmailSettings();
    renderTrainerName();
  }
}

function showToast(message, type = 'info') {
  const oldToast = document.getElementById('toast-notification');
  if (oldToast) oldToast.remove();
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  const bgColor =
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-indigo-600';
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-[9999] ${bgColor} text-white font-semibold transition-all`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showAthleteDetail(athleteName) {
  currentAthleteName = athleteName;
  const session = sessions[currentSessionIndex];
  document.getElementById('view-athletes').classList.add('hidden');
  document.getElementById('view-athlete-detail').classList.remove('hidden');
  document.getElementById('athlete-detail-name').textContent = athleteName;
  document.getElementById('athlete-detail-subtitle').textContent =
    `${session.ort} • ${new Date(session.datum).toLocaleDateString()}`;
  renderAthleteHistory();
}

function backToAthletes() {
  document.getElementById('view-athlete-detail').classList.add('hidden');
  document.getElementById('view-athletes').classList.remove('hidden');
}

function deleteAllSeriesForAthlete() {
  if (!currentAthleteName) return;

  const confirmed = confirm(
    `Bist du sicher? Dies wird alle Serien von ${currentAthleteName} löschen und kann nicht rückgängig gemacht werden.`
  );
  if (!confirmed) return;

  // Alle Serien für den aktuellen Athleten löschen
  const session = sessions[currentSessionIndex];
  if (session.history && session.history[currentAthleteName]) {
    delete session.history[currentAthleteName];
    saveSession();
    renderAthleteHistory();
    showToast(`Alle Serien von ${currentAthleteName} wurden gelöscht`, 'success');
  }
}

function getAthleteHistory() {
  if (!sessions[currentSessionIndex].history) {
    sessions[currentSessionIndex].history = {};
  }
  if (!sessions[currentSessionIndex].history[currentAthleteName]) {
    sessions[currentSessionIndex].history[currentAthleteName] = [];
  }
  return sessions[currentSessionIndex].history[currentAthleteName];
}

function renderAthleteHistory() {
  const history = getAthleteHistory();
  const list = document.getElementById('athlete-history-list');
  if (history.length === 0) {
    list.innerHTML =
      '<p class="text-center text-slate-500 py-10">Keine Serien vorhanden. Klicke auf "Neue Serie schießen" um zu starten.</p>';
    document.getElementById('stat-total-series').textContent = '0';
    document.getElementById('stat-hit-rate').textContent = '0%';
    document.getElementById('stat-avg-score').textContent = '0';
    document.getElementById('stat-best-score').textContent = '0';
    return;
  }

  const totalSeries = history.length;
  const totalShots = history.reduce((sum, s) => sum + s.shots.length, 0);
  const totalHits = history.reduce((sum, s) => sum + s.hits, 0);
  const hitRate = totalShots > 0 ? ((totalHits / totalShots) * 100).toFixed(1) : '0';
  const totalScore = history.reduce((sum, s) => sum + s.totalScore, 0);
  const avgScore = (totalScore / totalSeries).toFixed(1);
  document.getElementById('stat-total-series').textContent = totalSeries;
  document.getElementById('stat-hit-rate').textContent = `${hitRate}%`;
  document.getElementById('stat-avg-score').textContent = avgScore;
  document.getElementById('stat-best-score').textContent = totalShots;

  // Erstelle Gesamt-Scheibe mit allen Schüssen der Einheit
  const allSessionShots = history.flatMap((series) => series.shots);
  const sessionTargetContainer = document.createElement('div');
  sessionTargetContainer.className = 'mb-6 p-4 glass-card rounded-xl';

  let sessionContainerHTML = `
    <h3 class="text-lg font-bold mb-4 text-indigo-400">Alle Schüsse der Einheit (${allSessionShots.length} Schüsse)</h3>
  `;

  if (allSessionShots.length > 0) {
    const allShotsSvg = generateSessionTargetSvg(allSessionShots);
    const heatmapSvg = generateHeatmapTargetSvg(allSessionShots);
    sessionContainerHTML += `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="flex flex-col items-center">
          <h4 class="text-sm font-semibold text-slate-300 mb-2">Alle Schussplatzierungen</h4>
          <div class="w-full max-w-xs">
            <div id="session-all-shots-target">${allShotsSvg}</div>
          </div>
        </div>
        <div class="flex flex-col items-center">
          <h4 class="text-sm font-semibold text-slate-300 mb-2">Schussverteilung (Heatmap)</h4>
          <div class="w-full max-w-xs">
            <div id="session-all-shots-heatmap">${heatmapSvg}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    sessionContainerHTML += `
      <div class="flex justify-center max-w-md mx-auto">
        <div class="w-full max-w-xs" id="session-all-shots-target"></div>
      </div>
    `;
  }

  sessionTargetContainer.innerHTML = sessionContainerHTML;
  list.innerHTML = '';
  list.appendChild(sessionTargetContainer);

  // Container für Serien-Historie hinzufügen
  const seriesHistoryContainer = document.createElement('div');
  seriesHistoryContainer.id = 'series-history-container';
  seriesHistoryContainer.className = 'space-y-4';

  const seriesHistoryTitle = document.createElement('h3');
  seriesHistoryTitle.className = 'text-lg font-bold mt-6 mb-3 text-indigo-400';
  seriesHistoryTitle.textContent = 'Einzelne Serien';
  seriesHistoryContainer.appendChild(seriesHistoryTitle);

  list.appendChild(seriesHistoryContainer);

  const fragment = document.createDocumentFragment();
  const BATCH_SIZE = 10;
  let currentBatch = 0;
  const renderBatch = () => {
    const startIndex = currentBatch * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, history.length);
    for (let i = startIndex; i < endIndex; i++) {
      const series = history[i];
      const index = i;
      const resultColor =
        series.hits === 5 ? 'text-green-400' : series.hits > 0 ? 'text-yellow-400' : 'text-red-400';
      const positionText = series.position === 'Liegend' ? 'Liegend' : 'Stehend';
      const seriesDiv = document.createElement('div');
      seriesDiv.className = 'swipe-item glass-card p-5 rounded-xl';
      seriesDiv.dataset.seriesIndex = index;
      seriesDiv.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="text-lg font-bold ${resultColor}">
              ${series.hits}/5 Treffer
            </h3>
            <p class="text-sm text-slate-400">${series.timestamp}</p>
            <p class="text-sm text-slate-400 mt-1">Position: ${positionText}</p>
            <p class="text-sm text-slate-300 mt-2 font-semibold">${series.shootingTime || 0}s Schießzeit</p>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <div class="text-right">
              <div class="text-2xl font-bold text-indigo-400">${series.totalScore}</div>
              <div class="text-xs text-slate-400">Ringe</div>
            </div>
            <div class="flex gap-2">
              <button onclick="openEmailSelectionModal(${index})" class="p-1.5 hover:bg-indigo-900/50 text-indigo-400 rounded transition-all text-sm font-semibold" title="Email versenden">
                📧
              </button>
              <button onclick="if(confirm('Diese Serie wirklich löschen?')) { deleteSeries(${index}); }" class="p-1.5 hover:bg-red-900/50 text-red-400 rounded transition-all text-sm font-semibold" title="Serie löschen">
                🗑️
              </button>
            </div>
          </div>
        </div>
        <div class="mb-3 p-2 bg-slate-900/50 rounded text-xs text-slate-300">
          <div class="font-semibold mb-1">Korrektur (Rasten):</div>
          <div>H: ${Math.abs(Math.round(series.corrH || 0))}${Math.round(series.corrH || 0) > 0 ? ' rechts' : Math.round(series.corrH || 0) < 0 ? ' links' : ''} | V: ${Math.abs(Math.round(series.corrV || 0))}${Math.round(series.corrV || 0) > 0 ? ' hoch' : Math.round(series.corrV || 0) < 0 ? ' tief' : ''}</div>
        </div>
        <button onclick="toggleSeriesDetails(${index})" class="text-indigo-400 hover:text-indigo-300 text-sm">
          Details anzeigen
        </button>
        <div id="series-details-${index}" class="hidden mt-4">
          <div class="flex justify-between items-center mb-3 px-2">
            <h4 class="text-sm font-semibold text-slate-300">Scheibe mit Korrektur</h4>
            <div class="flex flex-col items-center">
              <label for="correction-toggle-${index}" class="text-xs font-semibold text-gray-400 mb-1">Korrektur</label>
              <label class="switch">
                <input type="checkbox" id="correction-toggle-${index}" class="accent-indigo-500">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="history-svg-container mx-auto cursor-pointer hover:opacity-80 transition-opacity" id="history-svg-${index}" onclick="openTargetFullscreen(${index})"></div>
          <div id="series-shots-${index}" class="grid grid-cols-5 gap-2 mt-3"></div>
          <button onclick="deleteSeries(${index})" class="w-full mt-3 p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition-all">
            Serie löschen
          </button>
        </div>
      `;
      seriesHistoryContainer.appendChild(seriesDiv);
    }
    currentBatch++;
    if (endIndex < history.length) {
      requestAnimationFrame(renderBatch);
    }
  };
  renderBatch();
}

function toggleSeriesDetails(index) {
  const detailsDiv = document.getElementById(`series-details-${index}`);
  const history = getAthleteHistory();
  if (detailsDiv.classList.contains('hidden')) {
    detailsDiv.classList.remove('hidden');
    const svgContainer = detailsDiv.querySelector('.history-svg-container');
    if (!svgContainer.innerHTML.trim()) {
      svgContainer.innerHTML = generateTargetSvg(history[index].shots);
    }
    const shotsGrid = document.getElementById(`series-shots-${index}`);
    if (!shotsGrid.innerHTML.trim()) {
      shotsGrid.innerHTML = history[index].shots
        .map((shot, shotIndex) => {
          let timingInfo = '';
          if (shotIndex > 0) {
            const prevShot = history[index].shots[shotIndex - 1];
            const timeDiffMs = shot.timestamp - prevShot.timestamp;
            const timeDiffSec = (timeDiffMs / 1000).toFixed(1);
            timingInfo = `<div class="text-xs text-slate-500">+${timeDiffSec}s</div>`;
          } else {
            timingInfo = `<div class="text-xs text-slate-500">Start</div>`;
          }
          return `
          <div class="text-center p-2 rounded ${shot.hit ? 'bg-green-900/30' : 'bg-red-900/30'}">
            <div class="text-lg font-bold">${shot.ring}</div>
            <div class="text-xs text-slate-400">Schuss ${shot.shot}</div>
            ${timingInfo}
          </div>
        `;
        })
        .join('');
    }
    const correctionToggleInDetails = document.getElementById(`correction-toggle-${index}`);
    if (correctionToggleInDetails && !correctionToggleInDetails.dataset.initialized) {
      correctionToggleInDetails.dataset.initialized = 'true';
      correctionToggleInDetails.checked = false;
      correctionToggleInDetails.addEventListener('change', function () {
        const svgContainer = document.getElementById(`history-svg-${index}`);
        if (!svgContainer) return;
        if (this.checked) {
          showSeriesCorrectionMarks(index);
        } else {
          hideSeriesCorrectionMarks(svgContainer);
        }
      });
    }
  } else {
    detailsDiv.classList.add('hidden');
    const svgContainer = detailsDiv.querySelector('.history-svg-container');
    if (svgContainer) {
      const correctionMarks = svgContainer.querySelectorAll('.correction-mark, .correction-number');
      correctionMarks.forEach((mark) => mark.remove());
    }
  }
}

function showSeriesCorrectionMarks(index) {
  const history = getAthleteHistory();
  const series = history[index];
  let shots = series.shots;
  const svgContainer = document.getElementById(`history-svg-${index}`);
  if (!svgContainer) return;
  const svg = svgContainer.querySelector('svg');
  if (!svg) return;

  const OUTLIER_THRESHOLD = 30;
  let validShots = [...shots];
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

  const sumX = validShots.reduce((sum, shot) => sum + shot.x, 0);
  const sumY = validShots.reduce((sum, shot) => sum + shot.y, 0);
  const avgX = validShots.length > 0 ? sumX / validShots.length : 100;
  const avgY = validShots.length > 0 ? sumY / validShots.length : 100;
  const centerX = 100;
  const centerY = 100;
  const correctionShiftX = avgX - centerX;
  const correctionShiftY = avgY - centerY;

  validShots.forEach((shot, shotIndex) => {
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
    svg.appendChild(correctedCircle);
    const correctedNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    correctedNumber.setAttribute('x', corrected_x);
    correctedNumber.setAttribute('y', corrected_y + 0.5);
    correctedNumber.textContent = shot.shot;
    correctedNumber.setAttribute('class', 'correction-number');
    correctedNumber.style.fill = 'white';
    correctedNumber.style.fontSize = '3px';
    correctedNumber.style.textAnchor = 'middle';
    correctedNumber.style.dominantBaseline = 'central';
    correctedNumber.style.pointerEvents = 'none';
    svg.appendChild(correctedNumber);
  });
}

function hideSeriesCorrectionMarks(svg) {
  const oldCorrectionMarks = svg.querySelectorAll('.correction-mark, .correction-number');
  oldCorrectionMarks.forEach((mark) => mark.remove());
}

function openTargetFullscreen(index) {
  const history = getAthleteHistory();
  const series = history[index];
  const fullscreenContainer = document.getElementById('fullscreen-target-container');
  fullscreenContainer.innerHTML = generateTargetSvg(series.shots);
  document.getElementById('target-fullscreen-modal').classList.replace('hidden', 'flex');
}

function deleteSeries(index) {
  if (confirm('Diese Serie wirklich löschen?')) {
    const history = getAthleteHistory();
    history.splice(index, 1);
    saveSessions();
    renderAthleteHistory();
  }
}

function openSessionSettings() {
  document.getElementById('session-settings-modal').classList.replace('hidden', 'flex');
  renderSessionAthleteSelect();
  renderSessionAthletes();
  renderSessionEmailSettings();
  renderSessionEmails();
}

function renderSessionAthleteSelect() {
  const session = sessions[currentSessionIndex];
  const select = document.getElementById('session-athlete-select');
  if (!select) return;
  select.innerHTML =
    `<option value="">-- Athlet auswählen --</option>` +
    globalAthletes
      .filter((name) => !session.athletes.includes(name))
      .map((name) => `<option value="${name}">${name}</option>`)
      .join('');
}

function renderSessionAthletes() {
  const session = sessions[currentSessionIndex];
  const list = document.getElementById('session-athletes-list');
  if (!list) return;
  list.innerHTML = session.athletes
    .map(
      (name, idx) => `
    <div class="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800">
      <span class="text-sm">${name}</span>
      <button onclick="removeSessionAthlete(${idx})" class="text-red-500 hover:text-red-400 text-sm font-semibold">Löschen</button>
    </div>
  `
    )
    .join('');
}

function addSessionAthlete() {
  const athleteName = document.getElementById('session-athlete-select').value;

  if (!athleteName) {
    showToast('Bitte einen Athleten auswählen', 'error');
    return;
  }

  const session = sessions[currentSessionIndex];
  if (!session.athletes.includes(athleteName)) {
    session.athletes.push(athleteName);
    saveSessions();
    document.getElementById('session-athlete-select').value = '';
    renderSessionAthleteSelect();
    renderSessionAthletes();
    showAthletesView(currentSessionIndex);
    showToast(`${athleteName} hinzugefügt`, 'success');
  }
}

function removeSessionAthlete(index) {
  const session = sessions[currentSessionIndex];
  const removedAthlete = session.athletes[index];
  session.athletes.splice(index, 1);
  saveSessions();
  renderSessionAthleteSelect();
  renderSessionAthletes();
  showAthletesView(currentSessionIndex);
  showToast(`${removedAthlete} entfernt`, 'success');
}

function renderSessionEmailSettings() {
  const session = sessions[currentSessionIndex];
  const checkbox = document.getElementById('session-auto-send-checkbox');
  if (checkbox) {
    checkbox.checked = session.autoSend === true;
  }
}

function saveSessionEmailSettings() {
  const session = sessions[currentSessionIndex];
  const checkbox = document.getElementById('session-auto-send-checkbox');
  session.autoSend = checkbox.checked;
  saveSessions();
  showToast('Einheits-Einstellungen gespeichert', 'success');
}

function renderSessionEmails() {
  const session = sessions[currentSessionIndex];
  if (!session.emails) session.emails = [];
  const list = document.getElementById('session-email-list');
  if (!list) return;
  if (session.emails.length === 0) {
    list.innerHTML = '<p class="text-center text-slate-500 text-sm py-2">Keine Email-Adressen</p>';
    return;
  }
  list.innerHTML = session.emails
    .map(
      (email, i) => `
    <div class="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800">
      <span class="text-sm">${email}</span>
      <button onclick="removeSessionEmail(${i})" class="text-red-500 hover:text-red-400 text-sm font-semibold">Löschen</button>
    </div>
  `
    )
    .join('');
}

function addSessionEmail() {
  const session = sessions[currentSessionIndex];
  if (!session.emails) session.emails = [];
  const input = document.getElementById('session-email-input');
  const email = input.value.trim();
  if (!email) return;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Ungültige Email-Adresse', 'error');
    return;
  }
  if (session.emails.includes(email)) {
    showToast('Email-Adresse bereits vorhanden', 'error');
    return;
  }
  session.emails.push(email);
  saveSessions();
  input.value = '';
  renderSessionEmails();
  showToast('Email-Adresse hinzugefügt', 'success');
}

function removeSessionEmail(index) {
  const session = sessions[currentSessionIndex];
  if (!session.emails) session.emails = [];
  session.emails.splice(index, 1);
  saveSessions();
  renderSessionEmails();
  showToast('Email-Adresse entfernt', 'success');
}

function openEmailSelectionModal(seriesIndex) {
  const history = getAthleteHistory();
  const series = history[seriesIndex];

  const session = sessions[currentSessionIndex];
  const sessionEmails = session.emails || [];
  const allEmails = [...new Set([...trainerEmails, ...sessionEmails])];

  if (allEmails.length === 0) {
    showToast('Keine Email-Adressen konfiguriert', 'error');
    return;
  }

  const list = document.getElementById('email-selection-list');
  list.innerHTML = allEmails
    .map(
      (email, i) => `
    <button onclick="sendSeriesEmail('${email}', ${seriesIndex})" class="w-full text-left p-3 bg-slate-900 hover:bg-indigo-600/30 rounded-lg border border-slate-700 hover:border-indigo-500 transition-all">
      <div class="font-semibold text-indigo-400">${email}</div>
      <div class="text-xs text-slate-400 mt-1">Klicken zum Versenden</div>
    </button>
  `
    )
    .join('');

  document.getElementById('email-selection-modal').classList.replace('hidden', 'flex');
}

function sendSeriesEmail(email, seriesIndex) {
  const history = getAthleteHistory();
  const series = history[seriesIndex];

  closeModal('email-selection-modal');

  showToast(`Sende Email an ${email}...`, 'info');

  // Nutze die gleiche Struktur wie der automatische Versand nach der Serie
  sendEmailWithSeries(series, [email]);
}

function saveApiKeys() {
  const publicKey = document.getElementById('api-public-key').value.trim();
  const serviceId = document.getElementById('api-service-id').value.trim();
  const templateId = document.getElementById('api-template-id').value.trim();

  if (!publicKey || !serviceId || !templateId) {
    showToast('Bitte alle API Keys eingeben', 'error');
    return;
  }

  localStorage.setItem('b_emailjs_public_key', publicKey);
  localStorage.setItem('b_emailjs_service_id', serviceId);
  localStorage.setItem('b_emailjs_template_id', templateId);

  EMAILJS_PUBLIC_KEY = publicKey;
  EMAILJS_SERVICE_ID = serviceId;
  EMAILJS_TEMPLATE_ID = templateId;

  showToast('API Keys gespeichert', 'success');
}

function resetApiKeysToDefault() {
  if (confirm('API Keys wirklich auf Standard zurücksetzen?')) {
    localStorage.removeItem('b_emailjs_public_key');
    localStorage.removeItem('b_emailjs_service_id');
    localStorage.removeItem('b_emailjs_template_id');

    EMAILJS_PUBLIC_KEY = EMAILJS_PUBLIC_KEY_DEFAULT;
    EMAILJS_SERVICE_ID = EMAILJS_SERVICE_ID_DEFAULT;
    EMAILJS_TEMPLATE_ID = EMAILJS_TEMPLATE_ID_DEFAULT;

    document.getElementById('api-public-key').value = EMAILJS_PUBLIC_KEY;
    document.getElementById('api-service-id').value = EMAILJS_SERVICE_ID;
    document.getElementById('api-template-id').value = EMAILJS_TEMPLATE_ID;

    showToast('API Keys auf Standard zurückgesetzt', 'success');
  }
}

// ========== HISTORY VIEWER FUNKTIONEN ==========

let currentHistoryAthleteIndex = null;
let currentHistoryFilters = { date: '', type: '' };

function openHistoryViewer() {
  document.getElementById('history-viewer-modal').classList.replace('hidden', 'flex');
  renderHistoryAthletes();
}

function filterHistoryByType() {
  const typeFilter = document.getElementById('history-filter-type').value;
  const list = document.getElementById('session-list');

  // Filtere Sessions nach Typ
  let filteredSessions = sessions;
  if (typeFilter) {
    filteredSessions = sessions.filter((s) => s.typ === typeFilter);
  }

  list.innerHTML = filteredSessions.length
    ? ''
    : '<p class="text-center text-slate-500 py-10">Keine Einheiten vorhanden.</p>';

  filteredSessions.forEach((s, displayIndex) => {
    // Finde den echten Index in der vollständigen Sessions Array
    const actualIndex = sessions.indexOf(s);

    const div = document.createElement('div');

    let bgColorStyle = 'rgba(79, 70, 229, 0.25)';
    let borderColorStyle = 'rgba(79, 70, 229, 0.5)';
    let badgeColor = 'bg-indigo-500/20 text-indigo-300';
    let emoji = '🎯';

    if (s.typ === 'Wettkampf') {
      bgColorStyle = 'rgba(239, 68, 68, 0.25)';
      borderColorStyle = 'rgba(239, 68, 68, 0.5)';
      badgeColor = 'bg-red-500/20 text-red-300';
      emoji = '🏆';
    } else if (s.typ === 'Anschießen') {
      bgColorStyle = 'rgba(34, 197, 94, 0.25)';
      borderColorStyle = 'rgba(34, 197, 94, 0.5)';
      badgeColor = 'bg-green-500/20 text-green-300';
      emoji = '🏹';
    }

    div.className = `swipe-item glass-card p-5 rounded-2xl flex justify-between items-center group cursor-pointer hover:border-opacity-100 transition-all`;
    div.style.backgroundColor = bgColorStyle;
    div.style.borderColor = borderColorStyle;
    div.style.borderWidth = '1px';
    div.style.borderStyle = 'solid';
    div.dataset.sessionIndex = actualIndex;
    div.onclick = () => showAthletesView(actualIndex);
    div.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="text-2xl">${emoji}</div>
        <div>
          <h3 class="font-bold text-lg">${s.ort} <span class="text-sm ml-2 px-2 py-1 rounded-full ${badgeColor} font-normal">${s.typ}</span></h3>
          <p class="text-xs text-slate-400">${new Date(s.datum).toLocaleDateString()} • ${s.athletes.length} Athlet(en) ${s.zusatz ? '• ' + s.zusatz : ''}</p>
        </div>
      </div>
      <button onclick="event.stopPropagation(); deleteSession(${actualIndex})" class="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all">🗑️</button>
    `;
    list.appendChild(div);
  });
}

function renderHistoryAthletes() {
  const athletesSets = new Set();

  // Sammle alle Athleten aus allen Sessions
  sessions.forEach((session) => {
    if (session.history) {
      Object.keys(session.history).forEach((athleteName) => {
        if (session.history[athleteName].length > 0) {
          athletesSets.add(athleteName);
        }
      });
    }
  });

  const athletes = Array.from(athletesSets).sort();
  const list = document.getElementById('history-athletes-list');

  if (athletes.length === 0) {
    list.innerHTML =
      '<p class="text-center text-slate-500 py-10">Keine Athleten mit Serien vorhanden.</p>';
    return;
  }

  list.innerHTML = athletes
    .map((athleteName, index) => {
      let totalSeries = 0;
      let totalShots = 0;
      sessions.forEach((session) => {
        if (session.history && session.history[athleteName]) {
          const series = session.history[athleteName];
          totalSeries += series.length;
          totalShots += series.reduce((sum, s) => sum + s.shots.length, 0);
        }
      });

      return `
      <button onclick="openHistoryDetail(${index})" class="text-left p-4 glass-card rounded-xl hover:bg-slate-700/50 transition-all border border-slate-700 hover:border-indigo-500">
        <h3 class="text-lg font-bold text-indigo-400">${athleteName}</h3>
        <p class="text-sm text-slate-400 mt-1">${totalSeries} Serien • ${totalShots} Schüsse</p>
      </button>
    `;
    })
    .join('');
}

function getTotalSeriesCountForAthlete(athleteName) {
  let count = 0;
  sessions.forEach((session) => {
    if (session.history && session.history[athleteName]) {
      count += session.history[athleteName].length;
    }
  });
  return count;
}

function openHistoryDetail(athleteIndex) {
  const athletesSets = new Set();
  sessions.forEach((session) => {
    if (session.history) {
      Object.keys(session.history).forEach((athleteName) => {
        if (session.history[athleteName].length > 0) {
          athletesSets.add(athleteName);
        }
      });
    }
  });
  const athletes = Array.from(athletesSets).sort();
  const athleteName = athletes[athleteIndex];

  currentHistoryAthleteIndex = athleteIndex;
  currentHistoryFilters = { date: '', type: '' };

  document.getElementById('history-viewer-modal').classList.add('hidden');
  document.getElementById('history-detail-modal').classList.replace('hidden', 'flex');
  document.getElementById('history-detail-athlete-name').textContent = athleteName;

  renderHistoryDetailView(athleteName);
}

function renderHistoryDetailView(athleteName) {
  // Sammle alle Serien für diesen Athleten aus allen Sessions
  let allSeries = [];
  sessions.forEach((session) => {
    if (session.history && session.history[athleteName]) {
      session.history[athleteName].forEach((series) => {
        allSeries.push({
          ...series,
          sessionInfo: {
            ort: session.ort,
            datum: session.datum,
            typ: session.typ || 'Training',
          },
        });
      });
    }
  });

  // Berechne Statistiken
  const totalSeries = allSeries.length;
  const totalShots = allSeries.reduce((sum, s) => sum + s.shots.length, 0);
  const totalHits = allSeries.reduce((sum, s) => sum + s.hits, 0);
  const hitRate = totalShots > 0 ? ((totalHits / totalShots) * 100).toFixed(1) : '0';
  const totalScore = allSeries.reduce((sum, s) => sum + s.totalScore, 0);
  const avgScore = totalSeries > 0 ? (totalScore / totalSeries).toFixed(1) : '0';

  document.getElementById('history-stat-total-series').textContent = totalSeries;
  document.getElementById('history-stat-hit-rate').textContent = `${hitRate}%`;
  document.getElementById('history-stat-avg-score').textContent = avgScore;
  document.getElementById('history-stat-total-shots').textContent = totalShots;

  document.getElementById('history-detail-stats').textContent =
    `${totalSeries} Serie${totalSeries !== 1 ? 'n' : ''} • ${totalShots} Schüsse • ${hitRate}% Trefferquote`;

  renderHistorySeries(allSeries);
}

function renderHistorySeries(seriesArray) {
  const list = document.getElementById('history-series-list');

  if (seriesArray.length === 0) {
    list.innerHTML = '<p class="text-center text-slate-500 py-10">Keine Serien vorhanden.</p>';
    return;
  }

  // Erstelle zuerst die Gesamt-Scheibe mit Heatmap
  const allAthleteShots = seriesArray.flatMap((series) => series.shots);
  let listHTML = '';

  if (allAthleteShots.length > 0) {
    const allShotsSvg = generateSessionTargetSvg(allAthleteShots);
    const heatmapSvg = generateHeatmapTargetSvg(allAthleteShots);
    listHTML += `
      <div class="glass-card p-4 rounded-lg border border-slate-700 mb-6">
        <h3 class="text-lg font-bold mb-4 text-indigo-400">Alle Schüsse (${allAthleteShots.length} Schüsse)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex flex-col items-center">
            <h4 class="text-sm font-semibold text-slate-300 mb-2">Alle Schussplatzierungen</h4>
            <div class="w-full max-w-xs">
              ${allShotsSvg}
            </div>
          </div>
          <div class="flex flex-col items-center">
            <h4 class="text-sm font-semibold text-slate-300 mb-2">Schussverteilung (Heatmap)</h4>
            <div class="w-full max-w-xs">
              ${heatmapSvg}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Füge dann die einzelnen Serien hinzu
  listHTML += seriesArray
    .map((series, index) => {
      const resultColor =
        series.hits === 5 ? 'text-green-400' : series.hits > 0 ? 'text-yellow-400' : 'text-red-400';
      const positionText = series.position === 'Liegend' ? 'Liegend' : 'Stehend';
      const sessionInfo = series.sessionInfo;
      const svgId = `history-series-svg-${index}`;
      const detailsId = `history-series-details-${index}`;
      const correctionToggleId = `history-series-correction-${index}`;

      return `
      <div class="glass-card p-4 rounded-lg border border-slate-700">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-bold ${resultColor}">${series.hits}/5 Treffer</h3>
            <p class="text-sm text-slate-400 mt-1">${series.timestamp}</p>
            <div class="text-xs text-slate-400 mt-2 space-y-1">
              <p><strong>Ort:</strong> ${sessionInfo.ort}</p>
              <p><strong>Datum:</strong> ${new Date(sessionInfo.datum).toLocaleDateString('de-DE')}</p>
              <p><strong>Typ:</strong> ${sessionInfo.typ}</p>
              <p><strong>Position:</strong> ${positionText}</p>
              <p><strong>Schießzeit:</strong> ${series.shootingTime || 0}s</p>
            </div>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <div class="text-right">
              <div class="text-2xl font-bold text-indigo-400">${series.totalScore}</div>
              <div class="text-xs text-slate-400">Ringe</div>
            </div>
            <div class="p-2 bg-slate-900/50 rounded text-xs text-slate-300">
              <div class="font-semibold">Korrektur:</div>
              <div>H: ${Math.abs(Math.round(series.corrH || 0))}${Math.round(series.corrH || 0) > 0 ? ' R' : Math.round(series.corrH || 0) < 0 ? ' L' : ''} | V: ${Math.abs(Math.round(series.corrV || 0))}${Math.round(series.corrV || 0) > 0 ? ' H' : Math.round(series.corrV || 0) < 0 ? ' T' : ''}</div>
            </div>
          </div>
        </div>
        
        <button onclick="toggleHistorySeriesDetails(${index})" class="text-indigo-400 hover:text-indigo-300 text-sm mt-3">
          Details anzeigen
        </button>
        
        <div id="${detailsId}" class="hidden mt-4 space-y-4">
          <div class="flex justify-between items-center p-3 bg-slate-900/50 rounded">
            <h4 class="text-sm font-semibold text-slate-300">Scheibe mit Korrektur</h4>
            <div class="flex flex-col items-center">
              <label for="${correctionToggleId}" class="text-xs font-semibold text-gray-400 mb-1">Korrektur</label>
              <label class="switch">
                <input type="checkbox" id="${correctionToggleId}" class="accent-indigo-500">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          
          <div class="history-svg-container mx-auto cursor-pointer hover:opacity-80 transition-opacity rounded-lg overflow-hidden" id="${svgId}" style="width: 250px; height: 250px;"></div>
          
          <div id="series-shots-${index}" class="grid grid-cols-5 gap-2"></div>
        </div>
      </div>
    `;
    })
    .join('');

  list.innerHTML = listHTML;
}

function toggleHistorySeriesDetails(index) {
  const detailsId = `history-series-details-${index}`;
  const detailsDiv = document.getElementById(detailsId);

  if (detailsDiv.classList.contains('hidden')) {
    detailsDiv.classList.remove('hidden');
    initializeHistorySeriesDetails(index);
  } else {
    detailsDiv.classList.add('hidden');
  }
}

function initializeHistorySeriesDetails(index) {
  const svgId = `history-series-svg-${index}`;
  const correctionToggleId = `history-series-correction-${index}`;
  const svgContainer = document.getElementById(svgId);
  const shotsGrid = document.getElementById(`series-shots-${index}`);
  const correctionToggle = document.getElementById(correctionToggleId);

  // Finde die Serie aus den gefilterten Serien
  const athletesSets = new Set();
  sessions.forEach((session) => {
    if (session.history) {
      Object.keys(session.history).forEach((athleteName) => {
        if (session.history[athleteName].length > 0) {
          athletesSets.add(athleteName);
        }
      });
    }
  });
  const athletes = Array.from(athletesSets).sort();
  const athleteName = athletes[currentHistoryAthleteIndex];

  let allSeries = [];
  sessions.forEach((session) => {
    if (session.history && session.history[athleteName]) {
      session.history[athleteName].forEach((series) => {
        allSeries.push({
          ...series,
          sessionInfo: {
            ort: session.ort,
            datum: session.datum,
            typ: session.typ || 'Training',
          },
        });
      });
    }
  });

  if (currentHistoryFilters.date) {
    const filterDate = new Date(currentHistoryFilters.date).toDateString();
    allSeries = allSeries.filter((series) => {
      const seriesDate = new Date(series.sessionInfo.datum).toDateString();
      return seriesDate === filterDate;
    });
  }

  if (currentHistoryFilters.type) {
    allSeries = allSeries.filter((series) => series.sessionInfo.typ === currentHistoryFilters.type);
  }

  const series = allSeries[index];

  if (svgContainer && !svgContainer.innerHTML.trim()) {
    svgContainer.innerHTML = generateTargetSvg(series.shots);
    // Klick-Handler zum Vergrößern
    svgContainer.addEventListener('click', function () {
      openHistoryTargetFullscreen(series);
    });
  }

  if (shotsGrid && !shotsGrid.innerHTML.trim()) {
    shotsGrid.innerHTML = series.shots
      .map((shot, shotIndex) => {
        let timingInfo = '';
        if (shotIndex > 0) {
          const prevShot = series.shots[shotIndex - 1];
          const timeDiffMs = shot.timestamp - prevShot.timestamp;
          const timeDiffSec = (timeDiffMs / 1000).toFixed(1);
          timingInfo = `<div class="text-xs text-slate-500">+${timeDiffSec}s</div>`;
        } else {
          timingInfo = `<div class="text-xs text-slate-500">Start</div>`;
        }
        return `
        <div class="text-center p-2 rounded ${shot.hit ? 'bg-green-900/30' : 'bg-red-900/30'}">
          <div class="text-lg font-bold">${shot.ring}</div>
          <div class="text-xs text-slate-400">Schuss ${shot.shot}</div>
          ${timingInfo}
        </div>
      `;
      })
      .join('');
  }

  if (correctionToggle && !correctionToggle.dataset.initialized) {
    correctionToggle.dataset.initialized = 'true';
    correctionToggle.checked = false;
    correctionToggle.addEventListener('change', function () {
      const svg = svgContainer.querySelector('svg');
      if (!svg) return;
      if (this.checked) {
        showHistorySeriesCorrectionMarks(series, svg);
      } else {
        hideHistorySeriesCorrectionMarks(svg);
      }
    });
  }
}

function showHistorySeriesCorrectionMarks(series, svg) {
  let shots = series.shots;

  const OUTLIER_THRESHOLD = 30;
  let validShots = [...shots];
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

  const sumX = validShots.reduce((sum, shot) => sum + shot.x, 0);
  const sumY = validShots.reduce((sum, shot) => sum + shot.y, 0);
  const avgX = validShots.length > 0 ? sumX / validShots.length : 100;
  const avgY = validShots.length > 0 ? sumY / validShots.length : 100;
  const centerX = 100;
  const centerY = 100;
  const correctionShiftX = avgX - centerX;
  const correctionShiftY = avgY - centerY;

  validShots.forEach((shot) => {
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
    svg.appendChild(correctedCircle);

    const correctedNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    correctedNumber.setAttribute('x', corrected_x);
    correctedNumber.setAttribute('y', corrected_y + 0.5);
    correctedNumber.textContent = shot.shot;
    correctedNumber.setAttribute('class', 'correction-number');
    correctedNumber.style.fill = 'white';
    correctedNumber.style.fontSize = '3px';
    correctedNumber.style.textAnchor = 'middle';
    correctedNumber.style.dominantBaseline = 'central';
    correctedNumber.style.pointerEvents = 'none';
    svg.appendChild(correctedNumber);
  });
}

function hideHistorySeriesCorrectionMarks(svg) {
  const oldCorrectionMarks = svg.querySelectorAll('.correction-mark, .correction-number');
  oldCorrectionMarks.forEach((mark) => mark.remove());
}

function openHistoryTargetFullscreen(series) {
  const fullscreenContainer = document.getElementById('fullscreen-target-container');
  if (fullscreenContainer) {
    fullscreenContainer.innerHTML = generateTargetSvg(series.shots);
    document.getElementById('target-fullscreen-modal').classList.replace('hidden', 'flex');
  }
}

function filterHistorySeries() {
  const athletesSets = new Set();
  sessions.forEach((session) => {
    if (session.history) {
      Object.keys(session.history).forEach((athleteName) => {
        if (session.history[athleteName].length > 0) {
          athletesSets.add(athleteName);
        }
      });
    }
  });
  const athletes = Array.from(athletesSets).sort();
  const athleteName = athletes[currentHistoryAthleteIndex];

  const dateFilter = document.getElementById('history-filter-date').value;
  const typeFilter = document.getElementById('history-filter-type').value;

  currentHistoryFilters = { date: dateFilter, type: typeFilter };

  let allSeries = [];
  sessions.forEach((session) => {
    if (session.history && session.history[athleteName]) {
      session.history[athleteName].forEach((series) => {
        allSeries.push({
          ...series,
          sessionInfo: {
            ort: session.ort,
            datum: session.datum,
            typ: session.typ || 'Training',
          },
        });
      });
    }
  });

  if (dateFilter) {
    const filterDate = new Date(dateFilter).toDateString();
    allSeries = allSeries.filter((series) => {
      const seriesDate = new Date(series.sessionInfo.datum).toDateString();
      return seriesDate === filterDate;
    });
  }

  if (typeFilter) {
    allSeries = allSeries.filter((series) => series.sessionInfo.typ === typeFilter);
  }

  renderHistorySeries(allSeries);
}

function backToHistoryAthletes() {
  document.getElementById('history-detail-modal').classList.add('hidden');
  document.getElementById('history-viewer-modal').classList.replace('hidden', 'flex');
  currentHistoryAthleteIndex = null;
}

function filterAthleteHistory() {
  const typeFilter = document.getElementById('athlete-filter-type').value;
  const history = getAthleteHistory();
  let filteredHistory = history;

  if (typeFilter) {
    filteredHistory = history.filter((series) => {
      if (!series.sessionInfo) return true;
      return series.sessionInfo.typ === typeFilter;
    });
  }

  const list = document.getElementById('athlete-history-list');
  if (filteredHistory.length === 0) {
    list.innerHTML =
      '<p class="text-center text-slate-500 py-10">Keine Serien mit diesem Filter vorhanden.</p>';
    return;
  }

  const totalSeries = filteredHistory.length;
  const totalShots = filteredHistory.reduce((sum, s) => sum + s.shots.length, 0);
  const totalHits = filteredHistory.reduce((sum, s) => sum + s.hits, 0);
  const hitRate = totalShots > 0 ? ((totalHits / totalShots) * 100).toFixed(1) : '0';
  const totalScore = filteredHistory.reduce((sum, s) => sum + s.totalScore, 0);
  const avgScore = (totalScore / totalSeries).toFixed(1);
  document.getElementById('stat-total-series').textContent = totalSeries;
  document.getElementById('stat-hit-rate').textContent = `${hitRate}%`;
  document.getElementById('stat-avg-score').textContent = avgScore;
  document.getElementById('stat-best-score').textContent = totalShots;

  const fragment = document.createDocumentFragment();
  list.innerHTML = '';
  const BATCH_SIZE = 10;
  let currentBatch = 0;
  const renderBatch = () => {
    const startIndex = currentBatch * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, filteredHistory.length);
    for (let i = startIndex; i < endIndex; i++) {
      const series = filteredHistory[i];
      const index = history.indexOf(series);
      const resultColor =
        series.hits === 5 ? 'text-green-400' : series.hits > 0 ? 'text-yellow-400' : 'text-red-400';
      const positionText = series.position === 'Liegend' ? 'Liegend' : 'Stehend';
      const seriesDiv = document.createElement('div');
      seriesDiv.className = 'swipe-item glass-card p-5 rounded-xl';
      seriesDiv.dataset.seriesIndex = index;
      seriesDiv.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="text-lg font-bold ${resultColor}">
              ${series.hits}/5 Treffer
            </h3>
            <p class="text-sm text-slate-400">${series.timestamp}</p>
            <p class="text-sm text-slate-400 mt-1">Position: ${positionText}</p>
            <p class="text-sm text-slate-300 mt-2 font-semibold">${series.shootingTime || 0}s Schießzeit</p>
            <p class="text-sm text-slate-400 mt-1">Typ: ${series.sessionInfo?.typ || 'Training'}</p>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <div class="text-right">
              <div class="text-2xl font-bold text-indigo-400">${series.totalScore}</div>
              <div class="text-xs text-slate-400">Ringe</div>
            </div>
            <div class="flex gap-2">
              <button onclick="openEmailSelectionModal(${index})" class="p-1.5 hover:bg-indigo-900/50 text-indigo-400 rounded transition-all text-sm font-semibold" title="Email versenden">
                📧
              </button>
              <button onclick="openTargetFullscreen(${index})" class="p-1.5 hover:bg-indigo-900/50 text-indigo-400 rounded transition-all text-sm font-semibold" title="Vollbild anzeigen">
                🔍
              </button>
              <button onclick="deleteSeries(${index})" class="p-1.5 hover:bg-red-900/50 text-red-400 rounded transition-all text-sm font-semibold" title="Löschen">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
      fragment.appendChild(seriesDiv);
    }

    currentBatch++;
    if (endIndex < filteredHistory.length) {
      setTimeout(renderBatch, 0);
    } else {
      initSwipeHandlers();
    }
  };

  renderBatch();
}

function saveDeviceType() {
  const deviceTypeSelect = document.getElementById('device-type');
  if (deviceTypeSelect) {
    const selectedType = deviceTypeSelect.value;
    setDeviceType(selectedType);
    applyDeviceTypeStyles(getEffectiveDeviceType());
    showToast(`Gerätetyp auf ${getDeviceTypeLabel(selectedType)} gesetzt`, 'success');
  }
}

function saveTargetSelection() {
  const targetSelect = document.getElementById('target-selection');
  if (targetSelect) {
    const selectedTarget = targetSelect.value;
    setSelectedTarget(selectedTarget);
    const targetName = selectedTarget === 'scheibe2' ? 'Scheibe 2' : 'Scheibe 1';
    showToast(`Schießscheibe auf ${targetName} gesetzt`, 'success');
  }
}

function getDeviceTypeLabel(type) {
  const labels = {
    auto: 'Automatisch erkennen',
    phone: 'Smartphone',
    tablet: 'Tablet',
    pc: 'Computer/PC',
  };
  return labels[type] || type;
}

function applyDeviceTypeStyles(effectiveType) {
  const root = document.documentElement;

  switch (effectiveType) {
    case 'phone':
      // Smartphone optimiert: Größere Touch-Ziele, höher gestapelt
      root.style.setProperty('--touch-target-size', '48px');
      root.style.setProperty('--padding-dense', '8px');
      root.style.setProperty('--font-size-large', '18px');
      document.body.classList.remove('device-tablet', 'device-pc');
      document.body.classList.add('device-phone');
      break;

    case 'tablet':
      // Tablet optimiert: Mittelgroße Touch-Ziele, zweispaltig möglich
      root.style.setProperty('--touch-target-size', '44px');
      root.style.setProperty('--padding-dense', '12px');
      root.style.setProperty('--font-size-large', '16px');
      document.body.classList.remove('device-phone', 'device-pc');
      document.body.classList.add('device-tablet');
      break;

    case 'pc':
      // PC optimiert: Kleinere Interface-Elemente, Maus-friendly
      root.style.setProperty('--touch-target-size', '40px');
      root.style.setProperty('--padding-dense', '10px');
      root.style.setProperty('--font-size-large', '14px');
      document.body.classList.remove('device-phone', 'device-tablet');
      document.body.classList.add('device-pc');
      break;
  }
}

// Initialize device type styles on page load
function initializeDeviceType() {
  applyDeviceTypeStyles(getEffectiveDeviceType());
}
