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
 * Login Page Logic
 */

let currentTab = 'login';

function switchTab(tab) {
  currentTab = tab;
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');

  hideMessages();

  if (tab === 'login') {
    loginTab.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-primary text-white';
    registerTab.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-light-blue-info';
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    registerTab.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-primary text-white';
    loginTab.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-light-blue-info';
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

function setRegisterRole(role) {
  const coachBtn = document.getElementById('role-coach');
  const athleteBtn = document.getElementById('role-athlete');
  const roleInput = document.getElementById('register-role');

  roleInput.value = role;

  if (role === 'coach') {
    coachBtn.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-primary text-white';
    athleteBtn.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-light-blue-info';
    const nameLabel = document.querySelector('label[for="register-name"]');
    if (nameLabel) nameLabel.textContent = 'Trainername';
    document.getElementById('register-name').placeholder = 'Max Mustermann';
  } else {
    athleteBtn.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-primary text-white';
    coachBtn.className =
      'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-light-blue-info';
    const labels = document.getElementsByTagName('label');
    for (let el of labels) {
      if (el.textContent === 'Trainername') el.textContent = 'Sportlername';
    }
    document.getElementById('register-name').placeholder = 'Lukas Läufer';
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    showError('Bitte E-Mail und Passwort eingeben.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Anmelden...';
  hideMessages();

  try {
    const data = await apiService.login(email, password);
    if (data && data.token) {
      addToLoginHistory(email);
      localStorage.setItem('b_user_email', data.user.email);
      localStorage.setItem('b_user_trainer_name', data.user.trainerName || '');
      localStorage.setItem('b_trainer_name', data.user.trainerName || '');
      if (data.user.role) {
        localStorage.setItem('b_user_role', data.user.role);
      }

      showSuccess('Erfolgreich angemeldet! Synchronisiere Daten...');
      await apiService.syncAfterLogin();
      showSuccess('Synchronisation abgeschlossen!');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    }
  } catch (err) {
    showError(err.message || 'Login fehlgeschlagen. Prüfe deine Verbindung.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Anmelden';
  }
}

async function handleRegister() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const btn = document.getElementById('register-btn');

  if (!name || !email || !password) {
    showError('Bitte alle Felder ausfüllen.');
    return;
  }

  if (password.length < 6) {
    showError('Passwort muss mindestens 6 Zeichen haben.');
    return;
  }

  if (password.toLowerCase() === email.toLowerCase()) {
    showError('Das Passwort darf nicht mit der E-Mail identisch sein.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Erstelle Konto...';
  hideMessages();

  try {
    const role = document.getElementById('register-role').value;
    const data = await apiService.register(email, password, name, role);
    if (data && data.token) {
      localStorage.setItem('b_user_email', data.user.email);
      localStorage.setItem('b_user_trainer_name', data.user.trainerName || '');
      localStorage.setItem('b_trainer_name', data.user.trainerName || '');
      if (data.user.role) {
        localStorage.setItem('b_user_role', data.user.role || role);
      }

      showSuccess('Konto erstellt! Synchronisiere Daten...');
      await apiService.syncAfterLogin();
      showSuccess('Synchronisation abgeschlossen!');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    }
  } catch (err) {
    showError(err.message || 'Registrierung fehlgeschlagen.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Konto erstellen';
  }
}

function updatePasswordStrength(password) {
  const bars = [
    document.getElementById('strength-bar-1'),
    document.getElementById('strength-bar-2'),
    document.getElementById('strength-bar-3'),
    document.getElementById('strength-bar-4'),
  ];
  const label = document.getElementById('password-strength-label');

  if (!password) {
    bars.forEach((b) => (b.className = 'h-full flex-1 bg-white/10 rounded-full transition-all'));
    label.textContent = '-';
    label.className = 'text-[10px] font-bold uppercase tracking-widest text-light-blue-info/30';
    return;
  }

  let score = 0;

  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasUpper && hasLower) score += 1;
  if (hasNumber && hasSpecial) score += 1;
  else if (hasNumber || hasSpecial) score += 0.5;

  const commonPatterns = ['123', 'abc', 'qwertz', 'asdf', 'password', 'passwort'];
  let isPattern = false;
  commonPatterns.forEach((p) => {
    if (password.toLowerCase().includes(p)) isPattern = true;
  });

  if (/(\w)\1\1\1/.test(password)) isPattern = true;
  if (/^\d+$/.test(password) && password.length < 10) isPattern = true;

  if (isPattern) score = Math.max(1, score - 1.5);

  const strength = Math.min(4, Math.max(1, Math.ceil(score)));

  const configs = [
    { text: 'Unsicher', color: 'bg-red-500' },
    { text: 'Schwach', color: 'bg-orange-500' },
    { text: 'Gut', color: 'bg-yellow-500' },
    { text: 'Sicher', color: 'bg-neon-green' },
  ];

  const config = configs[strength - 1];

  bars.forEach((bar, i) => {
    if (i < strength) {
      bar.className = `h-full flex-1 ${config.color} rounded-full transition-all duration-500`;
    } else {
      bar.className = 'h-full flex-1 bg-white/10 rounded-full transition-all duration-500';
    }
  });

  label.textContent = config.text;
  label.className = `text-[10px] font-bold uppercase tracking-widest ${config.color.replace('bg-', 'text-')}`;
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  const msgEl = document.getElementById('auth-error-msg');
  msgEl.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('auth-success').classList.add('hidden');

  el.classList.remove('slide-in-from-top-4', 'animate-shake');
  void el.offsetWidth;
  el.classList.add('slide-in-from-top-4', 'animate-shake');
}

function showSuccess(msg) {
  const el = document.getElementById('auth-success');
  const msgEl = document.getElementById('auth-success-msg');
  msgEl.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('auth-error').classList.add('hidden');

  el.classList.remove('slide-in-from-top-4');
  void el.offsetWidth;
  el.classList.add('slide-in-from-top-4');
}

function hideMessages() {
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-success').classList.add('hidden');
}

function addToLoginHistory(email) {
  let history = JSON.parse(localStorage.getItem('b_login_history') || '[]');
  history = history.filter((item) => item !== email);
  history.unshift(email);
  history = history.slice(0, 3);
  localStorage.setItem('b_login_history', JSON.stringify(history));
  updateLoginHistoryUI();
}

function updateLoginHistoryUI() {
  const history = JSON.parse(localStorage.getItem('b_login_history') || '[]');
  const container = document.getElementById('login-email-history');

  if (history.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = '';

  history.forEach((email) => {
    const chip = document.createElement('div');
    chip.className =
      'px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-light-blue-info hover:border-primary/50 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5';
    chip.innerHTML = `<span class="material-symbols-outlined text-[10px]">person</span> ${email}`;
    chip.onclick = () => {
      document.getElementById('login-email').value = email;
    };
    container.appendChild(chip);
  });
}

function useLocalMode() {
  apiService.clearServerUrl();
  apiService.clearToken();
  window.location.href = 'index.html';
}

function toggleServerConfig() {
  const config = document.getElementById('server-config');
  config.classList.toggle('hidden');
  if (!config.classList.contains('hidden')) {
    const urlInput = document.getElementById('server-url-input');
    urlInput.value = localStorage.getItem('b_server_url') || apiService.baseUrl;
    updateServerHistoryUI();
    checkServerStatus();
  }
}

function saveServerUrl() {
  const url = document.getElementById('server-url-input').value.trim();
  if (url) {
    apiService.setServerUrl(url);
    checkServerStatus().then((online) => {
      if (online) addToServerHistory(url);
    });
  }
}

function selectServer(url, name) {
  document.getElementById('server-url-input').value = url;
  apiService.setServerUrl(url);
  checkServerStatus().then((online) => {
    if (online) addToServerHistory(url);
  });
}

function addToServerHistory(url) {
  let history = JSON.parse(localStorage.getItem('b_server_history') || '[]');
  history = history.filter((item) => item !== url);
  history.unshift(url);
  history = history.slice(0, 4);
  localStorage.setItem('b_server_history', JSON.stringify(history));
  updateServerHistoryUI();
}

function updateServerHistoryUI() {
  const history = JSON.parse(localStorage.getItem('b_server_history') || '[]');
  const container = document.getElementById('server-history-container');
  const list = document.getElementById('server-history-list');

  if (history.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = '';

  const presets = ['http://91.99.192.176:3001', 'http://localhost:3001'];

  history.forEach((url) => {
    if (presets.includes(url)) return;

    const chip = document.createElement('div');
    const displayUrl = url.replace('http://', '').replace('https://', '');
    chip.className =
      'px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-light-blue-info hover:border-primary/50 cursor-pointer active:scale-95 transition-all';
    chip.textContent = displayUrl;
    chip.onclick = () => selectServer(url, displayUrl);
    list.appendChild(chip);
  });

  if (list.children.length === 0) container.classList.add('hidden');
}

function setDefaultServer() {
  selectServer('http://91.99.192.176:3001', 'Standard-Server');
}

async function checkServerStatus() {
  const dot = document.getElementById('server-dot');
  const text = document.getElementById('server-text');
  dot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
  text.textContent = 'Verbinde...';

  const online = await apiService.checkConnection();

  if (online) {
    dot.className = 'w-2 h-2 rounded-full bg-neon-green';
    text.textContent = 'Server erreichbar ✓';
    text.className = 'text-neon-green text-xs';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-red-500';
    text.textContent = 'Server nicht erreichbar';
    text.className = 'text-red-400 text-xs';
  }
  return online;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!apiService.isServerMode()) {
    const hasServerUrl = localStorage.getItem('b_server_url');
    if (!hasServerUrl) {
      window.location.href = 'settings.html';
      return;
    }
  }

  if (apiService.isLoggedIn()) {
    apiService
      .getProfile()
      .then(() => {
        window.location.href = 'index.html';
      })
      .catch(() => {
        apiService.clearToken();
      });
  }

  updateLoginHistoryUI();

  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('register-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

  document.getElementById('register-password').addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
  });
});
