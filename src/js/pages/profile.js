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

const STORAGE_KEY = 'b_profile_settings';
const PROFILE_IMAGE_KEY = 'b_user_profile_image';
const PROFILE_SYNC_CHANNEL = 'b_profile_sync_channel';
const DEFAULT_PROFILE_IMAGE = 'assets/icons/app-icon.png';
let pendingProfileSave = null;
let currentProfileImage = '';
let profileSyncChannel = null;

if (typeof BroadcastChannel !== 'undefined') {
  profileSyncChannel = new BroadcastChannel(PROFILE_SYNC_CHANNEL);
}

function getDefaultProfile() {
  return {
    name: localStorage.getItem('b_user_trainer_name') || 'Coach Name',
    email: localStorage.getItem('b_user_email') || 'coach@example.com',
    image: localStorage.getItem(PROFILE_IMAGE_KEY) || '',
    tagline: 'Focus. Precision. Progress.',
    notifications: true,
    sound: true,
    summary: false,
  };
}

function loadProfile() {
  const defaults = getDefaultProfile();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaults;

  try {
    const parsed = JSON.parse(stored);
    return { ...defaults, ...parsed };
  } catch (error) {
    return defaults;
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  localStorage.setItem('b_user_trainer_name', profile.name || '');
  localStorage.setItem('b_user_email', profile.email || '');
  if (profile.image) {
    localStorage.setItem(PROFILE_IMAGE_KEY, profile.image);
  } else {
    localStorage.removeItem(PROFILE_IMAGE_KEY);
  }
}

function notifyProfileDataUpdated(detail = {}) {
  window.dispatchEvent(new CustomEvent('profile-data-updated', { detail }));

  if (profileSyncChannel) {
    profileSyncChannel.postMessage(detail);
  }
}

function renderPreview(profile) {
  const namePreview = document.getElementById('profile-name-preview');
  const emailPreview = document.getElementById('profile-email-preview');
  const avatarPreview = document.getElementById('profile-avatar-preview');

  if (namePreview) namePreview.textContent = profile.name || 'Coach Name';
  if (emailPreview) emailPreview.textContent = profile.email || 'coach@example.com';
  if (avatarPreview) avatarPreview.src = profile.image || DEFAULT_PROFILE_IMAGE;
}

function collectFormValues() {
  const notificationsInput = document.getElementById('pref-notifications');
  const soundInput = document.getElementById('pref-sound');
  const summaryInput = document.getElementById('pref-summary');

  return {
    name: document.getElementById('profile-name').value.trim(),
    email: document.getElementById('profile-email').value.trim(),
    image: currentProfileImage,
    notifications: notificationsInput ? notificationsInput.checked : false,
    sound: soundInput ? soundInput.checked : false,
    summary: summaryInput ? summaryInput.checked : false,
  };
}

function updateProfileSaveState(message, tone = 'info') {
  const saveState = document.getElementById('profile-save-state');
  if (!saveState) return;

  const classNameByTone = {
    info: 'text-center text-xs text-light-blue-info/70 min-h-[18px]',
    success: 'text-center text-xs text-green-400 min-h-[18px]',
    error: 'text-center text-xs text-red-400 min-h-[18px]',
  };

  saveState.textContent = message;
  saveState.className = classNameByTone[tone] || classNameByTone.info;
}

function clearProfileSaveState(delay = 2200) {
  window.setTimeout(() => {
    updateProfileSaveState('', 'info');
  }, delay);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Das Bild konnte nicht gelesen werden.'));

    reader.readAsDataURL(file);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Das Bild konnte nicht verarbeitet werden.'));

    image.src = src;
  });
}

async function createProfileImageDataUrl(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Bitte ein Bild auswählen.');
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceDataUrl);
  const maxSize = 320;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Das Bild konnte nicht vorbereitet werden.');
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.85);
}

async function handleProfileImageSelection(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    const imageDataUrl = await createProfileImageDataUrl(file);
    currentProfileImage = imageDataUrl;

    const nextProfile = {
      ...collectFormValues(),
      image: imageDataUrl,
    };

    saveProfile(nextProfile);
    renderPreview(nextProfile);
    notifyProfileDataUpdated({ field: 'image', value: imageDataUrl });

    if (typeof apiService !== 'undefined' && apiService.isLoggedIn()) {
      apiService
        .saveSettings({
          user_profile_image: imageDataUrl,
          profile_settings: JSON.stringify(nextProfile),
        })
        .catch((err) => {
          console.warn('[Profile] Failed to sync profile image to server:', err.message);
        });
    }

    updateProfileSaveState('Profilbild gespeichert', 'success');
    clearProfileSaveState();
  } catch (error) {
    updateProfileSaveState(error.message || 'Profilbild konnte nicht gespeichert werden.', 'error');
  } finally {
    event.target.value = '';
  }
}

function isAccountConnected() {
  const token = localStorage.getItem('b_auth_token');
  const serverUrl = localStorage.getItem('b_server_url');
  return !!token && !!serverUrl;
}

function setActionEnabled(element, enabled) {
  if (!element) return;
  element.style.opacity = enabled ? '1' : '0.5';
  element.style.pointerEvents = enabled ? 'auto' : 'none';
}

function updateAccountActionsAvailability() {
  const enabled = isAccountConnected();
  setActionEnabled(document.getElementById('account-role-action'), enabled);
  setActionEnabled(document.getElementById('account-change-password-action'), enabled);
  setActionEnabled(document.getElementById('account-change-email-action'), enabled);
  setActionEnabled(document.getElementById('account-logout-action'), enabled);
  setActionEnabled(document.getElementById('account-delete-action'), enabled);
  setActionEnabled(document.getElementById('clear-shared-links-btn'), enabled);
}

function updateRoleModalUI() {
  const role = localStorage.getItem('b_user_role') || 'coach';
  const checkCoach = document.getElementById('check-coach');
  const checkAthlete = document.getElementById('check-athlete');
  const btnCoach = document.getElementById('role-coach-btn');
  const btnAthlete = document.getElementById('role-athlete-btn');

  if (role === 'coach') {
    if (checkCoach) checkCoach.classList.remove('hidden');
    if (checkAthlete) checkAthlete.classList.add('hidden');
    if (btnCoach) btnCoach.classList.add('bg-primary/20', 'border-primary');
    if (btnAthlete) btnAthlete.classList.remove('bg-neon-green/20', 'border-neon-green');
  } else {
    if (checkCoach) checkCoach.classList.add('hidden');
    if (checkAthlete) checkAthlete.classList.remove('hidden');
    if (btnCoach) btnCoach.classList.remove('bg-primary/20', 'border-primary');
    if (btnAthlete) btnAthlete.classList.add('bg-neon-green/20', 'border-neon-green');
  }
}

function updateRoleUI() {
  const role = localStorage.getItem('b_user_role') || 'coach';
  const display = document.getElementById('current-role-display');
  if (!display) return;
  display.textContent =
    role === 'coach' ? t('role_coach') || 'Coach' : t('role_athlete') || 'Sportler';
}

function openRoleModal() {
  const modal = document.getElementById('role-modal');
  if (modal) {
    modal.classList.remove('hidden');
    updateRoleModalUI();
  }
}

function closeRoleModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('role-modal');
  if (modal) modal.classList.add('hidden');
}

async function setUserRole(role) {
  try {
    await apiService.updateRole(role);
    localStorage.setItem('b_user_role', role);
    updateRoleUI();
    updateRoleModalUI();
    if (role === 'athlete') {
      const res = await apiService.syncAfterLogin();
      if (res && res.athleteId) {
        localStorage.setItem('b_personal_athlete_id', res.athleteId);
      }
    }
    setTimeout(() => location.reload(), 500);
  } catch (err) {
    alert('Fehler beim ändern der Rolle: ' + err.message);
  }
}

function loadAccountInfo() {
  const emailEl = document.getElementById('account-email');
  const sinceEl = document.getElementById('account-since');
  const trainerNameEl = document.getElementById('account-trainer-name');
  const dot = document.getElementById('account-dot');
  const statusText = document.getElementById('account-status-text');
  const profileStatusText = document.getElementById('profile-status-text');
  const profileSinceText = document.getElementById('profile-since-text');

  const cachedEmail = localStorage.getItem('b_user_email');
  const cachedTrainerName = localStorage.getItem('b_user_trainer_name');

  if (emailEl) emailEl.textContent = cachedEmail;
  if (cachedTrainerName && trainerNameEl) trainerNameEl.textContent = cachedTrainerName;

  if (typeof apiService !== 'undefined' && apiService.isLoggedIn()) {
    apiService
      .getProfile()
      .then((profile) => {
        if (!profile) return;
        if (emailEl) emailEl.textContent = profile.email;
        if (trainerNameEl) {
          trainerNameEl.textContent = profile.trainerName || '';
          localStorage.setItem('b_user_trainer_name', profile.trainerName || '');
        }
        localStorage.setItem('b_user_email', profile.email || '');

        if (profile.createdAt && sinceEl) {
          const date = new Date(profile.createdAt);
          sinceEl.textContent = `Mitglied seit ${date.toLocaleDateString('de')}`;
        }

        if (profile.createdAt && profileSinceText) {
          const date = new Date(profile.createdAt);
          profileSinceText.textContent = `Seit ${date.toLocaleDateString('de')}`;
        }

        if (dot) dot.className = 'w-2 h-2 rounded-full bg-green-500';
        if (statusText) {
          statusText.textContent = 'Online';
          statusText.className = 'text-green-400 text-xs';
        }
        if (profileStatusText) {
          profileStatusText.textContent = 'Online';
          profileStatusText.className = 'text-green-400 text-xs';
        }
      })
      .catch(() => {
        if (sinceEl) sinceEl.textContent = 'Server nicht erreichbar';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-500';
        if (statusText) {
          statusText.textContent = 'Offline';
          statusText.className = 'text-red-400 text-xs';
        }
        if (profileStatusText) {
          profileStatusText.textContent = 'Offline';
          profileStatusText.className = 'text-red-400 text-xs';
        }
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-500';
      });
  } else {
    if (emailEl) emailEl.textContent = cachedEmail || 'Nicht angemeldet';
    if (trainerNameEl && !trainerNameEl.textContent) trainerNameEl.textContent = 'Coach';
    if (sinceEl) sinceEl.textContent = '';
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-zinc-600';
    if (statusText) {
      statusText.textContent = 'Offline';
      statusText.className = 'text-light-blue-info/50 text-xs';
    }
    if (profileStatusText) {
      profileStatusText.textContent = 'Offline';
      profileStatusText.className = 'text-light-blue-info/50 text-xs';
    }
    if (profileSinceText) {
      profileSinceText.textContent = '';
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
  const modal = document.getElementById('change-email-modal');
  const emailInput = document.getElementById('new-email');
  const profileEmail = document.getElementById('profile-email');
  const currentEmail =
    pendingProfileSave?.email || profileEmail?.value || localStorage.getItem('b_user_email') || '';

  if (modal) modal.classList.remove('hidden');
  if (emailInput) emailInput.value = currentEmail;
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

function closePasswordChangeModal(event) {
  closeAccountModal('change-password-modal', event);
}

function closeEmailChangeModal(event) {
  pendingProfileSave = null;
  closeAccountModal('change-email-modal', event);
}

function closeDeleteAccountModal(event) {
  closeAccountModal('delete-account-modal', event);
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
    setTimeout(() => {
      closePasswordChangeModal();
    }, 1200);
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

  if (!isAccountConnected()) {
    errorEl.textContent = 'Eine E-Mail-Änderung ist nur mit aktiver Server-Verbindung möglich.';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const data = await apiService.changeEmail(newEmail, password);
    const profileToSave = pendingProfileSave || collectFormValues();
    profileToSave.email = data.email || newEmail;
    saveProfile(profileToSave);
    renderPreview(profileToSave);

    if (typeof apiService !== 'undefined' && apiService.isLoggedIn()) {
      apiService
        .saveSettings({
          user_profile_image: profileToSave.image || '',
          profile_settings: JSON.stringify(profileToSave),
        })
        .catch((err) => {
          console.warn(
            '[Profile] Failed to sync profile settings after email change:',
            err.message
          );
        });
    }

    pendingProfileSave = null;
    successEl.textContent = 'E-Mail erfolgreich geändert!';
    successEl.classList.remove('hidden');
    loadAccountInfo();
    setTimeout(() => {
      closeEmailChangeModal();
    }, 1200);
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

function setInlineStatus(element, message, type = 'info') {
  if (!element) return;
  const classMap = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-light-blue-info/70',
  };
  element.textContent = message;
  if (message) {
    element.classList.remove('hidden');
    element.className = `text-xs mt-1.5 ${classMap[type] || classMap.info}`;
  } else {
    element.classList.add('hidden');
  }
}

async function removeAllSharedLinks() {
  const stateEl = document.getElementById('privacy-action-state');

  if (!isAccountConnected()) {
    setInlineStatus(stateEl, 'Nur mit aktiver Server-Verbindung verfügbar.', 'error');
    return;
  }

  if (!confirm('Wirklich alle geteilten Sessions und Invite-Links entfernen?')) {
    return;
  }

  setInlineStatus(stateEl, 'Freigaben werden entfernt ...', 'info');

  try {
    const sessions = (await apiService.getSessions()) || [];
    const shared = sessions.filter((session) => !!session.shareCode);

    if (shared.length === 0) {
      setInlineStatus(stateEl, 'Keine aktiven Freigaben gefunden.', 'info');
      return;
    }

    let removed = 0;
    let failed = 0;
    for (const session of shared) {
      try {
        await apiService.unshareSession(session.id);
        removed += 1;
      } catch (err) {
        failed += 1;
      }
    }

    const localSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    if (Array.isArray(localSessions) && localSessions.length > 0) {
      const sharedIds = new Set(shared.map((item) => String(item.id)));
      const updated = localSessions.map((item) => {
        if (!sharedIds.has(String(item.id))) return item;
        return { ...item, shareCode: null, shareExpiresAt: null };
      });
      localStorage.setItem('sessions', JSON.stringify(updated));
    }

    if (failed === 0) {
      setInlineStatus(stateEl, `${removed} Freigaben entfernt.`, 'success');
    } else {
      setInlineStatus(stateEl, `${removed} entfernt, ${failed} fehlgeschlagen.`, 'error');
    }
  } catch (err) {
    setInlineStatus(stateEl, err.message || 'Freigaben konnten nicht entfernt werden.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof translateApp === 'function') {
    translateApp();
  }

  const profile = loadProfile();
  currentProfileImage = profile.image || '';

  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const prefNotifications = document.getElementById('pref-notifications');
  const prefSound = document.getElementById('pref-sound');
  const prefSummary = document.getElementById('pref-summary');
  const saveButton = document.getElementById('save-profile-btn');
  const editEmailButton = document.getElementById('edit-email-btn');
  const editProfileImageButton = document.getElementById('edit-profile-image-btn');
  const profileImageInput = document.getElementById('profile-image-input');
  const saveState = document.getElementById('profile-save-state');
  const clearSharedLinksButton = document.getElementById('clear-shared-links-btn');

  if (!nameInput || !emailInput) return;

  nameInput.value = profile.name;
  emailInput.value = profile.email;
  if (prefNotifications) prefNotifications.checked = profile.notifications;
  if (prefSound) prefSound.checked = profile.sound;
  if (prefSummary) prefSummary.checked = profile.summary;

  renderPreview(profile);
  updateRoleUI();
  updateRoleModalUI();
  loadAccountInfo();
  updateAccountActionsAvailability();

  // Live update für Name und Email
  nameInput.addEventListener('input', () => {
    const currentValue = nameInput.value.trim();
    if (currentValue) {
      localStorage.setItem('b_user_trainer_name', currentValue);
      const namePreview = document.getElementById('profile-name-preview');
      if (namePreview) namePreview.textContent = currentValue;
      notifyProfileDataUpdated({ field: 'name', value: currentValue });
    }
  });

  emailInput.addEventListener('input', () => {
    const currentValue = emailInput.value.trim();
    if (currentValue) {
      const emailPreview = document.getElementById('profile-email-preview');
      if (emailPreview) emailPreview.textContent = currentValue;
      notifyProfileDataUpdated({ field: 'email', value: currentValue });
    }
  });

  if (saveButton && saveState) {
    saveButton.addEventListener('click', () => {
      const nextProfile = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        image: currentProfileImage,
        notifications: prefNotifications ? prefNotifications.checked : false,
        sound: prefSound ? prefSound.checked : false,
        summary: prefSummary ? prefSummary.checked : false,
      };

      const storedEmail = localStorage.getItem('b_user_email') || profile.email || '';
      if (nextProfile.email !== storedEmail) {
        if (!isAccountConnected()) {
          saveState.textContent =
            'E-Mail-Änderungen sind nur mit aktiver Server-Verbindung möglich.';
          saveState.className = 'text-center text-xs text-red-400 min-h-[18px]';
          return;
        }

        pendingProfileSave = nextProfile;
        openChangeEmailModal();
        saveState.textContent = 'Bitte Passwort bestätigen, um die E-Mail zu ändern.';
        saveState.className = 'text-center text-xs text-light-blue-info/70 min-h-[18px]';

        setTimeout(() => {
          const passwordInput = document.getElementById('email-change-password');
          if (passwordInput) passwordInput.focus();
        }, 0);

        return;
      }

      saveProfile(nextProfile);
      renderPreview(nextProfile);
      loadAccountInfo();

      if (typeof apiService !== 'undefined' && apiService.isLoggedIn()) {
        apiService
          .saveSettings({
            user_profile_image: currentProfileImage,
            profile_settings: JSON.stringify(nextProfile),
          })
          .catch((err) => {
            console.warn('[Profile] Failed to sync profile settings to server:', err.message);
          });
      }

      updateProfileSaveState('Einstellungen gespeichert', 'success');
      clearProfileSaveState();
    });
  }

  if (editEmailButton) {
    editEmailButton.addEventListener('click', () => {
      pendingProfileSave = collectFormValues();
      openChangeEmailModal();

      setTimeout(() => {
        const passwordInput = document.getElementById('email-change-password');
        if (passwordInput) passwordInput.focus();
      }, 0);
    });
  }

  if (clearSharedLinksButton) {
    clearSharedLinksButton.addEventListener('click', removeAllSharedLinks);
  }

  if (editProfileImageButton && profileImageInput) {
    editProfileImageButton.addEventListener('click', () => {
      profileImageInput.click();
    });
    profileImageInput.addEventListener('change', handleProfileImageSelection);
  }
});

window.openRoleModal = openRoleModal;
window.closeRoleModal = closeRoleModal;
window.setUserRole = setUserRole;
window.openChangePasswordModal = openChangePasswordModal;
window.openChangeEmailModal = openChangeEmailModal;
window.openDeleteAccountModal = openDeleteAccountModal;
window.closeAccountModal = closeAccountModal;
window.closePasswordChangeModal = closePasswordChangeModal;
window.closeEmailChangeModal = closeEmailChangeModal;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.handleChangePassword = handleChangePassword;
window.handleChangeEmail = handleChangeEmail;
window.handleLogout = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;
