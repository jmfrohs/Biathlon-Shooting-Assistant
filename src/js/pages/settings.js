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
  if (!container) return;

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
  const el = document.getElementById('new-age-input');
  if (el) {
    const n = el.value;
    if (n && n.trim()) {
      const g = loadAgeGroups();
      if (!g.includes(n.trim())) {
        g.push(n.trim());
        saveAgeGroups(g);
      }
      el.value = '';
    }
    renderChips('age');
  } else {
    const name = prompt('Name der neuen Altersklasse:');
    if (name && name.trim()) {
      const groups = loadAgeGroups();
      if (!groups.includes(name.trim())) {
        groups.push(name.trim());
        saveAgeGroups(groups);
        if (typeof renderAgeGroups === 'function') renderAgeGroups();
      }
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
  if (!container) return;

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
  const el = document.getElementById('new-kader-input');
  if (el) {
    const n = el.value;
    if (n && n.trim()) {
      const k = loadKaders();
      if (!k.includes(n.trim())) {
        k.push(n.trim());
        saveKaders(k);
      }
      el.value = '';
    }
    renderChips('kader');
  } else {
    const name = prompt('Name des neuen Kaders:');
    if (name && name.trim()) {
      const kaders = loadKaders();
      if (!kaders.includes(name.trim())) {
        kaders.push(name.trim());
        saveKaders(kaders);
        if (typeof renderKader === 'function') renderKader();
      }
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
  if (!container) return;

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
  const el = document.getElementById('new-fed-input');
  if (el) {
    const n = el.value;
    if (n && n.trim()) {
      const f = loadFederations();
      if (!f.includes(n.trim())) {
        f.push(n.trim());
        saveFederations(f);
      }
      el.value = '';
    }
    renderChips('fed');
  } else {
    const name = prompt('Name des neuen Skiverbands:');
    if (name && name.trim()) {
      const federations = loadFederations();
      if (!federations.includes(name.trim())) {
        federations.push(name.trim());
        saveFederations(federations);
        if (typeof renderFederation === 'function') renderFederation();
      }
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
  if (!container) return;

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
  const el = document.getElementById('new-country-input');
  if (el) {
    const n = el.value;
    if (n && n.trim()) {
      const c = loadCountries();
      if (!c.includes(n.trim())) {
        c.push(n.trim());
        saveCountries(c);
      }
      el.value = '';
    }
    renderChips('country');
  } else {
    const name = prompt('Name des neuen Landes:');
    if (name && name.trim()) {
      const countries = loadCountries();
      if (!countries.includes(name.trim())) {
        countries.push(name.trim());
        saveCountries(countries);
        if (typeof renderCountry === 'function') renderCountry();
      }
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

const DEFAULT_SERVER_IP = 'https://biathlon-shooting-assistant.duckdns.org';

function updateAutoNetworkFallbackUI(enabled) {
  const toggle = document.getElementById('auto-network-fallback-toggle');
  const knob = document.getElementById('auto-network-fallback-knob');
  const state = document.getElementById('auto-network-fallback-state');
  if (!toggle || !state) return;

  if (enabled) {
    toggle.classList.remove('bg-zinc-700');
    toggle.classList.add('bg-primary');
    if (knob) knob.classList.add('translate-x-5');
  } else {
    toggle.classList.remove('bg-primary');
    toggle.classList.add('bg-zinc-700');
    if (knob) knob.classList.remove('translate-x-5');
  }

  if (!enabled) {
    state.textContent = t('auto_network_fallback_off');
    state.className = 'text-xs text-zinc-500';
    return;
  }

  const inFallback = typeof apiService !== 'undefined' && apiService.isInLocalFallback();
  state.textContent = inFallback ? t('network_mode_local_fallback') : t('network_mode_server');
  state.className = inFallback ? 'text-xs text-amber-400' : 'text-xs text-green-400';
}

function toggleAutoNetworkFallback() {
  const current = localStorage.getItem('b_auto_network_fallback') === 'true';
  const next = !current;
  localStorage.setItem('b_auto_network_fallback', next ? 'true' : 'false');

  if (
    typeof apiService !== 'undefined' &&
    typeof apiService.setAutoNetworkFallbackEnabled === 'function'
  ) {
    apiService.setAutoNetworkFallbackEnabled(next);
  }

  updateAutoNetworkFallbackUI(next);
}

function initAutoNetworkFallback() {
  const enabled = localStorage.getItem('b_auto_network_fallback') === 'true';
  updateAutoNetworkFallbackUI(enabled);
}

function updateServerHistoryUI() {
  const history = JSON.parse(localStorage.getItem('b_server_history') || '[]');
  const container = document.getElementById('server-history-container');
  const list = document.getElementById('server-history-list');
  if (!container || !list) return;

  if (history.length === 0) {
    container.classList.add('hidden');
    return;
  }

  const presets = ['https://biathlon-shooting-assistant.duckdns.org', 'http://localhost:3001'];

  list.innerHTML = '';
  history.forEach((url) => {
    if (presets.includes(url)) return;
    const chip = document.createElement('div');
    const displayUrl = url.replace('http://', '').replace('https://', '');
    chip.className =
      'px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-light-blue-info hover:border-primary/50 cursor-pointer active:scale-95 transition-all';
    chip.textContent = displayUrl;
    chip.onclick = () => {
      const ipInput = document.getElementById('server-ip-input');
      if (ipInput) ipInput.value = displayUrl;
    };
    list.appendChild(chip);
  });

  container.classList.toggle('hidden', list.children.length === 0);
}

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

  updateServerHistoryUI();

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

  text.removeAttribute('data-i18n');

  switch (state) {
    case 'checking':
      dot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
      text.textContent = message || t('connecting') || 'Verbinde...';
      text.className = 'text-yellow-400 text-xs';
      break;
    case 'connected':
      dot.className = 'w-2 h-2 rounded-full bg-green-500';
      text.textContent = message || t('server_connected') || 'Server verbunden ✓';
      text.className = 'text-green-400 text-xs';
      break;
    case 'error':
      dot.className = 'w-2 h-2 rounded-full bg-red-500';
      text.textContent = message || t('server_unreachable') || 'Server nicht erreichbar';
      text.className = 'text-red-400 text-xs';
      break;
    case 'disconnected':
    default:
      dot.className = 'w-2 h-2 rounded-full bg-zinc-600';
      text.textContent = message || t('not_connected') || 'Nicht verbunden';
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
  localStorage.removeItem('b_user_profile_image');

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
  const types = ['heatmap', 'combined', 'trend', 'mean-shot', 'direction'];
  types.forEach((type) => {
    const visible = localStorage.getItem(`b_analysis_${type}`) !== 'false';
    updateAnalysisToggleUI(type, visible);
  });
}

function filterSettings(query) {
  const searchTerm = query.toLowerCase().trim();

  // Easter Egg: Schladming Andi
  if (searchTerm === 'schladming andi') {
    window.location.href = 'https://www.tiktok.com/@janggandersen';
    return;
  }

  const sections = document.querySelectorAll('main section');
  const isConnected = !!localStorage.getItem('b_auth_token');
  let anyVisible = false;

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
      anyVisible = true;
    } else {
      section.classList.add('hidden');
    }
  });

  const noResultsEl = document.getElementById('no-settings-results');
  const suggestionsEl = document.getElementById('settings-suggestions');
  if (noResultsEl) {
    if (!anyVisible && searchTerm !== '') {
      noResultsEl.classList.remove('hidden');
      if (suggestionsEl) {
        // Collect settings names dynamically from translated elements
        const items = Array.from(document.querySelectorAll('main section .bg-card-dark > div'));
        const candidates = items
          .map((item) => {
            const titleEl =
              item.querySelector('[data-i18n]') || item.querySelector('.text-off-white');
            return titleEl ? titleEl.textContent.trim() : '';
          })
          .filter(Boolean);

        const suggestions = getBestSuggestions(searchTerm, candidates);
        if (suggestions.length > 0) {
          suggestionsEl.innerHTML = `
            <span class="text-xs text-light-blue-info/50 font-medium">${t('did_you_mean')}</span>
            <div class="flex flex-wrap gap-2 justify-center">
              ${suggestions
                .map(
                  (s) => `
                <button onclick="window.applySettingsSuggestion('${s.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-primary/10 hover:bg-primary/25 border border-primary/20 hover:border-primary/40 text-xs text-primary font-medium rounded-full transition-all duration-200 cursor-pointer">
                  ${s}
                </button>
              `
                )
                .join('')}
            </div>
          `;
        } else {
          suggestionsEl.innerHTML = '';
        }
      }
    } else {
      noResultsEl.classList.add('hidden');
    }
  }
}

window.applySettingsSuggestion = (value) => {
  const searchInput = document.getElementById('settings-search');
  if (searchInput) {
    searchInput.value = value;
    filterSettings(value);
  }
};

async function selectServer(url, name) {
  const ipInput = document.getElementById('server-ip-input');
  if (ipInput) {
    ipInput.value = url.replace(/^https?:\/\//, '');
  }
  apiService.setServerUrl(url);
  const online = await apiService.checkConnection();
  if (online) {
    const history = JSON.parse(localStorage.getItem('b_server_history') || '[]');
    const filtered = history.filter((item) => item !== url);
    filtered.unshift(url);
    localStorage.setItem('b_server_history', JSON.stringify(filtered));
    window.location.href = 'index.html';
  }
}

function navigateBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = 'menu.html';
}

function confirmClearAllData() {
  const modal = document.getElementById('clear-data-modal');
  const input = document.getElementById('delete-confirmation-input');
  if (modal) {
    modal.classList.remove('hidden');
  }
  if (input) {
    input.value = '';
    input.focus();
  }
}

function closeClearDataModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('clear-data-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function executeClearAllData() {
  const input = document.getElementById('delete-confirmation-input');
  if (input && input.value.trim() === 'DELETE') {
    localStorage.clear();
    location.reload();
  } else {
    alert('Bitte schreibe DELETE zur Bestätigung.');
    if (input) input.focus();
  }
}

function openLanguageModal() {
  const modal = document.getElementById('language-modal');
  if (modal) {
    modal.classList.remove('hidden');
    updateLanguageCheckmarks();
  }
}

function closeLanguageModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('language-modal');
  if (modal) modal.classList.add('hidden');
}

function setLanguage(lang) {
  localStorage.setItem('b_language', lang);
  if (typeof translateApp === 'function') {
    translateApp();
  } else {
    translateUI();
  }
  updateLanguageDisplay();
  updateLanguageCheckmarks();
}

function updateLanguageDisplay() {
  const lang = localStorage.getItem('b_language') || 'de';
  const display = document.getElementById('language-display');
  if (display) {
    display.textContent = lang === 'de' ? 'Deutsch' : 'English';
  }
}

function updateLanguageCheckmarks() {
  const lang = localStorage.getItem('b_language') || 'de';
  const checkDe = document.getElementById('check-de');
  const checkEn = document.getElementById('check-en');
  const btnDe = document.getElementById('lang-de-btn');
  const btnEn = document.getElementById('lang-en-btn');
  if (lang === 'de') {
    if (checkDe) checkDe.classList.remove('hidden');
    if (checkEn) checkEn.classList.add('hidden');
    if (btnDe) btnDe.classList.add('bg-primary/20', 'border-primary');
    if (btnEn) btnEn.classList.remove('bg-primary/20', 'border-primary');
  } else {
    if (checkDe) checkDe.classList.add('hidden');
    if (checkEn) checkEn.classList.remove('hidden');
    if (btnDe) btnDe.classList.remove('bg-primary/20', 'border-primary');
    if (btnEn) btnEn.classList.add('bg-primary/20', 'border-primary');
  }
}

function translateUI() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) el.textContent = val;
    }
  });
}

const ATHLETE_SECTIONS = {
  age: {
    modal: 'modal-age',
    chips: 'age-chips',
    summary: 'age-summary',
    load: loadAgeGroups,
    save: saveAgeGroups,
    del: deleteAgeGroup,
    add: addAgeGroup,
  },
  kader: {
    modal: 'modal-kader',
    chips: 'kader-chips',
    summary: 'kader-summary',
    load: loadKaders,
    save: saveKaders,
    del: deleteKader,
    add: addKader,
  },
  country: {
    modal: 'modal-country',
    chips: 'country-chips',
    summary: 'country-summary',
    load: loadCountries,
    save: saveCountries,
    del: deleteCountry,
    add: addCountry,
  },
  fed: {
    modal: 'modal-fed',
    chips: 'fed-chips',
    summary: 'fed-summary',
    load: loadFederations,
    save: saveFederations,
    del: deleteFederation,
    add: addFederation,
  },
};

function renderChips(key) {
  if (typeof ATHLETE_SECTIONS === 'undefined') return;
  const cfg = ATHLETE_SECTIONS[key];
  const items = cfg.load();
  const container = document.getElementById(cfg.chips);
  if (!container) return;
  if (!items.length) {
    container.innerHTML =
      '<span class="text-xs text-light-blue-info/50 italic">Keine Einträge</span>';
  } else {
    container.innerHTML = items
      .map(
        (item) => `
      <span class="tag-chip">
        ${item}
        <button class="remove-btn" onclick="safeDelete(${JSON.stringify(key)}, ${JSON.stringify(item)})">×</button>
      </span>`
      )
      .join('');
  }
  updateSummary(key, items);
}

function updateSummary(key, items) {
  if (typeof ATHLETE_SECTIONS === 'undefined') return;
  const el = document.getElementById(ATHLETE_SECTIONS[key].summary);
  if (!el) return;
  if (!items || !items.length) {
    el.textContent = '—';
    return;
  }
  const preview = items.slice(0, 2).join(', ');
  const rest = items.length > 2 ? ` +${items.length - 2}` : '';
  el.textContent = preview + rest;
}

function safeDelete(key, item) {
  if (typeof ATHLETE_SECTIONS === 'undefined') return;
  const cfg = ATHLETE_SECTIONS[key];
  cfg.del(item);
  renderChips(key);
}

function openModal(key) {
  if (typeof ATHLETE_SECTIONS === 'undefined') return;
  renderChips(key);
  const modal = document.getElementById(ATHLETE_SECTIONS[key].modal);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(key, event) {
  if (typeof ATHLETE_SECTIONS === 'undefined') return;
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById(ATHLETE_SECTIONS[key].modal);
  if (modal) modal.classList.add('hidden');
  updateSummary(key, ATHLETE_SECTIONS[key].load());
}

document.addEventListener('DOMContentLoaded', () => {
  const deleteInput = document.getElementById('delete-confirmation-input');
  if (deleteInput) {
    deleteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        executeClearAllData();
      }
    });
  }

  loadServerConfig();
  loadAccountInfo();
  initAnalysisSettings();
  initAutoNetworkFallback();
  updateLanguageDisplay();

  if (typeof translateApp === 'function') {
    translateApp();
  } else {
    translateUI();
  }

  if (document.getElementById('age-summary') || document.getElementById('kader-summary')) {
    Object.keys(ATHLETE_SECTIONS).forEach((key) => {
      updateSummary(key, ATHLETE_SECTIONS[key].load());
    });
  }

  window.addEventListener('b-network-mode-change', () => {
    const enabled = localStorage.getItem('b_auto_network_fallback') === 'true';
    updateAutoNetworkFallbackUI(enabled);
  });

  // Höre auf localStorage-Änderungen (z.B. von profile.html)
  window.addEventListener('storage', (event) => {
    if (event.key === 'b_user_trainer_name' || event.key === 'b_user_email') {
      loadAccountInfo();
    }
  });

  // Höre auf Custom Event von profile.html für direkte Updates
  window.addEventListener('profile-data-updated', () => {
    loadAccountInfo();
  });
});
