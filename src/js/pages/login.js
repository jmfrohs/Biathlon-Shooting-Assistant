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
      localStorage.setItem('b_user_email', data.user.email);
      localStorage.setItem('b_user_trainer_name', data.user.trainerName || '');
      localStorage.setItem('b_trainer_name', data.user.trainerName || '');
      showSuccess('Erfolgreich angemeldet! Synchronisiere Daten...');
      await syncAfterLogin();
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

  btn.disabled = true;
  btn.textContent = 'Erstelle Konto...';
  hideMessages();

  try {
    const data = await apiService.register(email, password, name);
    if (data && data.token) {
      localStorage.setItem('b_user_email', data.user.email);
      localStorage.setItem('b_user_trainer_name', data.user.trainerName || '');
      localStorage.setItem('b_trainer_name', data.user.trainerName || '');
      showSuccess('Konto erstellt! Synchronisiere Daten...');
      await syncAfterLogin();
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

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('auth-success').classList.add('hidden');
}

function showSuccess(msg) {
  const el = document.getElementById('auth-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('auth-error').classList.add('hidden');
}

function hideMessages() {
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-success').classList.add('hidden');
}

async function syncAfterLogin() {
  try {
    const athletes = await apiService.getAthletes();
    if (athletes) {
      localStorage.setItem('athletes', JSON.stringify(athletes));
    }

    const sessions = await apiService.getSessions();
    if (sessions) {
      localStorage.setItem('sessions', JSON.stringify(sessions));
    }

    const settings = await apiService.getSettings();
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        localStorage.setItem(`b_${key}`, value);
      }
    }

    await apiService.processSyncQueue();
  } catch (err) {
    console.warn('Sync after login failed:', err.message);
  }
}

function toggleServerConfig() {
  const config = document.getElementById('server-config');
  config.classList.toggle('hidden');
  if (!config.classList.contains('hidden')) {
    const urlInput = document.getElementById('server-url-input');
    urlInput.value = localStorage.getItem('b_server_url') || apiService.baseUrl;
    checkServerStatus();
  }
}

function saveServerUrl() {
  const url = document.getElementById('server-url-input').value.trim();
  if (url) {
    apiService.setServerUrl(url);
    checkServerStatus();
  }
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

  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('register-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
});
