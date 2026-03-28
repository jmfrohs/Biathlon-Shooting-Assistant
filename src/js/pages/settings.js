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

const defaultAgeGroups = ['AK 16', 'AK 17', 'AK 18 -1', 'AK 18 -2', 'Junioren', 'Senioren'];
const defaultKaders = ['Nothing', 'LK1', 'LK2', 'NK2', 'NK1', 'OK', 'PK'];

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
document.addEventListener('DOMContentLoaded', () => {
  const editAgeGroupBtn = document.getElementById('editAgeGroupBtn');
  const editKaderBtn = document.getElementById('editKaderBtn');
  if (editAgeGroupBtn) {
    editAgeGroupBtn.addEventListener('click', () => {
      showAgeGroupModal();
    });
  }

  if (editKaderBtn) {
    editKaderBtn.addEventListener('click', () => {
      showKaderModal();
    });
  }
});

function showAgeGroupModal() {
  const ageGroups = loadAgeGroups();
  let athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  let html = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="ageGroupModal">
      <div class="bg-card-dark rounded-3xl p-6 w-[95%] max-w-4xl max-h-[85vh] flex flex-col border border-white/10">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-off-white">Age Group Management</h2>
          <button class="text-white/50 hover:text-white" id="closeAgeGroupModalBtn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4" id="ageGroupContainer">
  `;
  ageGroups.forEach((group) => {
    const groupAthletes = athletes.filter((a) => a.ageGroup === group);
    html += `
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-bold text-primary">${group} (${groupAthletes.length})</h3>
          <button class="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-500/20" data-delete-age="${group}">Delete</button>
        </div>
        <div class="space-y-2 min-h-[50px] bg-white/3 rounded-lg p-2" data-age-group="${group}">
    `;
    if (groupAthletes.length === 0) {
      html += `<p class="text-xs text-light-blue-info/60 italic px-2 py-1">Keine Athletes in dieser Gruppe</p>`;
    } else {
      groupAthletes.forEach((athlete) => {
        html += `
          <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 cursor-move hover:bg-white/10 transition-colors active:opacity-70" draggable="true" data-athlete-id="${athlete.id}">
            <span class="text-sm text-off-white">${athlete.firstName} ${athlete.lastName}</span>
            <span class="text-xs text-light-blue-info">${athlete.squad}</span>
          </div>
        `;
      });
    }
    html += `
        </div>
      </div>
    `;
  });
  html += `
        </div>
        <div class="flex gap-2">
          <button class="flex-1 bg-primary text-white font-semibold py-3 rounded-xl" id="addAgeGroupBtn">+ Add Age Group</button>
          <button class="flex-1 bg-white/10 text-white font-semibold py-3 rounded-xl" id="closeAgeGroupBtn">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('ageGroupModal');
  const container = document.getElementById('ageGroupContainer');
  modal.querySelectorAll('[data-delete-age]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ageToDelete = btn.getAttribute('data-delete-age');
      const groupAthletes = athletes.filter((a) => a.ageGroup === ageToDelete);
      if (groupAthletes.length > 0) {
        alert('Cannot delete age group with athletes. Move or delete athletes first.');
        return;
      }

      const updatedGroups = ageGroups.filter((g) => g !== ageToDelete);
      saveAgeGroups(updatedGroups);
      modal.remove();
      showAgeGroupModal();
    });
  });
  document.getElementById('addAgeGroupBtn').addEventListener('click', () => {
    const newName = prompt('Enter new age group name:');
    if (newName && newName.trim()) {
      if (!ageGroups.includes(newName.trim())) {
        ageGroups.push(newName.trim());
        saveAgeGroups(ageGroups);
        modal.remove();
        showAgeGroupModal();
      } else {
        alert('Age group already exists!');
      }
    }
  });
  let draggedElement = null;
  container.querySelectorAll('[draggable="true"]').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      draggedElement = el;
      el.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      if (draggedElement) {
        draggedElement.style.opacity = '1';
      }
      draggedElement = null;
    });
  });
  container.querySelectorAll('[data-age-group]').forEach((dropZone) => {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('bg-primary/20', 'border-primary');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('bg-primary/20', 'border-primary');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-primary/20', 'border-primary');
      if (draggedElement) {
        const athleteId = parseInt(draggedElement.getAttribute('data-athlete-id'));
        const targetAgeGroup = dropZone.getAttribute('data-age-group');
        athletes = JSON.parse(localStorage.getItem('athletes')) || [];
        const athlete = athletes.find((a) => a.id === athleteId);
        if (athlete && athlete.ageGroup !== targetAgeGroup) {
          athlete.ageGroup = targetAgeGroup;
          localStorage.setItem('athletes', JSON.stringify(athletes));
          draggedElement.style.opacity = '1';
          draggedElement = null;
          modal.remove();
          showAgeGroupModal();
        }
      }
    });
  });
  document.getElementById('closeAgeGroupBtn').addEventListener('click', () => {
    modal.remove();
  });
  document.getElementById('closeAgeGroupModalBtn').addEventListener('click', () => {
    modal.remove();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function showKaderModal() {
  const kaders = loadKaders();
  let athletes = JSON.parse(localStorage.getItem('athletes')) || [];
  let html = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="kaderModal">
      <div class="bg-card-dark rounded-3xl p-6 w-[95%] max-w-4xl max-h-[85vh] flex flex-col border border-white/10">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-off-white">Squad/Kader Management</h2>
          <button class="text-white/50 hover:text-white" id="closeKaderModalBtn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4" id="kaderContainer">
  `;
  kaders.forEach((kader) => {
    const kaderAthletes = athletes.filter((a) => a.squad === kader);
    html += `
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-bold text-primary">${kader} (${kaderAthletes.length})</h3>
          <button class="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-500/20" data-delete-kader="${kader}">Delete</button>
        </div>
        <div class="space-y-2 min-h-[50px] bg-white/3 rounded-lg p-2" data-kader="${kader}">
    `;
    if (kaderAthletes.length === 0) {
      html += `<p class="text-xs text-light-blue-info/60 italic px-2 py-1">Keine Athletes in diesem Squad</p>`;
    } else {
      kaderAthletes.forEach((athlete) => {
        html += `
          <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 cursor-move hover:bg-white/10 transition-colors active:opacity-70" draggable="true" data-athlete-id="${athlete.id}">
            <span class="text-sm text-off-white">${athlete.firstName} ${athlete.lastName}</span>
            <span class="text-xs text-light-blue-info">${athlete.ageGroup}</span>
          </div>
        `;
      });
    }
    html += `
        </div>
      </div>
    `;
  });
  html += `
        </div>
        <div class="flex gap-2">
          <button class="flex-1 bg-primary text-white font-semibold py-3 rounded-xl" id="addKaderBtn">+ Add Squad/Kader</button>
          <button class="flex-1 bg-white/10 text-white font-semibold py-3 rounded-xl" id="closeKaderBtn">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('kaderModal');
  const container = document.getElementById('kaderContainer');
  modal.querySelectorAll('[data-delete-kader]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kaderToDelete = btn.getAttribute('data-delete-kader');
      const kaderAthletes = athletes.filter((a) => a.squad === kaderToDelete);
      if (kaderAthletes.length > 0) {
        alert('Cannot delete squad with athletes. Move or delete athletes first.');
        return;
      }

      const updatedKaders = kaders.filter((k) => k !== kaderToDelete);
      saveKaders(updatedKaders);
      modal.remove();
      showKaderModal();
    });
  });
  document.getElementById('addKaderBtn').addEventListener('click', () => {
    const newName = prompt('Enter new squad/kader name:');
    if (newName && newName.trim()) {
      if (!kaders.includes(newName.trim())) {
        kaders.push(newName.trim());
        saveKaders(kaders);
        modal.remove();
        showKaderModal();
      } else {
        alert('Squad already exists!');
      }
    }
  });
  let draggedElement = null;
  container.querySelectorAll('[draggable="true"]').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      draggedElement = el;
      el.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      if (draggedElement) {
        draggedElement.style.opacity = '1';
      }
      draggedElement = null;
    });
  });
  container.querySelectorAll('[data-kader]').forEach((dropZone) => {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('bg-primary/20', 'border-primary');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('bg-primary/20', 'border-primary');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-primary/20', 'border-primary');
      if (draggedElement) {
        const athleteId = parseInt(draggedElement.getAttribute('data-athlete-id'));
        const targetKader = dropZone.getAttribute('data-kader');
        athletes = JSON.parse(localStorage.getItem('athletes')) || [];
        const athlete = athletes.find((a) => a.id === athleteId);
        if (athlete && athlete.squad !== targetKader) {
          athlete.squad = targetKader;
          localStorage.setItem('athletes', JSON.stringify(athletes));
          draggedElement.style.opacity = '1';
          draggedElement = null;
          modal.remove();
          showKaderModal();
        }
      }
    });
  });
  document.getElementById('closeKaderBtn').addEventListener('click', () => {
    modal.remove();
  });
  document.getElementById('closeKaderModalBtn').addEventListener('click', () => {
    modal.remove();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
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
  if (accountSection) accountSection.classList.toggle('hidden', !isConnected);

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

  const url = ip.startsWith('http') ? ip : `http://${ip}`;
  updateServerStatus('checking');

  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      updateServerStatus('connected');
      return true;
    }

    updateServerStatus('error');
    return false;
  } catch {
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
  const dot = document.getElementById('account-dot');
  const statusText = document.getElementById('account-status-text');

  if (!emailEl) return;

  const cachedEmail = localStorage.getItem('b_user_email');
  if (cachedEmail) {
    emailEl.textContent = cachedEmail;
  }

  if (typeof apiService !== 'undefined' && apiService.isLoggedIn()) {
    apiService
      .getProfile()
      .then((profile) => {
        if (profile) {
          emailEl.textContent = profile.email;
          const date = new Date(profile.createdAt);
          sinceEl.textContent = `Mitglied seit ${date.toLocaleDateString('de')}`;
          localStorage.setItem('b_user_email', profile.email);
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

document.addEventListener('DOMContentLoaded', () => {
  loadServerConfig();
  loadAccountInfo();
});
