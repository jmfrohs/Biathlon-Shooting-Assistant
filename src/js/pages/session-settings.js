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
let selectedAthleteIds = [];
let athleteDragState = null;

function getDefaultAmmunitionTypes() {
  return [
    { name: 'Lapua Polar Biathlon', manufacturer: 'Lapua' },
    { name: 'Lapua Biathlon Xtreme', manufacturer: 'Lapua' },
    { name: 'RWS Biathlon Competition', manufacturer: 'RWS' },
    { name: 'RWS Biathlon Special Match', manufacturer: 'RWS' },
    { name: 'SK Biathlon Sport', manufacturer: 'SK' },
  ];
}

function getConfiguredAmmunitionTypes() {
  try {
    const parsed = JSON.parse(localStorage.getItem('b_ammunition_types') || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to parse ammunition types:', error);
  }
  return getDefaultAmmunitionTypes();
}

function getGlobalSelectedAmmunitionType() {
  try {
    const parsed = JSON.parse(localStorage.getItem('b_selected_ammunition_type') || 'null');
    return parsed && parsed.name ? parsed : null;
  } catch (error) {
    console.error('Failed to parse selected ammunition type:', error);
    return null;
  }
}

function formatAmmunitionTypeLabel(type) {
  if (!type || !type.name) return 'Keine Auswahl';
  return `${type.name} - ${type.manufacturer || ''}`.trim();
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = parseInt(urlParams.get('id'));
  if (!sessionId) {
    window.location.href = 'index.html';
    return;
  }

  sessionTrainingTemplatesPage = new SessionTrainingTemplatesPage();
  sessionAmmunitionTypesPage = new SessionAmmunitionTypesPage();
  await loadSessionData(sessionId);
  setupEventListeners(sessionId);
});

async function loadSessionData(sessionId) {
  let session = null;
  let athletes = [];

  try {
    session = await apiService.getSession(sessionId);
  } catch (e) {
    window.location.href = 'index.html';
    return;
  }

  try {
    athletes = await apiService.getAthletes();
  } catch (e) {
    athletes = [];
  }

  currentSession = session;
  currentSession.intensity = normalizeIntensityLevel(currentSession?.intensity || 'Ruhe');
  allAthletes =
    (Array.isArray(athletes) && athletes.length > 0
      ? athletes
      : Array.isArray(session?.athleteData)
        ? session.athleteData
        : []) || [];

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
  const globalSelectedAmmunition = getGlobalSelectedAmmunitionType();
  const settings = {
    email: apiSettings.email ?? false,
    detailed: apiSettings.detailed ?? false,
    autoSave:
      localSettings?.autoSave !== undefined
        ? localSettings.autoSave
        : (apiSettings.autoSave ?? null),
    trainingTemplateId: apiSettings.trainingTemplateId ?? localSettings?.trainingTemplateId ?? null,
    ammunitionType:
      apiSettings.ammunitionType ??
      localSettings?.ammunitionType ??
      globalSelectedAmmunition ??
      null,
  };
  currentSession.settings = settings;

  document.getElementById('emailReporting').checked = settings.email;

  const detailedStatsEl = document.getElementById('detailedStats');
  if (detailedStatsEl) {
    detailedStatsEl.checked = settings.detailed;
  }

  selectedAthleteIds = Array.isArray(currentSession.athletes) ? [...currentSession.athletes] : [];
  renderAthletesList();
  renderSharingState();
  renderSessionRecipients(settings.email);
  setupAutoSaveControls();
  renderTrainingTemplateSection();
  renderAmmunitionTypeSection();
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
    const isSelected = normalizeIntensityLevel(currentSession?.intensity || 'Ruhe') === level;
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
      currentSession.intensity = normalizeIntensityLevel(level);
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
  const selectedIds = new Set(selectedAthleteIds);
  const participants = selectedAthleteIds
    .map((id) => allAthletes.find((athlete) => athlete.id === id))
    .filter(Boolean);

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
  selectedAthleteIds = selectedAthleteIds.filter((athleteId) => athleteId !== id);
  saveAthletesToSession();
  renderAthletesList();
}

function openAthletesModal() {
  const modal = document.getElementById('athletesModal');
  const list = document.getElementById('athletesSelectList');
  if (!modal || !list) return;
  modal.classList.remove('hidden');
  renderAthletesSelectList();
}

function toggleAthleteSelection(id) {
  const existingIndex = selectedAthleteIds.indexOf(id);
  if (existingIndex !== -1) {
    selectedAthleteIds.splice(existingIndex, 1);
  } else {
    selectedAthleteIds.push(id);
  }
  renderAthletesSelectList();
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
  const prevSettings = currentSession.settings || {};
  currentSession.settings = {
    ...prevSettings,
    email,
    detailed,
  };
  updateSessionInStorage();
}

function saveAthletesToSession() {
  currentSession.athletes = [...selectedAthleteIds];
  updateSessionInStorage();
}

function renderAthletesSelectList() {
  const list = document.getElementById('athletesSelectList');
  if (!list) return;

  if (allAthletes.length === 0) {
    list.innerHTML = `<p class="text-xs text-light-blue-info/50 italic px-1">${t('no_athletes_selected') || 'No athletes selected'}</p>`;
    return;
  }

  const selectedIds = new Set(selectedAthleteIds);
  const selectedAthletes = selectedAthleteIds
    .map((id) => allAthletes.find((athlete) => athlete.id === id))
    .filter(Boolean);
  const unselectedAthletes = allAthletes.filter((athlete) => !selectedIds.has(athlete.id));

  list.innerHTML = [...selectedAthletes, ...unselectedAthletes]
    .map((athlete) => renderAthleteSelectItem(athlete, selectedIds.has(athlete.id)))
    .join('');

  list.querySelectorAll('[data-drag-handle="true"]').forEach((handle) => {
    handle.onpointerdown = startAthleteDrag;
  });
}

function renderAthleteSelectItem(athlete, isSelected) {
  const initials = athlete.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const dragHandle = isSelected
    ? `
      <button type="button"
              class="drag-handle w-10 h-10 flex items-center justify-center rounded-xl bg-primary/15 text-primary touch-none active:cursor-grabbing shrink-0"
              data-drag-handle="true"
              aria-label="${t('drag_to_reorder') || 'Drag to reorder'}">
        <span class="material-symbols-outlined text-[20px]">drag_indicator</span>
      </button>
    `
    : '';

  return `
    <div class="athlete-select-item p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-primary/10 border-primary' : 'bg-white/5 border-subtle'}" data-selected-athlete="${isSelected ? athlete.id : ''}" onclick="toggleAthleteSelection(${athlete.id})">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        ${dragHandle}
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span class="text-primary font-bold text-xs">${initials}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-sm text-off-white truncate">${athlete.name}</p>
          <p class="text-[10px] text-light-blue-info/70 uppercase font-black">${athlete.ageGroup || t('no_group')}</p>
        </div>
      </div>
      <span class="material-symbols-outlined ${isSelected ? 'text-primary' : 'text-transparent'}">check_circle</span>
    </div>
  `;
}

function startAthleteDrag(event) {
  const handle = event.target.closest('[data-drag-handle]');
  if (!handle) return;

  const card = handle.closest('[data-selected-athlete]');
  const list = document.getElementById('athletesSelectList');
  if (!card || !list) return;

  const athleteId = parseInt(card.dataset.selectedAthlete, 10);
  if (Number.isNaN(athleteId)) return;

  athleteDragState = {
    pointerId: event.pointerId,
    card,
    list,
    athleteId,
    handle,
  };
  handle.setPointerCapture?.(event.pointerId);
  card.classList.add('opacity-60', 'scale-[0.98]');

  document.addEventListener('pointermove', handleAthleteDragMove);
  document.addEventListener('pointerup', endAthleteDrag);
  document.addEventListener('pointercancel', endAthleteDrag);
  event.preventDefault();
}

function handleAthleteDragMove(event) {
  if (!athleteDragState || event.pointerId !== athleteDragState.pointerId) return;

  const { card, list, athleteId } = athleteDragState;
  const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
  const targetCard = elementUnderPointer?.closest?.('[data-selected-athlete]');

  if (!targetCard || targetCard === card || !list.contains(targetCard)) return;

  const targetId = parseInt(targetCard.dataset.selectedAthlete, 10);
  if (Number.isNaN(targetId)) return;

  const targetRect = targetCard.getBoundingClientRect();
  const insertAfter = event.clientY > targetRect.top + targetRect.height / 2;
  const nodes = Array.from(list.querySelectorAll('[data-selected-athlete]'));
  const targetIndex = nodes.indexOf(targetCard);
  const cardIndex = nodes.indexOf(card);
  if (targetIndex === -1 || cardIndex === -1) return;

  if (targetId !== athleteId) {
    const fromIndex = selectedAthleteIds.indexOf(athleteId);
    const toIndex = selectedAthleteIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    selectedAthleteIds.splice(fromIndex, 1);
    const adjustedTargetIndex = selectedAthleteIds.indexOf(targetId);
    const insertIndex = insertAfter ? adjustedTargetIndex + 1 : adjustedTargetIndex;
    selectedAthleteIds.splice(insertIndex, 0, athleteId);
    renderAthletesSelectList();
  }
}

function endAthleteDrag(event) {
  if (!athleteDragState || event.pointerId !== athleteDragState.pointerId) return;

  athleteDragState.card.classList.remove('opacity-60', 'scale-[0.98]');
  athleteDragState.handle.releasePointerCapture?.(event.pointerId);
  document.removeEventListener('pointermove', handleAthleteDragMove);
  document.removeEventListener('pointerup', endAthleteDrag);
  document.removeEventListener('pointercancel', endAthleteDrag);
  athleteDragState = null;
  saveAthletesToSession();
  renderAthletesList();
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

function getSessionRecipientEntries() {
  if (!currentSession.settings) currentSession.settings = {};

  const existingEntries = currentSession.settings.recipientEntries;
  if (Array.isArray(existingEntries) && existingEntries.length > 0) {
    const normalizedEntries = existingEntries
      .map((entry) => {
        if (!entry || typeof entry.email !== 'string') return null;
        return {
          email: entry.email.trim().toLowerCase(),
          enabled: entry.enabled !== false,
        };
      })
      .filter(Boolean);

    const deduped = [];
    const seen = new Set();
    normalizedEntries.forEach((entry) => {
      if (!entry.email || seen.has(entry.email)) return;
      seen.add(entry.email);
      deduped.push(entry);
    });
    return deduped;
  }

  const selected = Array.isArray(currentSession.settings.selectedRecipients)
    ? currentSession.settings.selectedRecipients
    : [];

  return selected
    .map((email) => (typeof email === 'string' ? email.trim().toLowerCase() : ''))
    .filter(Boolean)
    .map((email) => ({ email, enabled: true }));
}

function setSessionRecipientEntries(entries) {
  if (!currentSession.settings) currentSession.settings = {};

  const normalized = (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      if (!entry || typeof entry.email !== 'string') return null;
      return {
        email: entry.email.trim().toLowerCase(),
        enabled: entry.enabled !== false,
      };
    })
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  normalized.forEach((entry) => {
    if (!entry.email || seen.has(entry.email)) return;
    seen.add(entry.email);
    deduped.push(entry);
  });

  currentSession.settings.recipientEntries = deduped;
  currentSession.settings.selectedRecipients = deduped
    .filter((entry) => entry.enabled)
    .map((entry) => entry.email);
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

  const perSessionEntries = getSessionRecipientEntries();

  if (perSessionEntries.length === 0) {
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
    list.innerHTML = perSessionEntries
      .map(
        (entry, i) => `
        <div class="bg-card-dark border border-subtle rounded-2xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-base">mail</span>
            <span class="text-xs ${entry.enabled ? 'text-off-white' : 'text-off-white/45 line-through'}">${entry.email}</span>
          </div>
          <div class="flex items-center gap-2">
            <label class="session-switch" title="Aktiv/Inaktiv">
              <input
                type="checkbox"
                ${entry.enabled ? 'checked' : ''}
                onchange="toggleSessionRecipient(${i}, this.checked)"
              />
              <span class="session-switch-ui" aria-hidden="true"></span>
            </label>
            <button onclick="removeSessionRecipient(${i})" class="p-1 text-red-500/50 hover:text-red-500 transition-colors">
              <span class="material-symbols-outlined text-base">remove_circle</span>
            </button>
          </div>
        </div>`
      )
      .join('');
  }
}

function openAddRecipientModal() {
  const modal = document.getElementById('addRecipientModal');
  const input = document.getElementById('new-session-recipient-email');
  const validation = document.getElementById('addRecipientValidation');
  const confirmBtn = document.getElementById('confirmAddRecipientBtn');
  if (!modal || !input) return;
  input.value = '';
  input.classList.remove('invalid', 'valid');
  if (validation) {
    validation.classList.add('hidden');
    validation.textContent = '';
  }
  if (confirmBtn) confirmBtn.disabled = false;
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 50);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') confirmAddRecipient();
  };
}

function closeAddRecipientModal() {
  document.getElementById('addRecipientModal')?.classList.add('hidden');
}

function setRecipientValidation(message = '', type = 'error') {
  const validation = document.getElementById('addRecipientValidation');
  const input = document.getElementById('new-session-recipient-email');
  if (!validation || !input) return;

  input.classList.remove('invalid', 'valid');
  if (!message) {
    validation.textContent = '';
    validation.classList.add('hidden');
    return;
  }

  validation.textContent = message;
  validation.classList.remove('hidden');
  if (type === 'success') {
    input.classList.add('valid');
    validation.classList.remove('text-red-400');
    validation.classList.add('text-neon-green');
  } else {
    input.classList.add('invalid');
    validation.classList.remove('text-neon-green');
    validation.classList.add('text-red-400');
  }
}

function confirmAddRecipient() {
  const input = document.getElementById('new-session-recipient-email');
  const email = (input?.value?.trim() || '').toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    setRecipientValidation(t('email_required') || 'Please enter an email address.');
    return;
  }

  if (!emailRegex.test(email)) {
    setRecipientValidation(t('invalid_email') || 'Please enter a valid email address.');
    return;
  }

  const entries = getSessionRecipientEntries();

  if (entries.some((entry) => entry.email === email)) {
    setRecipientValidation(t('recipient_already_added') || 'This email is already in the list.');
    return;
  }

  entries.push({ email, enabled: true });
  setSessionRecipientEntries(entries);
  updateSessionInStorage();

  setRecipientValidation(t('recipient_added') || 'Recipient added.', 'success');

  setTimeout(() => {
    closeAddRecipientModal();
    renderSessionRecipients(true);
  }, 200);
}

function removeSessionRecipient(index) {
  const entries = getSessionRecipientEntries();
  if (!entries[index]) return;
  entries.splice(index, 1);
  setSessionRecipientEntries(entries);
  updateSessionInStorage();
  renderSessionRecipients(true);
}

function toggleSessionRecipient(index, enabled) {
  const entries = getSessionRecipientEntries();
  if (!entries[index]) return;
  entries[index].enabled = !!enabled;
  setSessionRecipientEntries(entries);
  updateSessionInStorage();
  renderSessionRecipients(true);
}

function renderSharingState() {
  const badge = document.getElementById('shareCodeBadge');
  const label = document.getElementById('shareStatusLabel');
  const btnIcon = document.querySelector('#btn-toggle-share span');
  const copyRow = document.getElementById('shareCopyRow');
  const copyHint = document.getElementById('shareCopyHint');

  if (!badge || !label) return;

  if (currentSession.shareCode) {
    badge.textContent = currentSession.shareCode;
    badge.classList.remove('hidden');
    if (copyRow) copyRow.classList.remove('hidden');
    label.textContent = t('sharing_active') || 'Sharing active';
    if (btnIcon) btnIcon.textContent = 'link_off';
    if (copyHint) {
      copyHint.textContent = t('copy_share_link') || 'Copy share link';
    }
  } else {
    badge.classList.add('hidden');
    if (copyRow) copyRow.classList.add('hidden');
    label.textContent = t('sharing_inactive') || 'Invite partner';
    if (btnIcon) btnIcon.textContent = 'share';
  }
}

function setCopyShareUiState(state = 'idle', message = '') {
  const copyBtn = document.getElementById('btn-copy-share-link');
  const copyIcon = document.getElementById('copyShareIcon');
  const copyLabel = document.getElementById('copyShareLabel');
  const status = document.getElementById('shareCopyStatus');

  if (copyBtn) {
    copyBtn.disabled = state === 'loading';
  }

  if (copyIcon) {
    if (state === 'loading') copyIcon.textContent = 'progress_activity';
    else if (state === 'success') copyIcon.textContent = 'check_circle';
    else if (state === 'error') copyIcon.textContent = 'error';
    else copyIcon.textContent = 'content_copy';
  }

  if (copyLabel) {
    if (state === 'loading') copyLabel.textContent = t('copying') || 'Copying...';
    else if (state === 'success') copyLabel.textContent = t('copied') || 'Copied';
    else copyLabel.textContent = t('copy_share_link') || 'Copy link';
  }

  if (status) {
    status.classList.remove('hidden', 'success', 'error');
    if (state === 'success') {
      status.textContent = message || t('share_link_copied') || 'Share link copied.';
      status.classList.add('success');
    } else if (state === 'error') {
      status.textContent = message || t('share_link_copy_failed') || 'Copy failed.';
      status.classList.add('error');
    } else {
      status.textContent = '';
      status.classList.add('hidden');
    }
  }

  if (state === 'success' || state === 'error') {
    setTimeout(() => {
      setCopyShareUiState('idle');
    }, 1800);
  }
}

function setupSharingControls(sessionId) {
  const btn = document.getElementById('btn-toggle-share');
  const copyBtn = document.getElementById('btn-copy-share-link');
  if (!btn) return;

  btn.onclick = async () => {
    try {
      if (currentSession.shareCode) {
        if (!confirm(t('confirm_stop_sharing') || 'Stop sharing?')) return;
        await apiService.unshareSession(sessionId);
        currentSession.shareCode = null;
        setCopyShareUiState('idle');
      } else {
        setCopyShareUiState('loading');
        const res = await apiService.shareSession(sessionId);
        currentSession.shareCode = res.shareCode;

        if (res && res.inviteToken) {
          const inviteLink = apiService.getSessionInviteLink(sessionId, res.inviteToken);
          const copied = await copyTextToClipboard(inviteLink);
          if (copied) {
            setCopyShareUiState(
              'success',
              t('share_link_copied') || 'Share link copied to clipboard.'
            );
          } else {
            setCopyShareUiState(
              'error',
              t('share_link_copy_failed') || 'Could not copy automatically.'
            );
          }
        } else {
          setCopyShareUiState(
            'error',
            t('share_link_unavailable') || 'No active share link available.'
          );
        }
      }

      renderSharingState();
    } catch (err) {
      console.error('Sharing error:', err);
      setCopyShareUiState('error', 'Error while changing share status.');
      alert('Error while changing share status.');
    }
  };

  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        setCopyShareUiState('loading');

        if (!currentSession.shareCode) {
          setCopyShareUiState(
            'error',
            t('share_link_unavailable') || 'No active share link available.'
          );
          return;
        }

        const res = await apiService.createShareLink(sessionId);
        if (!res || !res.inviteToken) {
          setCopyShareUiState(
            'error',
            t('share_link_unavailable') || 'No active share link available.'
          );
          return;
        }

        if (res.shareCode) {
          currentSession.shareCode = res.shareCode;
          renderSharingState();
        }

        const inviteLink = apiService.getSessionInviteLink(sessionId, res.inviteToken);
        const copied = await copyTextToClipboard(inviteLink);
        if (copied) {
          setCopyShareUiState(
            'success',
            t('share_link_copied') || 'Share link copied to clipboard.'
          );
        } else {
          setCopyShareUiState(
            'error',
            t('share_link_copy_failed') || 'Could not copy automatically.'
          );
        }
      } catch (err) {
        console.error('Copy share link error:', err);
        setCopyShareUiState(
          'error',
          t('share_link_unavailable') || 'No active share link available.'
        );
      }
    };
  }
}

async function copyTextToClipboard(value) {
  if (!value) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (e) {
      /* fall back to legacy copy */
    }
  }

  try {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);
    return !!copied;
  } catch (e) {
    return false;
  }
}

function updateIntensityDisplay() {
  const display = document.getElementById('intensity-display-settings');
  const dot = document.getElementById('intensity-dot-settings');
  const label = document.getElementById('intensity-label-settings');
  if (!display || typeof INTENSITY_CONFIG === 'undefined') return;

  const intensity = normalizeIntensityLevel(currentSession?.intensity || 'Ruhe');
  const cfg = INTENSITY_CONFIG[intensity] || INTENSITY_CONFIG['Ruhe'];

  display.style.backgroundColor = cfg.bg;
  display.style.borderColor = cfg.border;
  display.style.color = cfg.text;
  if (dot) dot.style.backgroundColor = cfg.border;
  if (label) label.textContent = getIntensityDisplayLabel(intensity);
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
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library not loaded');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    const isDe = lang === 'de';
    const dateStr = new Date(currentSession.date).toLocaleDateString(isDe ? 'de-DE' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const locale = isDe ? 'de-DE' : 'en-US';
    const series = currentSession.series || [];
    const sessionAthletes = (currentSession.athletes || [])
      .map((athleteId) => {
        const athleteFromList = allAthletes.find((athlete) => athlete.id === athleteId);
        const athleteFromSession = Array.isArray(currentSession.athleteData)
          ? currentSession.athleteData.find((athlete) => athlete.id === athleteId)
          : null;
        return (
          athleteFromList || athleteFromSession || { id: athleteId, name: 'Unknown', ageGroup: '-' }
        );
      })
      .filter(Boolean);

    const getSeriesStats = (seriesEntry) => {
      const hits =
        seriesEntry?.stats?.hitCount ||
        (seriesEntry?.shots ? seriesEntry.shots.filter((shot) => shot.hit).length : 0);
      const total =
        seriesEntry?.stats?.totalShots || (seriesEntry?.shots ? seriesEntry.shots.length : 0);
      const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
      return { hits, total, hitRate };
    };

    const athleteSummaries = sessionAthletes.map((athlete) => {
      const athleteSeries = series
        .filter((seriesEntry) => seriesEntry.athleteId === athlete.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const totals = athleteSeries.reduce(
        (acc, seriesEntry) => {
          const stats = getSeriesStats(seriesEntry);
          acc.hits += stats.hits;
          acc.total += stats.total;
          acc.hitRateSum += stats.hitRate;
          return acc;
        },
        { hits: 0, total: 0, hitRateSum: 0 }
      );

      const overallHitRate = totals.total > 0 ? Math.round((totals.hits / totals.total) * 100) : 0;
      const avgSeriesHitRate =
        athleteSeries.length > 0 ? Math.round(totals.hitRateSum / athleteSeries.length) : 0;

      return {
        athlete,
        athleteSeries,
        totals,
        overallHitRate,
        avgSeriesHitRate,
      };
    });

    const labels = {
      title: 'Biathlon Shooting Assistant',
      summary: isDe ? 'Gesamtübersicht' : 'Overview',
      athleteDetail: isDe ? 'Athlet' : 'Athlete',
      date: isDe ? 'Datum' : 'Date',
      location: isDe ? 'Ort' : 'Location',
      type: isDe ? 'Typ' : 'Type',
      intensity: isDe ? 'Intensität' : 'Intensity',
      session: isDe ? 'Session' : 'Session',
      class: isDe ? 'Altersklasse' : 'Class',
      seriesLabel: isDe ? 'Serien' : 'Series',
      singleSeries: isDe ? 'Serie' : 'Series',
      hits: isDe ? 'Treffer' : 'Hits',
      shots: isDe ? 'Schüsse' : 'Shots',
      hitRate: isDe ? 'Quote (%)' : 'Quote (%)',
      avgSeries: isDe ? 'Durchschnitt Serie (%)' : 'Avg Series (%)',
      totalHits: isDe ? 'Treffer gesamt' : 'Total hits',
      totalShots: isDe ? 'Schüsse gesamt' : 'Total shots',
      totalHitRate: isDe ? 'Trefferquote gesamt (%)' : 'Overall quote (%)',
      timestamp: isDe ? 'Zeitstempel' : 'Timestamp',
      time: isDe ? 'Zeit' : 'Time',
    };

    // --- PAGE 1: SUMMARY ---
    doc.setFontSize(16);
    doc.setTextColor(0, 122, 255);
    doc.text(labels.title, 14, 15);

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(labels.summary, 14, 23);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${labels.session}: ${currentSession.name || 'Session'}`, 14, 30);
    doc.text(`${labels.date}: ${dateStr}`, 14, 35);
    doc.text(`${labels.location}: ${currentSession.location || '-'}`, 14, 40);
    doc.text(`${labels.type}: ${getTranslatedSessionType(currentSession.type)}`, 14, 45);
    doc.text(
      `${labels.intensity}: ${getIntensityDisplayLabel(currentSession.intensity || 'Ruhe')}`,
      14,
      50
    );

    const summaryHeaders = [
      labels.athleteDetail,
      labels.class,
      labels.seriesLabel,
      labels.hits,
      labels.shots,
      labels.hitRate,
      labels.avgSeries,
    ];

    const summaryRows = athleteSummaries.map((entry) => [
      entry.athlete.name,
      entry.athlete.ageGroup || '-',
      entry.athleteSeries.length,
      entry.totals.hits,
      entry.totals.total,
      `${entry.overallHitRate}%`,
      `${entry.avgSeriesHitRate}%`,
    ]);

    doc.autoTable({
      head: [summaryHeaders],
      body: summaryRows,
      startY: 55,
      headStyles: { fillColor: [0, 122, 255] },
      theme: 'striped',
    });

    // --- PAGES 2+: ATHLETE DETAILS ---
    athleteSummaries.forEach((entry) => {
      doc.addPage();

      doc.setFontSize(14);
      doc.setTextColor(0, 122, 255);
      doc.text(`${labels.athleteDetail}: ${entry.athlete.name}`, 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);

      const metaLeft = [
        `${labels.session}: ${currentSession.name || '-'}`,
        `${labels.date}: ${dateStr}`,
        `${labels.location}: ${currentSession.location || '-'}`,
        `${labels.type}: ${getTranslatedSessionType(currentSession.type)}`,
        `${labels.class}: ${entry.athlete.ageGroup || '-'}`,
      ];

      const metaRight = [
        `${labels.seriesLabel}: ${entry.athleteSeries.length}`,
        `${labels.totalHits}: ${entry.totals.hits}`,
        `${labels.totalShots}: ${entry.totals.total}`,
        `${labels.totalHitRate}: ${entry.overallHitRate}%`,
        `${labels.avgSeries}: ${entry.avgSeriesHitRate}%`,
      ];

      let yPos = 22;
      for (let i = 0; i < Math.max(metaLeft.length, metaRight.length); i++) {
        if (metaLeft[i]) doc.text(metaLeft[i], 14, yPos);
        if (metaRight[i]) doc.text(metaRight[i], 110, yPos);
        yPos += 5;
      }

      const athleteHeaders = [
        labels.singleSeries,
        labels.time,
        labels.hits,
        labels.shots,
        labels.hitRate,
        labels.type,
        labels.timestamp,
      ];

      const athleteRows = [];
      if (entry.athleteSeries.length === 0) {
        athleteRows.push(['-', '-', 0, 0, '0%', '-', '-']);
      } else {
        entry.athleteSeries.forEach((seriesEntry, index) => {
          const stats = getSeriesStats(seriesEntry);
          const timestamp = seriesEntry?.timestamp
            ? new Date(seriesEntry.timestamp).toLocaleString(locale)
            : '-';

          athleteRows.push([
            index + 1,
            seriesEntry?.rangeTime || seriesEntry?.totalTime || '-',
            stats.hits,
            stats.total,
            `${stats.hitRate}%`,
            getTranslatedSeriesType(seriesEntry?.type),
            timestamp,
          ]);
        });
      }

      doc.autoTable({
        head: [athleteHeaders],
        body: athleteRows,
        startY: yPos + 3,
        headStyles: { fillColor: [40, 40, 50] },
        theme: 'striped',
      });
    });

    doc.save(`Session_${currentSession.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
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

    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    const series = currentSession.series || [];
    const sessionAthletes = (currentSession.athletes || [])
      .map((athleteId) => {
        const athleteFromList = allAthletes.find((athlete) => athlete.id === athleteId);
        const athleteFromSession = Array.isArray(currentSession.athleteData)
          ? currentSession.athleteData.find((athlete) => athlete.id === athleteId)
          : null;
        return (
          athleteFromList || athleteFromSession || { id: athleteId, name: 'Unknown', ageGroup: '-' }
        );
      })
      .filter(Boolean);

    const getSeriesStats = (seriesEntry) => {
      const hits =
        seriesEntry?.stats?.hitCount ||
        (seriesEntry?.shots ? seriesEntry.shots.filter((shot) => shot.hit).length : 0);
      const total =
        seriesEntry?.stats?.totalShots || (seriesEntry?.shots ? seriesEntry.shots.length : 0);
      const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
      return { hits, total, hitRate };
    };

    const makeUniqueSheetName = (rawName, usedNames, fallback = 'Sheet') => {
      const sanitized = (rawName || fallback)
        .toString()
        .replace(/[\\/?*\[\]:]/g, '_')
        .trim()
        .slice(0, 31);

      const base = sanitized || fallback;
      let candidate = base;
      let suffix = 2;
      while (usedNames.has(candidate)) {
        const suffixText = `_${suffix}`;
        candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
        suffix += 1;
      }
      usedNames.add(candidate);
      return candidate;
    };

    const athleteSummaries = sessionAthletes.map((athlete) => {
      const athleteSeries = series
        .filter((seriesEntry) => seriesEntry.athleteId === athlete.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const totals = athleteSeries.reduce(
        (acc, seriesEntry) => {
          const stats = getSeriesStats(seriesEntry);
          acc.hits += stats.hits;
          acc.total += stats.total;
          acc.hitRateSum += stats.hitRate;
          return acc;
        },
        { hits: 0, total: 0, hitRateSum: 0 }
      );

      const overallHitRate = totals.total > 0 ? Math.round((totals.hits / totals.total) * 100) : 0;
      const avgSeriesHitRate =
        athleteSeries.length > 0 ? Math.round(totals.hitRateSum / athleteSeries.length) : 0;

      return {
        athlete,
        athleteSeries,
        totals,
        overallHitRate,
        avgSeriesHitRate,
      };
    });

    const wb = XLSX.utils.book_new();
    const usedNames = new Set();

    const summaryData = [
      [currentSession.name || 'Session'],
      ['Datum', dateStr],
      ['Ort', currentSession.location || '-'],
      ['Typ', getTranslatedSessionType(currentSession.type)],
      ['Intensitaet', getIntensityDisplayLabel(currentSession.intensity || 'Ruhe')],
      [],
      [
        'Name',
        'Altersklasse',
        'Serien',
        'Treffer',
        'Schuesse',
        'Quote (%)',
        'Durchschnitt Serie (%)',
      ],
      ...athleteSummaries.map((entry) => [
        entry.athlete.name,
        entry.athlete.ageGroup || '-',
        entry.athleteSeries.length,
        entry.totals.hits,
        entry.totals.total,
        entry.overallHitRate,
        entry.avgSeriesHitRate,
      ]),
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 24 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, summarySheet, makeUniqueSheetName('Summary', usedNames));

    athleteSummaries.forEach((entry) => {
      const athleteSheetData = [
        [`Athlet: ${entry.athlete.name}`],
        ['Session', currentSession.name || '-'],
        ['Datum', dateStr],
        ['Ort', currentSession.location || '-'],
        ['Typ', getTranslatedSessionType(currentSession.type)],
        ['Altersklasse', entry.athlete.ageGroup || '-'],
        ['Serien', entry.athleteSeries.length],
        ['Treffer gesamt', entry.totals.hits],
        ['Schuesse gesamt', entry.totals.total],
        ['Trefferquote gesamt (%)', entry.overallHitRate],
        ['Durchschnitt Serie (%)', entry.avgSeriesHitRate],
        [],
        ['Serie', 'Zeit', 'Treffer', 'Schuesse', 'Quote (%)', 'Typ', 'Zeitstempel'],
      ];

      if (entry.athleteSeries.length === 0) {
        athleteSheetData.push(['-', '-', 0, 0, 0, '-', '-']);
      } else {
        entry.athleteSeries.forEach((seriesEntry, index) => {
          const stats = getSeriesStats(seriesEntry);
          const timestamp = seriesEntry?.timestamp
            ? new Date(seriesEntry.timestamp).toLocaleString(locale)
            : '-';

          athleteSheetData.push([
            index + 1,
            seriesEntry?.rangeTime || seriesEntry?.totalTime || '-',
            stats.hits,
            stats.total,
            stats.hitRate,
            getTranslatedSeriesType(seriesEntry?.type),
            timestamp,
          ]);
        });
      }

      const athleteSheet = XLSX.utils.aoa_to_sheet(athleteSheetData);
      athleteSheet['!cols'] = [
        { wch: 30 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 26 },
      ];

      XLSX.utils.book_append_sheet(
        wb,
        athleteSheet,
        makeUniqueSheetName(entry.athlete.name, usedNames, 'Athlete')
      );
    });

    XLSX.writeFile(wb, `Session_${currentSession.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  } catch (e) {
    console.error('Excel export error:', e);
    throw e;
  }
}

// ─── Training Template (Session Settings) ───────────────────────────────────

class SessionTrainingTemplatesPage {
  constructor() {
    this.currentEditingTemplate = null;
    this.positions = [];
  }

  _posToLetter(pos) {
    return pos === t('prone') || pos === 'Liegend' || pos === 'prone' ? 'L' : 'S';
  }

  renderSelectedTemplate() {
    const templateId = currentSession?.settings?.trainingTemplateId || null;
    const nameEl = document.getElementById('template-selected-name');
    if (!nameEl) return;

    if (!templateId || typeof trainingTemplateManager === 'undefined') {
      nameEl.removeAttribute('data-i18n');
      nameEl.textContent = t('no_template_selected');
      return;
    }

    const template = trainingTemplateManager.getById(templateId);
    if (!template) {
      nameEl.removeAttribute('data-i18n');
      nameEl.textContent = t('no_template_selected');
      return;
    }

    nameEl.removeAttribute('data-i18n');
    const positions = template.positions.map((p) => this._posToLetter(p)).join(' ');
    nameEl.textContent = `${template.name} · ${positions}`;
  }

  openTemplatesList() {
    this.renderTemplatesList();
    document.getElementById('ss-training-templates-modal').classList.remove('hidden');
  }

  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('ss-training-templates-modal').classList.add('hidden');
  }

  renderTemplatesList() {
    const list = document.getElementById('ss-training-templates-list');
    if (!list || typeof trainingTemplateManager === 'undefined') return;

    const templates = trainingTemplateManager.getAll();
    const selectedId = currentSession?.settings?.trainingTemplateId || null;

    if (templates.length === 0) {
      list.innerHTML =
        '<div class="text-center text-light-blue-info/50 py-4">Keine Vorlagen vorhanden</div>';
      return;
    }

    list.innerHTML = templates
      .map((template) => {
        const positionSummary = template.positions.map((p) => this._posToLetter(p)).join(' ');
        const isDefault = template.isDefault;
        const isSelected = template.id === selectedId;

        return `
          <div class="bg-off-white/5 border ${isSelected ? 'border-primary' : 'border-subtle'} rounded-2xl p-4 ${isSelected ? 'bg-primary/5' : ''}">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 cursor-pointer" onclick="sessionTrainingTemplatesPage?.selectTemplate('${template.id}')">
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-off-white">${template.name}</p>
                  ${isSelected ? '<span class="material-symbols-outlined text-primary text-base">check_circle</span>' : ''}
                </div>
                <p class="text-xs text-light-blue-info">${template.description || ''}</p>
                <p class="text-xs text-light-blue-info/50 mt-1 font-mono">${positionSummary}</p>
              </div>
              ${
                !isDefault
                  ? `<div class="flex gap-2 ml-2">
                      <button onclick="sessionTrainingTemplatesPage?.editTemplate('${template.id}')"
                        class="p-2 hover:bg-off-white/10 rounded-lg transition-colors" title="Bearbeiten">
                        <span class="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onclick="sessionTrainingTemplatesPage?.duplicateTemplate('${template.id}')"
                        class="p-2 hover:bg-off-white/10 rounded-lg transition-colors" title="Duplizieren">
                        <span class="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                      <button onclick="sessionTrainingTemplatesPage?.deleteTemplate('${template.id}')"
                        class="p-2 hover:bg-red-500/20 rounded-lg transition-colors" title="Löschen">
                        <span class="material-symbols-outlined text-sm text-red-400">delete</span>
                      </button>
                    </div>`
                  : '<span class="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full ml-2 shrink-0">Standard</span>'
              }
            </div>
          </div>`;
      })
      .join('');
  }

  selectTemplate(templateId) {
    if (!currentSession.settings) currentSession.settings = {};
    const isSame = currentSession.settings.trainingTemplateId === templateId;
    currentSession.settings.trainingTemplateId = isSame ? null : templateId;
    updateSessionInStorage();
    this.renderSelectedTemplate();
    this.renderTemplatesList();
  }

  openTemplateEditor() {
    this.currentEditingTemplate = null;
    this.positions = [];
    const titleEl = document.getElementById('ss-template-editor-title');
    if (titleEl) {
      titleEl.removeAttribute('data-i18n');
      titleEl.textContent = t('new_template');
    }
    document.getElementById('ss-template-name').value = '';
    document.getElementById('ss-template-description').value = '';
    this.renderPositions();
    document.getElementById('ss-template-editor-modal').classList.remove('hidden');
  }

  editTemplate(templateId) {
    const template = trainingTemplateManager.getById(templateId);
    if (!template) return;

    this.currentEditingTemplate = templateId;
    this.positions = [...template.positions];
    const titleEl = document.getElementById('ss-template-editor-title');
    if (titleEl) {
      titleEl.removeAttribute('data-i18n');
      titleEl.textContent = t('edit_template');
    }
    document.getElementById('ss-template-name').value = template.name;
    document.getElementById('ss-template-description').value = template.description || '';
    this.renderPositions();
    document.getElementById('ss-template-editor-modal').classList.remove('hidden');
  }

  addPosition(position) {
    this.positions.push(position);
    this.renderPositions();
    const container = document.getElementById('ss-positions-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  bindPositionDragEvents() {
    const container = document.getElementById('ss-positions-container');
    if (!container) return;

    let draggedItem = null;
    let touchState = null;
    let currentDropTarget = null;

    const setDropHighlight = (targetItem) => {
      if (currentDropTarget && currentDropTarget !== targetItem) {
        currentDropTarget.classList.remove('drop-highlight');
      }
      currentDropTarget = targetItem || null;
      if (currentDropTarget) {
        currentDropTarget.classList.add('drop-highlight');
      }
    };

    const clearDropHighlight = () => {
      if (currentDropTarget) {
        currentDropTarget.classList.remove('drop-highlight');
        currentDropTarget = null;
      }
    };

    const getDragAfterElement = (y) => {
      const items = [...container.querySelectorAll('.position-item:not(.is-dragging)')];
      let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
      items.forEach((item) => {
        const box = item.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          closest = { offset, element: item };
        }
      });
      return closest.element;
    };

    const syncArrayAndLabels = () => {
      const items = [...container.querySelectorAll('.position-item')];
      this.positions = items.map((item) => item.dataset.pos);
      items.forEach((item, idx) => {
        item.dataset.index = idx.toString();
        const label = item.querySelector('.pos-label');
        if (label) {
          label.textContent = `${idx + 1}. ${item.dataset.pos}`;
        }
        const removeBtn = item.querySelector('.pos-remove-btn');
        if (removeBtn) {
          removeBtn.setAttribute('data-idx', idx.toString());
        }
      });
    };

    const items = container.querySelectorAll('.position-item');
    items.forEach((item) => {
      // Desktop Drag & Drop
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try {
            e.dataTransfer.setData('text/plain', item.dataset.index);
          } catch {}
        }
      });

      item.addEventListener('dragover', (e) => {
        if (!draggedItem) return;
        e.preventDefault();
        const afterElement = getDragAfterElement(e.clientY);
        setDropHighlight(afterElement);
        if (afterElement) {
          container.insertBefore(draggedItem, afterElement);
        } else {
          container.appendChild(draggedItem);
        }
      });

      item.addEventListener('dragend', () => {
        if (!draggedItem) return;
        draggedItem.classList.remove('is-dragging');
        draggedItem = null;
        clearDropHighlight();
        syncArrayAndLabels();
      });

      // Touch Drag (Mobile)
      item.addEventListener(
        'touchstart',
        (e) => {
          if (e.target.closest('button')) return;
          const touch = e.touches[0];
          touchState = {
            item,
            startY: touch.clientY,
            active: false,
            timer: setTimeout(() => {
              if (!touchState) return;
              touchState.active = true;
              item.classList.add('is-dragging');
            }, 100),
          };
        },
        { passive: true }
      );

      item.addEventListener(
        'touchmove',
        (e) => {
          if (!touchState || !touchState.active) return;
          if (e.cancelable) e.preventDefault();
          const touch = e.touches[0];
          const afterElement = getDragAfterElement(touch.clientY);
          setDropHighlight(afterElement);
          if (afterElement) {
            container.insertBefore(touchState.item, afterElement);
          } else {
            container.appendChild(touchState.item);
          }
        },
        { passive: false }
      );

      item.addEventListener('touchend', () => {
        if (!touchState) return;
        clearTimeout(touchState.timer);
        if (touchState.active) {
          touchState.item.classList.remove('is-dragging');
          clearDropHighlight();
          syncArrayAndLabels();
        }
        touchState = null;
      });

      item.addEventListener('touchcancel', () => {
        if (!touchState) return;
        clearTimeout(touchState.timer);
        touchState.item.classList.remove('is-dragging');
        clearDropHighlight();
        touchState = null;
      });
    });
  }

  removePosition(index) {
    this.positions.splice(index, 1);
    this.renderPositions();
  }

  renderPositions() {
    const container = document.getElementById('ss-positions-container');
    if (!container) return;
    if (this.positions.length === 0) {
      container.innerHTML = `<p class="text-xs text-light-blue-info/50 italic">${t('no_positions_selected')}</p>`;
      return;
    }

    container.innerHTML = this.positions
      .map((pos, idx) => {
        const isProne = this._posToLetter(pos) === 'L';
        const bgColor = isProne
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30';

        return `
          <div
            class="position-item flex items-center justify-between ${bgColor} px-3 py-2 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none touch-none"
            data-index="${idx}"
            data-pos="${pos}"
            draggable="true"
          >
            <div class="flex items-center gap-2 pointer-events-none">
              <span class="material-symbols-outlined text-sm opacity-60">drag_indicator</span>
              <span class="pos-label font-medium text-sm">${idx + 1}. ${pos}</span>
            </div>
            <button
              type="button"
              onclick="sessionTrainingTemplatesPage?.removePosition(parseInt(this.getAttribute('data-idx') || '${idx}'))"
              data-idx="${idx}"
              class="pos-remove-btn p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Löschen"
            >
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>`;
      })
      .join('');

    this.bindPositionDragEvents();
  }

  saveTemplate() {
    const name = document.getElementById('ss-template-name').value.trim();
    const description = document.getElementById('ss-template-description').value.trim();

    if (!name || this.positions.length === 0) {
      alert(t('fill_all_details') || 'Bitte Name und mindestens eine Position ausfüllen.');
      return;
    }

    try {
      if (this.currentEditingTemplate) {
        trainingTemplateManager.update(
          this.currentEditingTemplate,
          name,
          description,
          this.positions
        );
      } else {
        trainingTemplateManager.create(name, description, this.positions);
      }
      this.closeEditorModal();
      this.renderSelectedTemplate();
      this.renderTemplatesList();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  }

  duplicateTemplate(templateId) {
    const template = trainingTemplateManager.getById(templateId);
    if (!template) return;
    trainingTemplateManager.duplicate(templateId, template.name + ' (Kopie)');
    this.renderTemplatesList();
  }

  deleteTemplate(templateId) {
    if (!confirm(t('confirm_delete_template'))) return;
    try {
      trainingTemplateManager.delete(templateId);
      // If deleted template was selected for this session, clear it
      if (currentSession?.settings?.trainingTemplateId === templateId) {
        currentSession.settings.trainingTemplateId = null;
        updateSessionInStorage();
        this.renderSelectedTemplate();
      }
      this.renderTemplatesList();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  }

  closeEditorModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('ss-template-editor-modal').classList.add('hidden');
  }
}

class SessionAmmunitionTypesPage {
  constructor() {
    this.types = [];
  }

  getSelectedType() {
    return currentSession?.settings?.ammunitionType || null;
  }

  isSelected(type) {
    const selected = this.getSelectedType();
    return selected && selected.name === type.name && selected.manufacturer === type.manufacturer;
  }

  openTypesList() {
    this.types = getConfiguredAmmunitionTypes();
    this.renderTypesList();
    document.getElementById('ss-ammunition-types-modal').classList.remove('hidden');
  }

  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('ss-ammunition-types-modal').classList.add('hidden');
  }

  selectType(index) {
    const selected = this.types[index];
    if (!selected) return;
    if (!currentSession.settings) currentSession.settings = {};
    currentSession.settings.ammunitionType = {
      name: selected.name,
      manufacturer: selected.manufacturer || '',
    };
    updateSessionInStorage();
    renderAmmunitionTypeSection();
    this.renderTypesList();
    setTimeout(() => this.closeModal(), 150);
  }

  renderTypesList() {
    const list = document.getElementById('ss-ammunition-types-list');
    if (!list) return;

    if (this.types.length === 0) {
      list.innerHTML =
        '<div class="text-center text-light-blue-info/50 py-4">Keine Munitionsarten vorhanden</div>';
      return;
    }

    list.innerHTML = this.types
      .map(
        (type, index) => `
          <button
            type="button"
            onclick="sessionAmmunitionTypesPage?.selectType(${index})"
            class="w-full text-left bg-off-white/5 border ${this.isSelected(type) ? 'border-primary bg-primary/5' : 'border-subtle'} rounded-2xl p-4"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <p class="font-semibold text-off-white">${type.name || ''}</p>
                <p class="text-xs text-light-blue-info">${type.manufacturer || ''}</p>
              </div>
              ${this.isSelected(type) ? '<span class="material-symbols-outlined text-primary text-base">check_circle</span>' : ''}
            </div>
          </button>
        `
      )
      .join('');
  }
}

let sessionTrainingTemplatesPage;
let sessionAmmunitionTypesPage;

function renderTrainingTemplateSection() {
  sessionTrainingTemplatesPage?.renderSelectedTemplate();
}

function renderAmmunitionTypeSection() {
  const selectedName = document.getElementById('ss-ammunition-selected-name');
  if (!selectedName) return;
  selectedName.textContent = formatAmmunitionTypeLabel(currentSession?.settings?.ammunitionType);
}

function getTranslatedSessionType(type) {
  const normalizedType = (type || 'training').toLowerCase();
  if (normalizedType === 'competition')
    return typeof t === 'function' ? t('competition') : 'Wettkampf';
  if (normalizedType === 'test_competition')
    return typeof t === 'function' ? t('test_competition') : 'Testwettkampf';
  if (normalizedType === 'training') return typeof t === 'function' ? t('training') : 'Training';
  if (normalizedType === 'other') return typeof t === 'function' ? t('other') : 'Sonstige';
  if (normalizedType === 'testing') return typeof t === 'function' ? t('testing') : 'Test';
  return typeof t === 'function' ? t(type) : type;
}

function getTranslatedSeriesType(type) {
  if (!type) return '-';
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'prone') return typeof t === 'function' ? t('prone') : 'Liegend';
  if (normalizedType === 'standing') return typeof t === 'function' ? t('standing') : 'Stehend';
  if (normalizedType === 'zeroing') return typeof t === 'function' ? t('zeroing') : 'Anschießen';
  return typeof t === 'function' ? t(type) : type;
}
