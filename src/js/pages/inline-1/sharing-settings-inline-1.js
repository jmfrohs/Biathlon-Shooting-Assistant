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

function navigateBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = 'settings.html';
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof translateApp === 'function') {
    translateApp();
  } else if (typeof t === 'function') {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val && val !== key) el.textContent = val;
    });
  }

  updateAutoShareUI();
});

function toggleAutoShare() {
  const currentState = localStorage.getItem('b_auto_share_enabled') === 'true';
  const newState = !currentState;
  localStorage.setItem('b_auto_share_enabled', newState);
  updateAutoShareUI();
}

function updateAutoShareUI() {
  const toggle = document.getElementById('auto-share-toggle');
  const knob = document.getElementById('auto-share-knob');
  if (!toggle || !knob) return;
  const enabled = localStorage.getItem('b_auto_share_enabled') === 'true';
  if (enabled) {
    toggle.classList.remove('bg-zinc-700');
    toggle.classList.add('bg-primary');
    knob.style.transform = 'translateX(20px)';
  } else {
    toggle.classList.add('bg-zinc-700');
    toggle.classList.remove('bg-primary');
    knob.style.transform = 'translateX(0px)';
  }
}

async function joinSessionByCode() {
  const input = document.getElementById('join-code-input');
  if (!input) return;
  const code = input.value.trim();
  if (!code) {
    alert('Bitte einen Code eingeben.');
    return;
  }
  try {
    if (typeof apiService === 'undefined' || !apiService.isLoggedIn()) {
      alert('Bitte melde dich zuerst an, um Sessions beizutreten.');
      return;
    }

    const result = await apiService.joinSession(code);
    if (result && result.sessionId) {
      showSuccessMessage('Session beigetreten!');
      input.value = '';
      setTimeout(() => {
        window.location.href = `session-detail.html?id=${result.sessionId}`;
      }, 1000);
    }
  } catch (error) {
    alert('Fehler beim Beitreten: ' + (error.message || 'Ungültiger Code'));
  }
}

function showSuccessMessage(text) {
  const msgContainer = document.getElementById('successMessage');
  if (!msgContainer) {
    alert(text);
    return;
  }

  const msgEl = msgContainer.querySelector('div');
  if (msgEl && text) msgEl.textContent = text;
  msgEl.classList.remove('opacity-0', '-translate-y-4');
  msgEl.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    msgEl.classList.add('opacity-0', '-translate-y-4');
    msgEl.classList.remove('opacity-100', 'translate-y-0');
  }, 2000);
}
