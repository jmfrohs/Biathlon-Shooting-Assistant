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
let allowRegisterFromCreateAccount = false;

function isDesktopDeviceSelection() {
  if (typeof getDeviceSize === 'function') {
    return getDeviceSize() === 'pc';
  }

  return localStorage.getItem('b_device_size') === 'pc';
}

function applyRegistrationAvailability() {
  const registerTab = document.getElementById('tab-register');
  const registerForm = document.getElementById('form-register');
  const createAccountBtn = document.querySelector('button[data-i18n="create_account"]');

  if (isDesktopDeviceSelection()) {
    if (registerTab) {
      registerTab.classList.remove('opacity-50', 'cursor-not-allowed');
      registerTab.disabled = false;
    }
    if (createAccountBtn) {
      createAccountBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      createAccountBtn.disabled = false;
    }
    return;
  }

  if (currentTab === 'register') {
    switchTab('login');
  }

  if (registerTab) {
    registerTab.classList.add('opacity-50', 'cursor-not-allowed');
    registerTab.disabled = true;
  }
  if (registerForm) {
    registerForm.classList.add('hidden');
  }
  if (createAccountBtn) {
    createAccountBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    createAccountBtn.disabled = false;
  }
}

function switchTab(tab) {
  if (tab === 'register' && !isDesktopDeviceSelection() && !allowRegisterFromCreateAccount) {
    return;
  }

  allowRegisterFromCreateAccount = false;

  currentTab = tab;
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const demoBtn = document.getElementById('demo-btn');
  const backToLoginBtn = document.getElementById('back-to-login-btn');
  const activeTabClass =
    'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-primary text-white';
  const inactiveTabClass =
    'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-light-blue-info';

  hideMessages();
  clearFormValidationMarks();

  if (tab === 'login') {
    if (loginTab) {
      loginTab.className = activeTabClass;
    }
    if (registerTab) {
      registerTab.className = inactiveTabClass;
    }
    if (loginForm) {
      loginForm.classList.remove('hidden');
    }
    if (registerForm) {
      registerForm.classList.add('hidden');
    }
    if (demoBtn) {
      demoBtn.classList.add('hidden');
    }
    if (backToLoginBtn) {
      backToLoginBtn.classList.add('hidden');
    }
  } else {
    if (registerTab) {
      registerTab.className = activeTabClass;
    }
    if (loginTab) {
      loginTab.className = inactiveTabClass;
    }
    if (registerForm) {
      registerForm.classList.remove('hidden');
    }
    if (loginForm) {
      loginForm.classList.add('hidden');
    }
    if (demoBtn) {
      demoBtn.classList.remove('hidden');
    }
    if (backToLoginBtn) {
      backToLoginBtn.classList.remove('hidden');
    }
  }
}

function openRegisterFromCreateAccount() {
  allowRegisterFromCreateAccount = true;
  switchTab('register');
}

function isValidEmailAddress(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearFieldValidation(field) {
  if (!field) return;
  field.removeAttribute('aria-invalid');
  field.style.removeProperty('border-color');
  field.style.removeProperty('background-color');
  field.style.removeProperty('box-shadow');
}

function markFieldInvalid(field) {
  if (!field) return;
  field.setAttribute('aria-invalid', 'true');
  field.style.setProperty('border-color', '#ef4444', 'important');
  field.style.setProperty('background-color', 'rgba(239, 68, 68, 0.08)', 'important');
  field.style.setProperty('box-shadow', '0 0 0 4px rgba(239, 68, 68, 0.2)', 'important');
}

function clearFormValidationMarks() {
  ['login-email', 'login-password', 'register-name', 'register-email'].forEach((id) => {
    clearFieldValidation(document.getElementById(id));
  });
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (!input || !icon) return;

  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.textContent = isHidden ? 'visibility_off' : 'visibility';
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

  clearFormValidationMarks();

  let firstInvalidField = null;
  const loginEmailField = document.getElementById('login-email');
  const loginPasswordField = document.getElementById('login-password');

  if (!email || !isValidEmailAddress(email)) {
    markFieldInvalid(loginEmailField);
    firstInvalidField = loginEmailField;
  }

  if (!password) {
    markFieldInvalid(loginPasswordField);
    if (!firstInvalidField) {
      firstInvalidField = loginPasswordField;
    }
  }

  if (firstInvalidField) {
    hideMessages();
    firstInvalidField.focus();
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
      if (data.user.isDemo) {
        localStorage.setItem('b_is_demo', '1');
      } else {
        localStorage.removeItem('b_is_demo');
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

  clearFormValidationMarks();

  let firstInvalidField = null;
  const registerNameField = document.getElementById('register-name');
  const registerEmailField = document.getElementById('register-email');

  if (!name) {
    markFieldInvalid(registerNameField);
    firstInvalidField = registerNameField;
  }

  if (!email || !isValidEmailAddress(email)) {
    markFieldInvalid(registerEmailField);
    if (!firstInvalidField) {
      firstInvalidField = registerEmailField;
    }
  }

  if (firstInvalidField) {
    hideMessages();
    firstInvalidField.focus();
    return;
  }

  // Password validation keeps using the existing strength/rules UI + message.
  if (!password) {
    showError('Bitte Passwort eingeben.');
    return;
  }

  if (password.length < 8) {
    showError('Passwort muss mindestens 8 Zeichen haben.');
    return;
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    showError('Passwort muss Großbuchstaben, Kleinbuchstaben und eine Zahl enthalten.');
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
      localStorage.removeItem('b_is_demo');

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

async function handleDemoStart() {
  const btn = document.getElementById('demo-btn');

  btn.disabled = true;
  btn.textContent = 'Starte Demo...';
  hideMessages();

  try {
    const data = await apiService.demoStart();
    if (data && data.token) {
      localStorage.setItem('b_user_email', data.user.email);
      localStorage.setItem('b_user_trainer_name', data.user.trainerName || 'Demo User');
      localStorage.setItem('b_trainer_name', data.user.trainerName || 'Demo User');
      localStorage.setItem('b_user_role', data.user.role || 'coach');
      localStorage.setItem('b_is_demo', '1');

      showSuccess(t('demo_start_success'));
      await apiService.syncAfterLogin();
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    }
  } catch (err) {
    showError(err.message || 'Error while starting demo.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Starte Demo';
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
  const requirementsBox = document.getElementById('password-requirements');

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  updateRequirement('req-length', hasLength);
  updateRequirement('req-uppercase', hasUpper);
  updateRequirement('req-lowercase', hasLower);
  updateRequirement('req-number', hasNumber);

  if (!password) {
    bars.forEach((b) => (b.className = 'h-full flex-1 bg-white/10 rounded-full transition-all'));
    label.textContent = '-';
    label.className = 'text-[10px] font-bold uppercase tracking-widest text-light-blue-info/30';
    requirementsBox.classList.add('hidden');
    return;
  }

  // Show requirements box when password is entered
  requirementsBox.classList.remove('hidden');

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  if (hasUpper && hasLower) score += 1;
  if (hasNumber) score += 1;

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

  // Hide requirements box if all requirements are met
  if (hasLength && hasUpper && hasLower && hasNumber) {
    requirementsBox.classList.add('hidden');
  }
}

function updateRequirement(elementId, isMet) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const icon = element.querySelector('.material-symbols-outlined');
  if (!icon) return;

  if (isMet) {
    icon.textContent = 'check_circle';
    element.className = 'flex items-center gap-2 text-[11px] text-neon-green';
  } else {
    icon.textContent = 'close';
    element.className = 'flex items-center gap-2 text-[11px] text-light-blue-info/50';
  }
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
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-[10px]';
    icon.textContent = 'person';
    chip.appendChild(icon);
    chip.appendChild(document.createTextNode(' ' + email));
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
  selectServer('https://biathlon-shooting-assistant.duckdns.org', 'Standard-Server');
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

function selectLoginDeviceMode(mode) {
  localStorage.setItem('b_device_size', mode);
  const mobileBtn = document.getElementById('device-mobile-btn');
  const desktopBtn = document.getElementById('device-desktop-btn');
  const activeClass =
    'flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-white';
  const inactiveClass =
    'flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-light-blue-info';
  if (mode === 'phone') {
    if (mobileBtn) mobileBtn.className = activeClass;
    if (desktopBtn) desktopBtn.className = inactiveClass;
  } else {
    if (desktopBtn) desktopBtn.className = activeClass;
    if (mobileBtn) mobileBtn.className = inactiveClass;
  }
  applyRegistrationAvailability();
}

function initLoginDeviceToggle() {
  const current = localStorage.getItem('b_device_size') || 'phone';
  selectLoginDeviceMode(current);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!apiService.isServerMode()) {
    window.location.href = 'index.html';
    return;
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
  applyRegistrationAvailability();
  initLoginDeviceToggle();

  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('register-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

  document.getElementById('register-password').addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
  });

  ['login-email', 'login-password', 'register-name', 'register-email'].forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;
    field.addEventListener('input', () => {
      clearFieldValidation(field);
      hideMessages();
    });
  });
});
