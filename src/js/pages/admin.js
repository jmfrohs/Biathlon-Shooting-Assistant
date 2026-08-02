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

// Admin Panel State
let currentTab = 'dashboard';
let allUsers = [];
let selectedUser = null;
let currentModalRole = null;

// Global Toast function
function showToast(message, isError = false) {
  const toast = document.getElementById('status-toast');
  const text = document.getElementById('status-text');
  if (!toast || !text) return;

  text.textContent = message;
  toast.classList.remove(
    'bg-zinc-900/90',
    'border-white/10',
    'bg-neon-red/90',
    'border-neon-red/20'
  );

  if (isError) {
    toast.classList.add('bg-neon-red/90', 'border-neon-red/20');
  } else {
    toast.classList.add('bg-zinc-900/90', 'border-white/10');
  }

  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');

  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 3000);
}

// Show a system message toast for live updates
window.showSystemMessageToast = function (message) {
  showToast(`📢 System-Info: ${message}`);
};

// Switch view tabs
function switchTab(tabId) {
  currentTab = tabId;

  // Update nav buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active', 'border-subtle', 'text-white');
    btn.classList.add('border-transparent', 'text-light-blue-info');
  });

  const activeBtn = document.getElementById(`tab-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'text-white');
    activeBtn.classList.remove('border-transparent');
  }

  // Show active panel
  document.getElementById('panel-dashboard').classList.add('hidden');
  document.getElementById('panel-users').classList.add('hidden');
  document.getElementById('panel-logs').classList.add('hidden');

  document.getElementById(`panel-${tabId}`).classList.remove('hidden');

  // Load data for active panel
  refreshData();
}

// Refresh panel data
async function refreshData() {
  if (typeof apiService === 'undefined' || !apiService.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  if (currentTab === 'dashboard') {
    await loadStats();
  } else if (currentTab === 'users') {
    await loadUsers();
  } else if (currentTab === 'logs') {
    await loadAuditLogs();
  }
}

// 1. Dashboard Stats
async function loadStats() {
  try {
    const stats = await apiService.request('GET', '/api/admin/stats');
    if (!stats) return;

    document.getElementById('stat-users').textContent = stats.userCount;
    document.getElementById('stat-users-blocked').textContent = `${stats.blockedCount} gesperrt`;
    document.getElementById('stat-sockets').textContent = stats.activeSockets;
    document.getElementById('stat-db-size').textContent = `${stats.dbSizeMb} MB`;
    document.getElementById('stat-sessions').textContent = stats.sessionCount;
    document.getElementById('stat-athletes').textContent = `${stats.athleteCount} Sportler`;
  } catch (err) {
    console.error('Failed to load stats:', err);
    showToast('Fehler beim Laden der Systemstatistiken', true);
  }
}

// 2. Users Management
async function loadUsers() {
  try {
    const listContainer = document.getElementById('users-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="text-center py-8 text-zinc-500">Lade Benutzer...</div>';

    allUsers = await apiService.request('GET', '/api/admin/users');
    if (!allUsers) return;

    renderUsersList();
  } catch (err) {
    console.error('Failed to load users:', err);
    showToast('Fehler beim Laden der Benutzerliste', true);
  }
}

function renderUsersList() {
  const listContainer = document.getElementById('users-list');
  const searchInput = document.getElementById('user-search');
  if (!listContainer) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filteredUsers = allUsers.filter((user) => {
    return (
      user.email.toLowerCase().includes(query) ||
      (user.trainer_name && user.trainer_name.toLowerCase().includes(query))
    );
  });

  if (filteredUsers.length === 0) {
    listContainer.innerHTML =
      '<div class="text-center py-8 text-zinc-500">Keine passenden Accounts gefunden.</div>';
    return;
  }

  listContainer.innerHTML = '';
  filteredUsers.forEach((user) => {
    const card = document.createElement('div');
    card.className = `p-4 bg-card-dark border rounded-2xl flex items-center justify-between hover:bg-off-white/5 active:scale-[0.99] transition-all cursor-pointer ${
      user.is_blocked ? 'border-neon-red/30 opacity-75' : 'border-subtle'
    }`;

    card.onclick = () => openUserModal(user);

    // Role styling
    let roleText = 'Coach';
    let roleColorClass = 'bg-primary/20 text-primary border-primary/30';
    if (user.role === 'admin') {
      roleText = 'Admin';
      roleColorClass = 'bg-neon-red/20 text-neon-red border-neon-red/30';
    } else if (user.role === 'athlete') {
      roleText = 'Sportler';
      roleColorClass = 'bg-neon-green/20 text-neon-green border-neon-green/30';
    }

    const formattedDate = user.created_at
      ? new Date(user.created_at).toLocaleDateString('de-DE')
      : '-';

    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center ${user.is_blocked ? 'bg-neon-red/10 text-neon-red' : 'bg-white/5 text-zinc-400'}">
          <span class="material-symbols-outlined">${user.is_blocked ? 'block' : 'person'}</span>
        </div>
        <div class="flex flex-col">
          <span class="font-semibold text-off-white text-sm break-all">${user.email}</span>
          <span class="text-xs text-light-blue-info mt-0.5">${user.trainer_name || 'Unbekannt'} • ${formattedDate}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border rounded-md ${roleColorClass}">${roleText}</span>
        <span class="material-symbols-outlined text-zinc-600 text-[20px]">chevron_right</span>
      </div>
    `;

    listContainer.appendChild(card);
  });
}

// 3. Audit Logs
async function loadAuditLogs() {
  try {
    const container = document.getElementById('logs-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-8 text-zinc-500">Lade Logbuch...</div>';

    const logs = await apiService.request('GET', '/api/admin/audit-logs');
    if (!logs) return;

    if (logs.length === 0) {
      container.innerHTML =
        '<div class="text-center py-8 text-zinc-500">Keine Aktionen protokolliert.</div>';
      return;
    }

    container.innerHTML = '';
    logs.forEach((log) => {
      const el = document.createElement('div');
      el.className = 'p-3 flex flex-col gap-1 text-[11px] audit-log-line';

      const time = new Date(log.created_at).toLocaleString('de-DE');

      // Color actions
      let actionColor = 'text-neon-cyan';
      if (log.action.includes('BLOCK')) {
        actionColor = 'text-neon-red font-bold';
      } else if (log.action.includes('LIMIT')) {
        actionColor = 'text-neon-orange';
      } else if (log.action.includes('ROLE')) {
        actionColor = 'text-neon-green';
      } else if (log.action.includes('CLEANUP') || log.action.includes('BACKUP')) {
        actionColor = 'text-neon-green/80';
      }

      const ip = log.ip_address ? `[${log.ip_address}]` : '';
      const adminEmail = log.admin_email || 'System';

      el.innerHTML = `
        <div class="flex justify-between text-zinc-500">
          <span>${time} ${ip}</span>
          <span class="font-semibold text-zinc-400">${adminEmail}</span>
        </div>
        <div class="mt-0.5">
          <span class="${actionColor}">${log.action}</span>
          <span class="text-off-white/90"> - ${log.details}</span>
        </div>
      `;

      container.appendChild(el);
    });
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    showToast('Fehler beim Laden des Aktivitätsprotokolls', true);
  }
}

// User Modal Operations
function openUserModal(user) {
  selectedUser = user;
  currentModalRole = user.role;

  document.getElementById('modal-user-email').textContent = user.email;
  document.getElementById('modal-user-name').textContent =
    user.trainer_name || 'Kein Trainername hinterlegt';

  const limitInput = document.getElementById('modal-api-limit');
  if (limitInput) limitInput.value = user.api_limit || 100;

  // Set Role Active button
  setModalRoleBtnActive(user.role);

  // Block Button
  const blockBtn = document.getElementById('modal-btn-block');
  if (blockBtn) {
    if (user.is_blocked) {
      blockBtn.textContent = 'Freigeben';
      blockBtn.className =
        'flex-1 py-4 bg-neon-green/20 border border-neon-green/35 text-neon-green font-bold rounded-2xl text-sm transition-all hover:bg-neon-green/25';
    } else {
      blockBtn.textContent = 'Sperren';
      blockBtn.className =
        'flex-1 py-4 bg-neon-red/20 border border-neon-red/35 text-neon-red font-bold rounded-2xl text-sm transition-all hover:bg-neon-red/25';
    }
  }

  // Open Sheet
  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.getElementById('user-modal').classList.remove('translate-y-full');
}

function closeUserModal() {
  document.getElementById('user-modal').classList.add('translate-y-full');
  document.getElementById('modal-backdrop').classList.add('hidden');
  selectedUser = null;
  currentModalRole = null;
}

function setModalRoleBtnActive(role) {
  ['admin', 'coach', 'athlete'].forEach((r) => {
    const btn = document.getElementById(`role-${r}`);
    if (btn) {
      btn.classList.remove(
        'bg-primary',
        'text-white',
        'border-primary',
        'shadow-lg',
        'shadow-primary/25'
      );
      btn.classList.add('bg-white/5', 'text-zinc-300', 'border-subtle');
    }
  });

  const activeBtn = document.getElementById(`role-${role}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white/5', 'text-zinc-300', 'border-subtle');
    activeBtn.classList.add(
      'bg-primary',
      'text-white',
      'border-primary',
      'shadow-lg',
      'shadow-primary/25'
    );
  }
}

// Call API to update role
async function setModalRole(role) {
  if (!selectedUser) return;
  if (role === currentModalRole) return;

  try {
    const res = await apiService.request('POST', `/api/admin/users/${selectedUser.id}/role`, {
      role,
    });
    if (res && res.success) {
      currentModalRole = role;
      selectedUser.role = role;
      setModalRoleBtnActive(role);
      showToast('Benutzerrolle erfolgreich geändert');
      loadUsers(); // Refresh list in background
    }
  } catch (err) {
    console.error('Failed to change role:', err);
    showToast(err.message || 'Fehler beim Ändern der Rolle', true);
  }
}

// Call API to update api request limit
async function applyApiLimit() {
  if (!selectedUser) return;
  const input = document.getElementById('modal-api-limit');
  const limit = parseInt(input?.value, 10);

  if (isNaN(limit) || limit < 5) {
    showToast('Bitte geben Sie ein Limit von mindestens 5 ein.', true);
    return;
  }

  try {
    const res = await apiService.request('POST', `/api/admin/users/${selectedUser.id}/api-limit`, {
      limit,
    });
    if (res && res.success) {
      selectedUser.api_limit = limit;
      showToast('API-Limit erfolgreich aktualisiert');
      loadUsers(); // Refresh
    }
  } catch (err) {
    console.error('Failed to update API limit:', err);
    showToast(err.message || 'Fehler beim Speichern des Limits', true);
  }
}

// Toggle user suspension
async function toggleModalBlock() {
  if (!selectedUser) return;
  const shouldBlock = !selectedUser.is_blocked;

  try {
    const res = await apiService.request('POST', `/api/admin/users/${selectedUser.id}/block`, {
      block: shouldBlock,
    });
    if (res && res.success) {
      selectedUser.is_blocked = res.is_blocked === 1;
      showToast(shouldBlock ? 'Account erfolgreich gesperrt' : 'Account erfolgreich freigegeben');
      closeUserModal();
      loadUsers();
    }
  } catch (err) {
    console.error('Failed to toggle block status:', err);
    showToast(err.message || 'Fehler beim Ändern des Sperrstatus', true);
  }
}

// Download complete user JSON backup
async function downloadModalBackup() {
  if (!selectedUser) return;

  try {
    const response = await fetch(
      `${apiService.baseUrl}/api/admin/users/${selectedUser.id}/backup`,
      {
        headers: apiService.getAuthHeaders(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Backup fehlgeschlagen');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Biathlon_Backup_User_${selectedUser.id}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showToast('Benutzer-Backup erfolgreich geladen');
  } catch (err) {
    console.error('Failed to download user backup:', err);
    showToast(err.message || 'Backup-Download fehlgeschlagen', true);
  }
}

// System Broadcast
async function sendSystemBroadcast() {
  const textarea = document.getElementById('sys-msg-text');
  const message = textarea ? textarea.value.trim() : '';

  if (!message) {
    showToast('Bitte geben Sie eine Nachricht ein.', true);
    return;
  }

  try {
    const res = await apiService.request('POST', '/api/admin/system-message', { message });
    if (res && res.success) {
      showToast('Echtzeit-Nachricht erfolgreich gesendet');
      if (textarea) textarea.value = '';
    }
  } catch (err) {
    console.error('Broadcast failed:', err);
    showToast('Senden fehlgeschlagen', true);
  }
}

// DB cleanup
async function cleanupDemoAccounts() {
  try {
    const res = await apiService.request('POST', '/api/admin/cleanup');
    if (res && res.success) {
      showToast(res.details || 'Demo-Bereinigung abgeschlossen');
    }
  } catch (err) {
    console.error('Cleanup failed:', err);
    showToast('Bereinigung fehlgeschlagen', true);
  }
}

/* --- Admin Security Lock Logic --- */
async function checkAdminLock() {
  if (typeof AdminSecurity === 'undefined') return true;

  const isPinEnabled = AdminSecurity.isPinEnabled();
  if (!isPinEnabled) return true;

  if (AdminSecurity.isUnlocked()) return true;

  const lockScreen = document.getElementById('admin-lock-screen');
  const mainContent = document.getElementById('desktop-main-content');
  const faceIdBtn = document.getElementById('btn-faceid-unlock');
  const pinInput = document.getElementById('lock-pin-input');

  if (mainContent) mainContent.classList.add('hidden');
  if (lockScreen) lockScreen.classList.remove('hidden');

  if (AdminSecurity.isWebAuthnEnabled()) {
    if (faceIdBtn) faceIdBtn.classList.remove('hidden');
    setTimeout(() => {
      unlockAdminWithFaceID();
    }, 300);
  }

  if (pinInput) pinInput.focus();
  return false;
}

async function unlockAdminWithPin() {
  const pinInput = document.getElementById('lock-pin-input');
  const errEl = document.getElementById('lock-error-msg');
  const pin = pinInput?.value;

  if (errEl) {
    errEl.textContent = '';
    errEl.classList.add('hidden');
  }

  if (!pin) {
    if (errEl) {
      errEl.textContent = 'Bitte geben Sie Ihren PIN / Ihr Passwort ein.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  const isValid = await AdminSecurity.verifyPin(pin);
  if (isValid) {
    showAdminUnlocked();
  } else {
    if (errEl) {
      errEl.textContent = 'Falscher PIN / Passwort.';
      errEl.classList.remove('hidden');
    }
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
  }
}

async function unlockAdminWithFaceID() {
  const errEl = document.getElementById('lock-error-msg');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.add('hidden');
  }

  try {
    const success = await AdminSecurity.authenticateWebAuthn();
    if (success) {
      showAdminUnlocked();
    } else {
      if (errEl) {
        errEl.textContent = 'Face ID / Touch ID Verifizierung fehlgeschlagen.';
        errEl.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Biometrie fehlgeschlagen oder abgebrochen.';
      errEl.classList.remove('hidden');
    }
  }
}

function showAdminUnlocked() {
  const lockScreen = document.getElementById('admin-lock-screen');
  const mainContent = document.getElementById('desktop-main-content');

  if (lockScreen) lockScreen.classList.add('hidden');
  if (mainContent) mainContent.classList.remove('hidden');

  refreshData();
}

// DOM Setup
document.addEventListener('DOMContentLoaded', async () => {
  // Check client-side authentication
  if (typeof apiService === 'undefined' || !apiService.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  // Check Admin Security Lock
  const unlocked = await checkAdminLock();
  if (!unlocked) {
    return;
  }

  // Bind Refresh button
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) refreshBtn.onclick = refreshData;

  // Bind Broadcast button
  const broadcastBtn = document.getElementById('btn-send-broadcast');
  if (broadcastBtn) broadcastBtn.onclick = sendSystemBroadcast;

  // Bind Demo cleanup button
  const cleanupBtn = document.getElementById('btn-cleanup-demo');
  if (cleanupBtn) cleanupBtn.onclick = cleanupDemoAccounts;

  // Bind Search input
  const searchInput = document.getElementById('user-search');
  if (searchInput) searchInput.oninput = renderUsersList;

  // Load initial statistics
  refreshData();
});
