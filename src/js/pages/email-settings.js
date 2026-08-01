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
  window.location.href = 'menu.html';
}

let trainerEmails = [];
let autoSendEnabled = false;
try {
  trainerEmails = JSON.parse(localStorage.getItem('trainerEmails')) || [];
} catch (e) {
  trainerEmails = [];
}
try {
  autoSendEnabled = JSON.parse(localStorage.getItem('autoSendEnabled')) || false;
} catch (e) {
  autoSendEnabled = false;
}

function saveTrainerEmails() {
  localStorage.setItem('trainerEmails', JSON.stringify(trainerEmails));
}

def_saveEmailSettings = function () {
  localStorage.setItem('autoSendEnabled', JSON.stringify(autoSendEnabled));
};

function saveEmailSettings() {
  localStorage.setItem('autoSendEnabled', JSON.stringify(autoSendEnabled));
}

function renderRecipients() {
  const list = document.getElementById('recipient-list');
  if (!list) return;
  if (trainerEmails.length === 0) {
    list.innerHTML =
      '<p class="text-xs text-zinc-500 italic" data-i18n-key="no_recipients">Keine Empfänger hinzugefügt</p>';
    return;
  }
  list.innerHTML = trainerEmails
    .map(
      (email, index) => `
    <div class="flex items-center justify-between bg-off-white/5 border border-subtle rounded-2xl px-4 py-3">
      <span class="text-sm text-off-white/80 truncate pr-2">${email}</span>
      <button
        onclick="removeRecipient(${index})"
        class="text-zinc-500 hover:text-red-400 transition-colors active:scale-90"
      >
        <span class="material-symbols-outlined text-lg">remove_circle</span>
      </button>
    </div>
  `
    )
    .join('');
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
  const errorEl = document.getElementById('recipient-email-error');
  if (errorEl) {
    errorEl.classList.add('hidden');
  }
}

function markFieldInvalid(field) {
  if (!field) return;
  field.setAttribute('aria-invalid', 'true');
  field.style.setProperty('border-color', '#ef4444', 'important');
  field.style.setProperty('background-color', 'rgba(239, 68, 68, 0.08)', 'important');
  field.style.setProperty('box-shadow', '0 0 0 4px rgba(239, 68, 68, 0.2)', 'important');
}

function addRecipient() {
  const input = document.getElementById('new-recipient-email');
  const errorEl = document.getElementById('recipient-email-error');
  if (!input) return;
  const email = input.value.trim();

  clearFieldValidation(input);

  if (!email || !isValidEmailAddress(email)) {
    markFieldInvalid(input);
    if (errorEl) {
      errorEl.textContent =
        typeof t === 'function'
          ? t('please_enter_valid_email') || 'Bitte richtige E-Mail eingeben'
          : 'Bitte richtige E-Mail eingeben';
      errorEl.classList.remove('hidden');
    }
    input.focus();
    return;
  }

  if (trainerEmails.includes(email)) {
    markFieldInvalid(input);
    if (errorEl) {
      errorEl.textContent =
        typeof t === 'function'
          ? t('email_exists') || 'E-Mail bereits vorhanden'
          : 'E-Mail bereits vorhanden';
      errorEl.classList.remove('hidden');
    }
    input.focus();
    return;
  }

  trainerEmails.push(email);
  saveTrainerEmails();
  input.value = '';
  renderRecipients();
}

function removeRecipient(index) {
  trainerEmails.splice(index, 1);
  saveTrainerEmails();
  renderRecipients();
}

function toggleAutoSend() {
  autoSendEnabled = !autoSendEnabled;
  saveEmailSettings();
  updateAutoSendUI();
}

function updateAutoSendUI() {
  const toggle = document.getElementById('auto-send-toggle');
  const knob = document.getElementById('auto-send-knob');
  if (!toggle || !knob) return;
  if (autoSendEnabled) {
    toggle.classList.remove('bg-zinc-700');
    toggle.classList.add('bg-primary');
    knob.style.transform = 'translateX(20px)';
  } else {
    toggle.classList.remove('bg-primary');
    toggle.classList.add('bg-zinc-700');
    knob.style.transform = 'translateX(0px)';
  }
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
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val && val !== key) el.placeholder = val;
    });
  }
  const input = document.getElementById('new-recipient-email');
  if (input) {
    input.addEventListener('input', () => {
      clearFieldValidation(input);
    });
  }
  updateAutoSendUI();
  renderRecipients();
});
