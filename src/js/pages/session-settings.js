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
 * Session Settings Logic
 */

let currentSession = null;
let allAthletes = [];
let selectedAthleteIds = new Set();
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = parseInt(urlParams.get('id'));
  if (!sessionId) {
    window.location.href = 'index.html';
    return;
  }

  await loadSessionData(sessionId);
  setupEventListeners(sessionId);
});

async function loadSessionData(sessionId) {
  try {
    const [session, athletes] = await Promise.all([
      apiService.getSession(sessionId),
      apiService.getAthletes(),
    ]);
    currentSession = session;
    allAthletes = athletes || [];
  } catch (e) {
    window.location.href = 'index.html';
    return;
  }

  if (!currentSession) {
    window.location.href = 'index.html';
    return;
  }

  const subtitleAndName = document.getElementById('subtitleAndName');
  if (subtitleAndName) {
    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    const dateStr = new Date(currentSession.date).toLocaleDateString(
      lang === 'de' ? 'de-DE' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
    subtitleAndName.textContent = `${currentSession.name} • ${dateStr}`;
  }

  let localSettings = null;
  try {
    localSettings = JSON.parse(localStorage.getItem('b_session_settings_' + sessionId) || 'null');
  } catch (e) {
    /* ignore */
  }

  const apiSettings = currentSession.settings || {};
  const settings = {
    email: apiSettings.email ?? false,
    detailed: apiSettings.detailed ?? false,
    autoSave:
      localSettings?.autoSave !== undefined
        ? localSettings.autoSave
        : (apiSettings.autoSave ?? null),
  };
  currentSession.settings = settings;

  document.getElementById('emailReporting').checked = settings.email;

  const detailedStatsEl = document.getElementById('detailedStats');
  if (detailedStatsEl) {
    detailedStatsEl.checked = settings.detailed;
  }

  selectedAthleteIds = new Set(currentSession.athletes || []);
  renderAthletesList();
  renderSharingState();
  renderSessionRecipients(settings.email);
  setupAutoSaveControls();
}

function setupEventListeners(sessionId) {
  document.getElementById('backBtn').onclick = () => {
    window.location.href = `session-detail.html?id=${sessionId}`;
  };
  const toggles = ['emailReporting', 'detailedStats'];
  toggles.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.onchange = (e) => {
        saveSettings();
        if (id === 'emailReporting') renderSessionRecipients(e.target.checked);
      };
    }
  });
  document.getElementById('addAthletesBtn').onclick = () => openAthletesModal();
  document.getElementById('closeAthletesModal').onclick = () => closeAthletesModal();
  document.getElementById('confirmAthletesBtn').onclick = () => confirmAthletes();

  setupIntensityControls();
  setupAutoSaveControls();
  setupAthletesToggle();
  setupExportControls(sessionId);

  document.getElementById('deleteSessionBtn').onclick = async () => {
    if (confirm(t('delete_session_confirm'))) {
      try {
        await apiService.deleteSession(sessionId);
      } catch (e) {
        alert('Error while deleting session.');
        return;
      }
      window.location.href = 'index.html';
    }
  };
  setupSharingControls(sessionId);
}

function setupIntensityControls() {
  const toggleBtn = document.getElementById('intensity-toggle-btn');
  const optionsDiv = document.getElementById('intensity-options');
  const listDiv = document.getElementById('intensity-list');
  const chevron = document.getElementById('intensity-chevron');

  if (!toggleBtn || !optionsDiv || !listDiv || typeof INTENSITY_LEVELS === 'undefined') return;

  toggleBtn.onclick = () => {
    const isOpen = !optionsDiv.classList.contains('hidden');
    if (isOpen) {
      optionsDiv.classList.add('hidden');
      chevron.style.transform = 'rotate(0deg)';
    } else {
      optionsDiv.classList.remove('hidden');
      chevron.style.transform = 'rotate(180deg)';
    }
  };

  listDiv.innerHTML = INTENSITY_LEVELS.map((level) => {
    const cfg = INTENSITY_CONFIG[level] || INTENSITY_CONFIG['Ruhe'];
    const isSelected = (currentSession?.intensity || 'Ruhe') === level;
    return `
      <button
        class="w-full p-3 flex items-center gap-3 border-b border-subtle/20 last:border-b-0 hover:bg-white/5 transition-colors text-left intensity-option-btn"
        data-intensity="${level}"
        style="${isSelected ? 'background-color: rgba(255,255,255,0.05);' : ''}"
      >
        <div
          class="w-3 h-3 rounded-full flex-shrink-0"
          style="background-color: ${cfg.border}"
        ></div>
        <span class="text-sm font-medium text-off-white">${level}</span>
        ${isSelected ? '<span class="material-symbols-outlined text-primary text-lg ml-auto">check</span>' : ''}
      </button>
    `;
  }).join('');

  listDiv.querySelectorAll('.intensity-option-btn').forEach((btn) => {
    btn.onclick = () => {
      const level = btn.dataset.intensity;
      currentSession.intensity = level;
      updateIntensityDisplay();
      saveSettings();
      setupIntensityControls();
    };
  });

  updateIntensityDisplay();
}

function renderAthletesList() {
  const list = document.getElementById('athletesConfigList');
  const countLabel = document.getElementById('athleteCountLabel');
  if (!list) return;
  const participants = allAthletes.filter((a) => selectedAthleteIds.has(a.id));

  if (countLabel) {
    countLabel.textContent = `${participants.length} ${participants.length === 1 ? t('athlete') || 'athlete' : t('athletes') || 'athletes'}`;
  }

  if (participants.length === 0) {
    list.innerHTML = `<p class="text-xs text-light-blue-info/50 italic px-1">${t('no_athletes_selected')}</p>`;
    return;
  }
  list.innerHTML = participants
    .map((athlete) => {
      const initials = athlete.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return `
            <div class="bg-white/5 border border-subtle/30 rounded-xl p-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <span class="text-primary font-bold text-xs uppercase">${initials}</span>
                    </div>
                    <div>
                        <h3 class="font-bold text-sm">${athlete.name}</h3>
                        <p class="text-[10px] text-light-blue-info/70 uppercase font-black">${athlete.ageGroup || t('no_group')}</p>
                    </div>
                </div>
                <button onclick="removeAthlete(${athlete.id})" class="p-2 text-red-500/50 hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
        `;
    })
    .join('');
}

function setupAthletesToggle() {
  const toggleBtn = document.getElementById('athletes-toggle-btn');
  const optionsDiv = document.getElementById('athletes-options');
  const chevron = document.getElementById('athletes-chevron');

  if (!toggleBtn || !optionsDiv || !chevron) return;

  toggleBtn.onclick = () => {
    const isOpen = !optionsDiv.classList.contains('hidden');
    if (isOpen) {
      optionsDiv.classList.add('hidden');
      chevron.style.transform = 'rotate(0deg)';
    } else {
      optionsDiv.classList.remove('hidden');
      chevron.style.transform = 'rotate(180deg)';
    }
  };
}

function removeAthlete(id) {
  selectedAthleteIds.delete(id);
  saveAthletesToSession();
  renderAthletesList();
}

function openAthletesModal() {
  const modal = document.getElementById('athletesModal');
  const list = document.getElementById('athletesSelectList');
  modal.classList.remove('hidden');
  list.innerHTML = allAthletes
    .map((athlete) => {
      const isSelected = selectedAthleteIds.has(athlete.id);
      const initials = athlete.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return `
            <div onclick="toggleAthleteSelection(${athlete.id}, this)"
                 class="athlete-select-item p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-primary/10 border-primary' : 'bg-white/5 border-subtle'}"
                 data-id="${athlete.id}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span class="text-primary font-bold text-xs">${initials}</span>
                    </div>
                    <span class="font-bold text-sm">${athlete.name}</span>
                </div>
                <span class="material-symbols-outlined ${isSelected ? 'text-primary' : 'text-transparent'}">check_circle</span>
            </div>
        `;
    })
    .join('');
}

function toggleAthleteSelection(id, el) {
  if (selectedAthleteIds.has(id)) {
    selectedAthleteIds.delete(id);
    el.className =
      'athlete-select-item p-4 rounded-2xl border border-subtle bg-white/5 transition-all flex items-center justify-between cursor-pointer';
    el.querySelector('.material-symbols-outlined').classList.replace(
      'text-primary',
      'text-transparent'
    );
  } else {
    selectedAthleteIds.add(id);
    el.className =
      'athlete-select-item p-4 rounded-2xl border border-primary bg-primary/10 transition-all flex items-center justify-between cursor-pointer';
    el.querySelector('.material-symbols-outlined').classList.replace(
      'text-transparent',
      'text-primary'
    );
  }
}

function confirmAthletes() {
  saveAthletesToSession();
  closeAthletesModal();
  renderAthletesList();
}

function closeAthletesModal() {
  document.getElementById('athletesModal').classList.add('hidden');
}

function saveSettings() {
  const emailEl = document.getElementById('emailReporting');
  const detailedEl = document.getElementById('detailedStats');
  const email = emailEl ? emailEl.checked : false;
  const detailed = detailedEl ? detailedEl.checked : false;
  const autoSave = currentSession.settings?.autoSave ?? null;
  currentSession.settings = { email, detailed, autoSave };
  updateSessionInStorage();
}

function saveAthletesToSession() {
  currentSession.athletes = Array.from(selectedAthleteIds);
  updateSessionInStorage();
}

async function updateSessionInStorage() {
  try {
    if (currentSession.settings) {
      localStorage.setItem(
        'b_session_settings_' + currentSession.id,
        JSON.stringify(currentSession.settings)
      );
    }
    await apiService.updateSession(currentSession.id, currentSession);
  } catch (e) {
    console.error('Fehler beim Speichern:', e);
  }
}

function renderSessionRecipients(emailEnabled) {
  const panel = document.getElementById('email-recipients-info');
  if (!panel) return;

  if (!emailEnabled) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');

  const list = document.getElementById('session-recipient-list');
  const fallback = document.getElementById('session-recipient-fallback');
  if (!list) return;

  const perSession = currentSession?.settings?.selectedRecipients || [];

  if (perSession.length === 0) {
    list.innerHTML = '';
    let globals = [];
    try {
      globals = JSON.parse(localStorage.getItem('trainerEmails') || '[]');
    } catch {
      globals = [];
    }

    if (globals.length === 0) {
      if (fallback) {
        fallback.textContent = t('no_recipients_in_settings') || 'Keine Empfänger konfiguriert';
        fallback.classList.remove('hidden');
      }
    } else {
      list.innerHTML = globals
        .map(
          (e) => `
          <div class="bg-card-dark border border-subtle rounded-2xl p-3 flex items-center justify-between opacity-60">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-light-blue-info/50 text-base">mail</span>
              <span class="text-xs text-off-white/70">${e}</span>
            </div>
            <span class="text-[9px] uppercase tracking-widest text-light-blue-info/40 font-bold">Global</span>
          </div>`
        )
        .join('');
      if (fallback) fallback.classList.add('hidden');
    }
  } else {
    if (fallback) fallback.classList.add('hidden');
    list.innerHTML = perSession
      .map(
        (e, i) => `
        <div class="bg-card-dark border border-subtle rounded-2xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-base">mail</span>
            <span class="text-xs text-off-white">${e}</span>
          </div>
          <button onclick="removeSessionRecipient(${i})" class="p-1 text-red-500/50 hover:text-red-500">
            <span class="material-symbols-outlined text-base">remove_circle</span>
          </button>
        </div>`
      )
      .join('');
  }
}

function openAddRecipientModal() {
  const modal = document.getElementById('addRecipientModal');
  const input = document.getElementById('new-session-recipient-email');
  if (!modal || !input) return;
  input.value = '';
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 50);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') confirmAddRecipient();
  };
}

function closeAddRecipientModal() {
  document.getElementById('addRecipientModal')?.classList.add('hidden');
}

function confirmAddRecipient() {
  const input = document.getElementById('new-session-recipient-email');
  const email = input?.value?.trim() || '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return;

  if (!currentSession.settings) currentSession.settings = {};
  if (!Array.isArray(currentSession.settings.selectedRecipients)) {
    currentSession.settings.selectedRecipients = [];
  }

  if (!currentSession.settings.selectedRecipients.includes(email)) {
    currentSession.settings.selectedRecipients.push(email);
    updateSessionInStorage();
  }

  closeAddRecipientModal();
  renderSessionRecipients(true);
}

function removeSessionRecipient(index) {
  if (!currentSession?.settings?.selectedRecipients) return;
  currentSession.settings.selectedRecipients.splice(index, 1);
  updateSessionInStorage();
  renderSessionRecipients(true);
}

function renderSharingState() {
  const badge = document.getElementById('shareCodeBadge');
  const label = document.getElementById('shareStatusLabel');
  const btnIcon = document.querySelector('#btn-toggle-share span');

  if (!badge || !label) return;

  if (currentSession.shareCode) {
    badge.textContent = currentSession.shareCode;
    badge.classList.remove('hidden');
    label.textContent = t('sharing_active') || 'Sharing active';
    if (btnIcon) btnIcon.textContent = 'link_off';
  } else {
    badge.classList.add('hidden');
    label.textContent = t('sharing_inactive') || 'Invite partner';
    if (btnIcon) btnIcon.textContent = 'share';
  }
}

function setupSharingControls(sessionId) {
  const btn = document.getElementById('btn-toggle-share');
  if (!btn) return;

  btn.onclick = async () => {
    try {
      if (currentSession.shareCode) {
        if (!confirm(t('confirm_stop_sharing') || 'Stop sharing?')) return;
        await apiService.unshareSession(sessionId);
        currentSession.shareCode = null;
      } else {
        const res = await apiService.shareSession(sessionId);
        currentSession.shareCode = res.shareCode;
      }

      renderSharingState();
    } catch (err) {
      console.error('Sharing error:', err);
      alert('Error while changing share status.');
    }
  };
}

function updateIntensityDisplay() {
  const display = document.getElementById('intensity-display-settings');
  const dot = document.getElementById('intensity-dot-settings');
  const label = document.getElementById('intensity-label-settings');
  if (!display || typeof INTENSITY_CONFIG === 'undefined') return;

  const intensity = currentSession?.intensity || 'Ruhe';
  const cfg = INTENSITY_CONFIG[intensity] || INTENSITY_CONFIG['Ruhe'];

  display.style.backgroundColor = cfg.bg;
  display.style.borderColor = cfg.border;
  display.style.color = cfg.text;
  if (dot) dot.style.backgroundColor = cfg.border;
  if (label) label.textContent = intensity;
}

function setupAutoSaveControls() {
  const segment = document.getElementById('autoSaveSegment');
  if (!segment) return;

  const currentValue =
    currentSession?.settings?.autoSave !== undefined ? currentSession.settings.autoSave : null;

  segment.querySelectorAll('.auto-save-seg-btn').forEach((btn) => {
    const btnValue = btn.getAttribute('data-value');
    const btnValueParsed = btnValue === 'null' ? null : btnValue === 'true';

    const isSelected =
      (btnValue === 'null' && currentValue === null) ||
      (btnValue === 'true' && currentValue === true) ||
      (btnValue === 'false' && currentValue === false);

    btn.onclick = () => {
      if (!currentSession.settings) {
        currentSession.settings = {};
      }
      currentSession.settings.autoSave = btnValueParsed;
      updateSessionInStorage();
      setupAutoSaveControls();
    };

    btn.classList.remove(
      'bg-primary/20',
      'text-primary',
      'border',
      'border-primary',
      'text-zinc-500'
    );

    if (isSelected) {
      btn.classList.add('bg-primary/20', 'text-primary', 'border', 'border-primary');
    } else {
      btn.classList.add('text-zinc-500');
    }
  });
}

function setupExportControls(sessionId) {
  const pdfBtn = document.getElementById('exportPdfBtn');
  const excelBtn = document.getElementById('exportExcelBtn');

  if (pdfBtn) {
    pdfBtn.onclick = async () => {
      try {
        await exportSessionPDF(sessionId);
      } catch (e) {
        console.error('PDF export error:', e);
        alert('Error exporting PDF');
      }
    };
  }

  if (excelBtn) {
    excelBtn.onclick = async () => {
      try {
        await exportSessionExcel(sessionId);
      } catch (e) {
        console.error('Excel export error:', e);
        alert('Error exporting Excel');
      }
    };
  }
}

async function exportSessionPDF(sessionId) {
  try {
    const { jsPDF } = window;
    if (!jsPDF) {
      alert('PDF library not loaded');
      return;
    }

    const doc = new jsPDF();
    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    const dateStr = new Date(currentSession.date).toLocaleDateString(
      lang === 'de' ? 'de-DE' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );

    doc.setFontSize(16);
    doc.text(`${currentSession.name}`, 10, 10);
    doc.setFontSize(11);
    doc.text(`${dateStr}`, 10, 20);

    const athleteNames =
      selectedAthleteIds.size > 0
        ? Array.from(selectedAthleteIds)
            .map((id) => allAthletes.find((a) => a.id === id)?.name || 'Unknown')
            .join(', ')
        : 'No athletes';
    doc.setFontSize(10);
    doc.text(`Athletes: ${athleteNames}`, 10, 28);

    const series = currentSession.series || [];
    if (series.length > 0 && doc.autoTable) {
      const tableData = series.slice(0, 10).map((s) => [
        {
          content: allAthletes.find((a) => a.id === s.athleteId)?.name || 'Neutral',
          styles: { cellWidth: 40 },
        },
        s.shots?.length || 0,
        s.shots?.reduce((acc, sh) => acc + (sh.value || 0), 0) || 0,
      ]);

      doc.autoTable({
        head: [['Athlete', 'Shots', 'Score']],
        body: tableData,
        startY: 35,
      });
    }

    doc.save(`${currentSession.name}.pdf`);
  } catch (e) {
    console.error('PDF export error:', e);
    throw e;
  }
}

async function exportSessionExcel(sessionId) {
  try {
    if (!window.XLSX) {
      alert('Excel library not loaded');
      return;
    }

    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    const dateStr = new Date(currentSession.date).toLocaleDateString(
      lang === 'de' ? 'de-DE' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );

    const series = currentSession.series || [];
    const seriesData = series.slice(0, 50).map((s) => [
      {
        content: allAthletes.find((a) => a.id === s.athleteId)?.name || 'Neutral',
        styles: { width: 40 },
      },
      s.type || '',
      s.shots?.length || 0,
      s.shots?.reduce((acc, sh) => acc + (sh.value || 0), 0) || 0,
    ]);

    const wsData = [
      [currentSession.name],
      ['Date', dateStr],
      ['Intensity', currentSession.intensity || 'N/A'],
      [],
      ['Athlete', 'Type', 'Shots', 'Score'],
      ...seriesData,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Session');
    XLSX.writeFile(wb, `${currentSession.name}.xlsx`);
  } catch (e) {
    console.error('Excel export error:', e);
    throw e;
  }
}
