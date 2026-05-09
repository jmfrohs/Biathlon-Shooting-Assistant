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

const defaultAgeGroups = ['AK 16', 'AK 17', 'AK 18 - 1', 'AK 18 - 2', 'Junioren', 'Senioren'];
const defaultKaders = ['Nothing', 'LK1', 'LK2', 'NK2', 'NK1', 'OK', 'PK'];
const defaultFederations = ['BSV', 'NSV', 'SBW', 'SVSAC', 'TSV', 'WSV'];
const defaultCountries = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Italien',
  'Frankreich',
  'Norwegen',
  'Schweden',
  'Finnland',
  'USA',
  'Ukraine',
  'Polen',
  'Tschechien',
  'Slowakei',
  'Slowenien',
  'Kroatien',
  'Estland',
  'Lettland',
  'Litauen',
  'Kanada',
  'Belgien',
  'Grönland',
];

const countryFlags = {
  Deutschland: '🇩🇪',
  Österreich: '🇦🇹',
  Schweiz: '🇨🇭',
  Italien: '🇮🇹',
  Frankreich: '🇫🇷',
  Norwegen: '🇳🇴',
  Schweden: '🇸🇪',
  Finnland: '🇫🇮',
  USA: '🇺🇸',
  Belarus: '🇧🇾',
  Ukraine: '🇺🇦',
  Polen: '🇵🇱',
  Tschechien: '🇨🇿',
  Slowakei: '🇸🇰',
  Slowenien: '🇸🇮',
  Kroatien: '🇭🇷',
  Estland: '🇪🇪',
  Lettland: '🇱🇻',
  Litauen: '🇱🇹',
  Rumänien: '🇷🇴',
  Bulgarien: '🇧🇬',
  Serbien: '🇷🇸',
  Kanada: '🇨🇦',
  Großbritannien: '🇬🇧',
  Belgien: '🇧🇪',
  Grönland: '🇬🇱',
};

function getCountryFlag(country) {
  return countryFlags[country] || '🌍';
}

function getAthleteInitials(firstName, lastName) {
  return (firstName?.[0] || '') + (lastName?.[0] || '');
}

function loadAgeGroups() {
  return JSON.parse(localStorage.getItem('ageGroups')) || defaultAgeGroups;
}

function loadKaders() {
  return JSON.parse(localStorage.getItem('kaders')) || defaultKaders;
}

function saveAgeGroups(groups) {
  localStorage.setItem('ageGroups', JSON.stringify(groups));
}

function saveKaders(kaders) {
  localStorage.setItem('kaders', JSON.stringify(kaders));
}

function loadFederations() {
  return JSON.parse(localStorage.getItem('federations')) || defaultFederations;
}

function saveFederations(federations) {
  localStorage.setItem('federations', JSON.stringify(federations));
}

function loadCountries() {
  return JSON.parse(localStorage.getItem('countries')) || defaultCountries;
}

function saveCountries(countries) {
  localStorage.setItem('countries', JSON.stringify(countries));
}

function toggleAgeGroups() {
  const content = document.getElementById('age-groups-content');
  const chevron = document.getElementById('age-chevron');
  if (!content || !chevron) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
    renderAgeGroups();
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

function renderAgeGroups() {
  const ageGroups = loadAgeGroups();
  const athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  const container = document.getElementById('age-groups-content');

  let html = '<div class="p-3 space-y-2">';

  ageGroups.forEach((group) => {
    const groupAthletes = athletes.filter((a) => a.ageGroup === group);
    html += `
      <div class="p-3 rounded-lg bg-off-white/5 border border-off-white/10 flex items-center justify-between hover:bg-off-white/10 hover:border-blue-400/30 transition-all">
        <div class="flex items-center gap-2 flex-1">
          <span class="text-sm font-medium text-off-white">${group}</span>
          <span class="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-medium">${groupAthletes.length}</span>
        </div>
        <button onclick="deleteAgeGroup('${group}')" class="text-sm text-red-400/60 hover:text-red-400 transition-colors">✕</button>
      </div>
    `;
  });

  html += `
    <button onclick="addAgeGroup()" class="w-full mt-3 py-2 text-xs font-bold text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-400/5 transition-all uppercase tracking-wide">
      + Klasse hinzufügen
    </button>
  </div>`;

  container.innerHTML = html;
}

function deleteAgeGroup(group) {
  const athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  if (athletes.some((a) => a.ageGroup === group)) {
    alert('Klasse enthält noch Athleten. Bitte erst verschieben.');
    return;
  }

  const updated = loadAgeGroups().filter((g) => g !== group);
  saveAgeGroups(updated);
  renderAgeGroups();
}

function addAgeGroup() {
  const name = prompt('Name der neuen Altersklasse:');
  if (name && name.trim()) {
    const groups = loadAgeGroups();
    if (!groups.includes(name.trim())) {
      groups.push(name.trim());
      saveAgeGroups(groups);
      renderAgeGroups();
    }
  }
}

function toggleKader() {
  const content = document.getElementById('kader-content');
  const chevron = document.getElementById('kader-chevron');
  if (!content || !chevron) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
    renderKader();
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

function renderKader() {
  const kaders = loadKaders();
  const athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  const container = document.getElementById('kader-content');

  let html = '<div class="p-3 space-y-2">';

  kaders.forEach((kader) => {
    const kaderAthletes = athletes.filter((a) => a.squad === kader);
    html += `
      <div class="p-3 rounded-lg bg-off-white/5 border border-off-white/10 flex items-center justify-between hover:bg-off-white/10 hover:border-cyan-400/30 transition-all">
        <div class="flex items-center gap-2 flex-1">
          <span class="text-sm font-medium text-off-white">${kader}</span>
          <span class="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md font-medium">${kaderAthletes.length}</span>
        </div>
        <button onclick="deleteKader('${kader}')" class="text-sm text-red-400/60 hover:text-red-400 transition-colors">✕</button>
      </div>
    `;
  });

  html += `
    <button onclick="addKader()" class="w-full mt-3 py-2 text-xs font-bold text-cyan-400 border border-cyan-400/30 rounded-lg hover:bg-cyan-400/5 transition-all uppercase tracking-wide">
      + Kader hinzufügen
    </button>
  </div>`;

  container.innerHTML = html;
}

function deleteKader(kader) {
  const athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  if (athletes.some((a) => a.squad === kader)) {
    alert('Kader enthält noch Athleten. Bitte erst verschieben.');
    return;
  }

  const updated = loadKaders().filter((k) => k !== kader);
  saveKaders(updated);
  renderKader();
}

function addKader() {
  const name = prompt('Name des neuen Kaders:');
  if (name && name.trim()) {
    const kaders = loadKaders();
    if (!kaders.includes(name.trim())) {
      kaders.push(name.trim());
      saveKaders(kaders);
      renderKader();
    }
  }
}

function toggleFederation() {
  const content = document.getElementById('federation-content');
  const chevron = document.getElementById('federation-chevron');
  if (!content || !chevron) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
    renderFederation();
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

function renderFederation() {
  const federations = loadFederations();
  const athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  const container = document.getElementById('federation-content');

  let html = '<div class="p-3 space-y-2">';

  federations.forEach((fed) => {
    const fedAthletes = athletes.filter((a) => a.federation === fed);
    html += `
      <div class="p-3 rounded-lg bg-off-white/5 border border-off-white/10 flex items-center justify-between hover:bg-off-white/10 hover:border-green-400/30 transition-all">
        <div class="flex items-center gap-2 flex-1">
          <span class="text-sm font-medium text-off-white">${fed}</span>
          <span class="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-md font-medium">${fedAthletes.length}</span>
        </div>
        <button onclick="deleteFederation('${fed}')" class="text-sm text-red-400/60 hover:text-red-400 transition-colors">✕</button>
      </div>
    `;
  });

  html += `
    <button onclick="addFederation()" class="w-full mt-3 py-2 text-xs font-bold text-green-400 border border-green-400/30 rounded-lg hover:bg-green-400/5 transition-all uppercase tracking-wide">
      + Skiverband hinzufügen
    </button>
  </div>`;

  container.innerHTML = html;
}

function deleteFederation(fed) {
  const athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  if (athletes.some((a) => a.federation === fed)) {
    alert('Verband enthält noch Athleten. Bitte erst verschieben.');
    return;
  }

  const updated = loadFederations().filter((f) => f !== fed);
  saveFederations(updated);
  renderFederation();
}

function addFederation() {
  const name = prompt('Name des neuen Skiverbands:');
  if (name && name.trim()) {
    const federations = loadFederations();
    if (!federations.includes(name.trim())) {
      federations.push(name.trim());
      saveFederations(federations);
      renderFederation();
    }
  }
}

function toggleCountry() {
  const content = document.getElementById('country-content');
  const chevron = document.getElementById('country-chevron');
  if (!content || !chevron) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
    renderCountry();
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

function renderCountry() {
  const countries = loadCountries();
  const container = document.getElementById('country-content');

  let html = '<div class="p-3 flex flex-col gap-3 h-full">';
  html += '<div class="space-y-2 overflow-y-auto max-h-64 pr-2">';

  countries.forEach((country) => {
    const flag = getCountryFlag(country);
    html += `
      <div class="p-3 rounded-lg bg-off-white/5 border border-off-white/10 flex items-center justify-between hover:bg-off-white/10 hover:border-orange-400/30 transition-all">
        <div class="flex items-center gap-2 flex-1">
          <span class="text-base">${flag}</span>
          <span class="text-sm font-medium text-off-white">${country}</span>
        </div>
        <button onclick="deleteCountry('${country}')" class="text-sm text-red-400/60 hover:text-red-400 transition-colors">✕</button>
      </div>
    `;
  });

  html += '</div>';
  html += `
    <button onclick="addCountry()" class="w-full py-2 text-xs font-bold text-orange-400 border border-orange-400/30 rounded-lg hover:bg-orange-400/5 transition-all uppercase tracking-wide">
      + Land hinzufügen
    </button>
  </div>`;

  container.innerHTML = html;
}

function deleteCountry(country) {
  const athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  if (athletes.some((a) => a.country === country)) {
    alert('Land enthält noch Athleten. Bitte erst verschieben.');
    return;
  }

  const updated = loadCountries().filter((c) => c !== country);
  saveCountries(updated);
  renderCountry();
}

function addCountry() {
  const name = prompt('Name des neuen Landes:');
  if (name && name.trim()) {
    const countries = loadCountries();
    if (!countries.includes(name.trim())) {
      countries.push(name.trim());
      saveCountries(countries);
      renderCountry();
    }
  }
}

let draggedElement = null;

function initDragAndDrop(type) {
  const container = document.getElementById(
    type === 'age' ? 'age-groups-content' : 'kader-content'
  );
  if (!container) return;

  container.querySelectorAll('[draggable="true"]').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      draggedElement = el;
      el.classList.add('opacity-40');
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      if (draggedElement) draggedElement.classList.remove('opacity-40');
      draggedElement = null;
    });
  });

  container
    .querySelectorAll(type === 'age' ? '[data-age-drop]' : '[data-kader-drop]')
    .forEach((dropZone) => {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dropZone.classList.add('bg-white/5', 'rounded-lg');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('bg-white/5', 'rounded-lg');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-white/5', 'rounded-lg');
        if (draggedElement && draggedElement.getAttribute('data-type') === type) {
          const athleteId = parseInt(draggedElement.getAttribute('data-athlete-id'));
          const targetValue = dropZone.getAttribute(
            type === 'age' ? 'data-age-drop' : 'data-kader-drop'
          );

          let athletes = JSON.parse(localStorage.getItem('athletes')) || [];
          const index = athletes.findIndex((a) => a.id === athleteId);
          if (index !== -1) {
            if (type === 'age') athletes[index].ageGroup = targetValue;
            else athletes[index].squad = targetValue;

            localStorage.setItem('athletes', JSON.stringify(athletes));
            if (type === 'age') renderAgeGroups();
            else renderKader();
          }
        }
      });
    });
}

function toggleVoiceCommands() {
  const content = document.getElementById('vc-content');
  const chevron = document.getElementById('vc-chevron');
  if (!content || !chevron) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

function toggleApiConfig() {
  const content = document.getElementById('api-content');
  const chevron = document.getElementById('api-chevron');
  if (!content || !chevron) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

const DEFAULT_SERVER_IP = '91.99.192.176:3001';

function loadServerConfig() {
  const ipInput = document.getElementById('server-ip-input');
  const savedUrl = localStorage.getItem('b_server_url');
  const token = localStorage.getItem('b_auth_token');

  if (ipInput && savedUrl) {
    ipInput.value = savedUrl.replace(/^https?:\/\//, '');
  }

  const isConnected = !!savedUrl && !!token;
  const connectArea = document.getElementById('server-connect-area');
  const disconnectArea = document.getElementById('server-disconnect-area');
  const accountSection = document.getElementById('account-section');

  if (connectArea) connectArea.classList.toggle('hidden', isConnected);
  if (disconnectArea) disconnectArea.classList.toggle('hidden', !isConnected);

  if (accountSection) {
    accountSection.classList.remove('hidden');
    const changePasswordBtn = accountSection.querySelector('[onclick="openChangePasswordModal()"]');
    const changeEmailBtn = accountSection.querySelector('[onclick="openChangeEmailModal()"]');
    const logoutBtn = accountSection.querySelector('[onclick="handleLogout()"]');
    const deleteAccountBtn = accountSection.querySelector('[onclick="openDeleteAccountModal()"]');
    const roleBtn = accountSection.querySelector('[onclick="openRoleModal()"]');

    if (changePasswordBtn) changePasswordBtn.style.opacity = isConnected ? '1' : '0.5';
    if (changePasswordBtn) changePasswordBtn.style.pointerEvents = isConnected ? 'auto' : 'none';
    if (changeEmailBtn) changeEmailBtn.style.opacity = isConnected ? '1' : '0.5';
    if (changeEmailBtn) changeEmailBtn.style.pointerEvents = isConnected ? 'auto' : 'none';
    if (logoutBtn) logoutBtn.style.opacity = isConnected ? '1' : '0.5';
    if (logoutBtn) logoutBtn.style.pointerEvents = isConnected ? 'auto' : 'none';
    if (deleteAccountBtn) deleteAccountBtn.style.opacity = isConnected ? '1' : '0.5';
    if (deleteAccountBtn) deleteAccountBtn.style.pointerEvents = isConnected ? 'auto' : 'none';
    if (roleBtn) roleBtn.style.opacity = isConnected ? '1' : '0.5';
    if (roleBtn) roleBtn.style.pointerEvents = isConnected ? 'auto' : 'none';
  }

  if (isConnected) {
    checkServerConnection();
  } else {
    updateServerStatus('disconnected');
  }
}

function updateServerStatus(state, message) {
  const dot = document.getElementById('server-conn-dot');
  const text = document.getElementById('server-conn-text');
  if (!dot || !text) return;

  switch (state) {
    case 'checking':
      dot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
      text.textContent = message || 'Verbinde...';
      text.className = 'text-yellow-400 text-xs';
      break;
    case 'connected':
      dot.className = 'w-2 h-2 rounded-full bg-green-500';
      text.textContent = message || 'Server verbunden ✓';
      text.className = 'text-green-400 text-xs';
      break;
    case 'error':
      dot.className = 'w-2 h-2 rounded-full bg-red-500';
      text.textContent = message || 'Server nicht erreichbar';
      text.className = 'text-red-400 text-xs';
      break;
    case 'disconnected':
    default:
      dot.className = 'w-2 h-2 rounded-full bg-zinc-600';
      text.textContent = message || 'Nicht verbunden';
      text.className = 'text-light-blue-info/50 text-xs';
      break;
  }
}

async function checkServerConnection() {
  const ipInput = document.getElementById('server-ip-input');
  const ip = ipInput ? ipInput.value.trim() : '';
  if (!ip) return false;

  let url = ip.startsWith('http') ? ip : `http://${ip}`;

  try {
    const urlObj = new URL(url);
    url = (urlObj.protocol + '//' + urlObj.host + urlObj.pathname).replace(/\/$/, '');
  } catch (e) {
    url = url.replace(/\/$/, '');
  }

  updateServerStatus('checking');

  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      updateServerStatus('connected');
      return true;
    }

    updateServerStatus('error');
    return false;
  } catch (err) {
    console.error('Server check error:', err);
    updateServerStatus('error');
    return false;
  }
}

function connectToServer() {
  const ipInput = document.getElementById('server-ip-input');
  const ip = (ipInput ? ipInput.value.trim() : '') || DEFAULT_SERVER_IP;
  const url = ip.startsWith('http') ? ip : `http://${ip}`;

  apiService.setServerUrl(url);

  window.location.href = 'login.html';
}

function disconnectFromServer() {
  if (!confirm('Vom Server trennen? Du arbeitest dann nur noch lokal.')) return;

  apiService.clearToken();
  apiService.clearServerUrl();
  localStorage.removeItem('b_user_email');
  localStorage.removeItem('b_user_trainer_name');

  window.location.reload();
}

function loadAccountInfo() {
  const emailEl = document.getElementById('account-email');
  const sinceEl = document.getElementById('account-since');
  const trainerNameEl = document.getElementById('account-trainer-name');
  const dot = document.getElementById('account-dot');
  const statusText = document.getElementById('account-status-text');

  if (!emailEl) return;

  const cachedEmail = localStorage.getItem('b_user_email');
  const cachedTrainerName = localStorage.getItem('b_user_trainer_name');

  if (cachedEmail) {
    emailEl.textContent = cachedEmail;
  }

  if (cachedTrainerName && trainerNameEl) {
    trainerNameEl.textContent = cachedTrainerName;
  }

  if (typeof apiService !== 'undefined' && apiService.isLoggedIn()) {
    apiService
      .getProfile()
      .then((profile) => {
        if (profile) {
          emailEl.textContent = profile.email;
          if (trainerNameEl) {
            trainerNameEl.textContent = profile.trainerName || '';
          }

          const date = new Date(profile.createdAt);
          sinceEl.textContent = `Mitglied seit ${date.toLocaleDateString('de')}`;
          localStorage.setItem('b_user_email', profile.email);
          if (profile.trainerName) {
            localStorage.setItem('b_user_trainer_name', profile.trainerName);
          }

          if (dot) dot.className = 'w-2 h-2 rounded-full bg-green-500';
          if (statusText) {
            statusText.textContent = 'Server verbunden ✓';
            statusText.className = 'text-green-400 text-xs';
          }
        }
      })
      .catch(() => {
        sinceEl.textContent = 'Server nicht erreichbar';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-500';
        if (statusText) {
          statusText.textContent = 'Offline-Modus';
          statusText.className = 'text-red-400 text-xs';
        }
      });
  } else {
    emailEl.textContent = 'Nicht angemeldet';
    sinceEl.textContent = '';
    if (trainerNameEl) trainerNameEl.textContent = '';
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-zinc-600';
    if (statusText) {
      statusText.textContent = 'Nicht verbunden';
      statusText.className = 'text-light-blue-info/50 text-xs';
    }
  }
}

function openChangePasswordModal() {
  document.getElementById('change-password-modal').classList.remove('hidden');
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  document.getElementById('password-error').classList.add('hidden');
  document.getElementById('password-success').classList.add('hidden');
}

function openChangeEmailModal() {
  document.getElementById('change-email-modal').classList.remove('hidden');
  document.getElementById('new-email').value = '';
  document.getElementById('email-change-password').value = '';
  document.getElementById('email-error').classList.add('hidden');
  document.getElementById('email-success').classList.add('hidden');
}

function openDeleteAccountModal() {
  document.getElementById('delete-account-modal').classList.remove('hidden');
  document.getElementById('delete-account-password').value = '';
  document.getElementById('delete-error').classList.add('hidden');
}

function closeAccountModal(modalId, event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById(modalId).classList.add('hidden');
}

async function handleChangePassword() {
  const current = document.getElementById('current-password').value;
  const newPw = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-password').value;
  const errorEl = document.getElementById('password-error');
  const successEl = document.getElementById('password-success');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (!current || !newPw || !confirm) {
    errorEl.textContent = 'Bitte alle Felder ausfüllen.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (newPw !== confirm) {
    errorEl.textContent = 'Passwörter stimmen nicht überein.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (newPw.length < 6) {
    errorEl.textContent = 'Mindestens 6 Zeichen.';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    await apiService.changePassword(current, newPw);
    successEl.textContent = 'Passwort erfolgreich geändert!';
    successEl.classList.remove('hidden');
    setTimeout(
      () =>
        closeAccountModal('change-password-modal', null) ||
        document.getElementById('change-password-modal').classList.add('hidden'),
      1500
    );
  } catch (err) {
    errorEl.textContent = err.message || 'Fehler beim Ändern.';
    errorEl.classList.remove('hidden');
  }
}

async function handleChangeEmail() {
  const newEmail = document.getElementById('new-email').value.trim();
  const password = document.getElementById('email-change-password').value;
  const errorEl = document.getElementById('email-error');
  const successEl = document.getElementById('email-success');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (!newEmail || !password) {
    errorEl.textContent = 'Bitte alle Felder ausfüllen.';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const data = await apiService.changeEmail(newEmail, password);
    localStorage.setItem('b_user_email', data.email || newEmail);
    successEl.textContent = 'E-Mail erfolgreich geändert!';
    successEl.classList.remove('hidden');
    loadAccountInfo();
    setTimeout(() => document.getElementById('change-email-modal').classList.add('hidden'), 1500);
  } catch (err) {
    errorEl.textContent = err.message || 'Fehler beim Ändern.';
    errorEl.classList.remove('hidden');
  }
}

function handleLogout() {
  if (confirm('Möchtest du dich wirklich abmelden?')) {
    if (typeof apiService !== 'undefined') {
      apiService.logout();
    } else {
      localStorage.removeItem('b_auth_token');
      window.location.href = 'login.html';
    }
  }
}

async function handleDeleteAccount() {
  const password = document.getElementById('delete-account-password').value;
  const errorEl = document.getElementById('delete-error');

  errorEl.classList.add('hidden');

  if (!password) {
    errorEl.textContent = 'Passwort erforderlich.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (!confirm('ACHTUNG: Alle Daten werden unwiderruflich gelöscht. Bist du sicher?')) {
    return;
  }

  try {
    await apiService.deleteAccount(password);
    alert('Account wurde gelöscht.');
    window.location.href = 'login.html';
  } catch (err) {
    errorEl.textContent = err.message || 'Fehler beim Löschen.';
    errorEl.classList.remove('hidden');
  }
}

function toggleAnalysisSettingsAccordion() {
  toggleSection('analysis-settings-content', 'analysis-settings-chevron');
}

function toggleVoiceCommands() {
  toggleSection('vc-content', 'vc-chevron');
}

function toggleSection(contentId, chevronId) {
  const content = document.getElementById(contentId);
  const chevron = document.getElementById(chevronId);
  if (!content || !chevron) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    content.classList.add('animate-in', 'slide-in-from-top-2', 'duration-200');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

function toggleAnalysisSetting(type) {
  const key = `b_analysis_${type}`;
  const currentValue = localStorage.getItem(key) !== 'false';
  const newValue = !currentValue;
  localStorage.setItem(key, newValue);
  updateAnalysisToggleUI(type, newValue);
}

function updateAnalysisToggleUI(type, visible) {
  const toggle = document.getElementById(`toggle-analysis-${type}`);
  const knob = document.getElementById(`knob-analysis-${type}`);
  if (!toggle || !knob) return;

  if (visible) {
    toggle.classList.remove('bg-zinc-700');
    toggle.classList.add('bg-primary');
    knob.classList.add('translate-x-5');
  } else {
    toggle.classList.remove('bg-primary');
    toggle.classList.add('bg-zinc-700');
    knob.classList.remove('translate-x-5');
  }
}

function initAnalysisSettings() {
  const types = [
    'heatmap',
    'combined',
    'trend',
    'intensity',
    'time-gap',
    'shot-time',
    'rhythm',
    'mean-shot',
    'direction',
  ];
  types.forEach((type) => {
    const visible = localStorage.getItem(`b_analysis_${type}`) !== 'false';
    updateAnalysisToggleUI(type, visible);
  });
}

function filterSettings(query) {
  const searchTerm = query.toLowerCase().trim();
  const sections = document.querySelectorAll('main section');
  const isConnected = !!localStorage.getItem('b_auth_token');

  sections.forEach((section) => {
    if (section.id === 'account-section' && !isConnected) return;

    const h2 = section.querySelector('h2');
    const h2Text = h2 ? h2.textContent.toLowerCase() : '';
    const sectionMatches = h2Text.includes(searchTerm);

    const card = section.querySelector('.bg-card-dark');
    if (!card) return;

    const items = Array.from(card.children);
    let itemsFound = 0;

    items.forEach((item) => {
      const itemText = item.textContent.toLowerCase();
      const matches = itemText.includes(searchTerm);

      if (searchTerm === '') {
        item.classList.remove('hide-by-search');
        itemsFound++;
      } else if (sectionMatches || matches) {
        item.classList.remove('hide-by-search');
        itemsFound++;

        const isAccordionContent =
          item.id && (item.id.endsWith('-content') || item.id === 'vc-content');
        if (isAccordionContent && matches && !sectionMatches) {
          const chevronId = item.id
            .replace('-content', '-chevron')
            .replace('vc-content', 'vc-chevron');
          const chevron = document.getElementById(chevronId);
          if (chevron) {
            item.classList.remove('hidden');
            chevron.style.transform = 'rotate(180deg)';
          }
        }
      } else {
        item.classList.add('hide-by-search');
      }
    });

    if (searchTerm === '' || sectionMatches || itemsFound > 0) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadServerConfig();
  loadAccountInfo();
  initAnalysisSettings();
});
