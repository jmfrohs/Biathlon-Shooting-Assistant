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
 * New/Edit Athlete Page Logic
 */

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');
let isEditMode = false;
let currentAthleteId = null;
document.addEventListener('DOMContentLoaded', () => {
  if (editId) {
    isEditMode = true;
    currentAthleteId = parseInt(editId);
    prepareEditMode();
  }

  setupListeners();
});

function prepareEditMode() {
  const titleEl = document.getElementById('formTitle');
  const subtitleEl = document.getElementById('formSubtitle');
  const saveBtnTextEl = document.getElementById('saveBtnText');
  if (titleEl) titleEl.textContent = t('edit_athlete');
  if (subtitleEl) subtitleEl.textContent = t('update_profile');
  if (saveBtnTextEl) saveBtnTextEl.textContent = t('update_athlete');
  const athletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
  const athlete = athletes.find((a) => a.id === currentAthleteId);
  if (athlete) {
    if (document.getElementById('firstName')) {
      const nameParts = athlete.name.split(' ');
      document.getElementById('firstName').value = athlete.firstName || nameParts[0] || '';
    }

    if (document.getElementById('lastName')) {
      const nameParts = athlete.name.split(' ');
      document.getElementById('lastName').value =
        athlete.lastName || nameParts.slice(1).join(' ') || '';
    }

    if (document.getElementById('dateOfBirth'))
      document.getElementById('dateOfBirth').value = athlete.dateOfBirth || '';
    if (document.getElementById('age')) document.getElementById('age').value = athlete.age || '';
    if (document.getElementById('ageGroup'))
      document.getElementById('ageGroup').value = athlete.ageGroup || '';
    if (document.getElementById('squad'))
      document.getElementById('squad').value = athlete.squad || '';
    if (document.getElementById('gender'))
      document.getElementById('gender').value = athlete.gender || 'm';
    if (athlete.proneStart === 'Right' || athlete.proneStart === t('right')) {
      const radio = document.getElementById('p_right');
      if (radio) radio.checked = true;
    } else {
      const radio = document.getElementById('p_left');
      if (radio) radio.checked = true;
    }

    if (athlete.standingStart === 'Right' || athlete.standingStart === t('right')) {
      const radio = document.getElementById('s_right');
      if (radio) radio.checked = true;
    } else {
      const radio = document.getElementById('s_left');
      if (radio) radio.checked = true;
    }

    addShootingButton(athlete);
    if (athlete.hasOwnProperty('useDefaultTimes')) {
      useDefaults = athlete.useDefaultTimes;
    } else {
      useDefaults = true;
    }

    if (athlete.proneTimeAdd) {
      document.getElementById('athlete-prone-time').value = athlete.proneTimeAdd;
    }

    if (athlete.standingTimeAdd) {
      document.getElementById('athlete-standing-time').value = athlete.standingTimeAdd;
    }

    if (document.getElementById('athlete-click-value')) {
      document.getElementById('athlete-click-value').value = athlete.clickValue || 6.0;
    }

    updateUseDefaultsUI();
  }
}

function addShootingButton(athlete) {
  const container = document.getElementById('form-actions');
  if (!container) return;
  const shootBtn = document.createElement('button');
  shootBtn.type = 'button';
  shootBtn.className =
    'flex-1 bg-neon-green/10 text-neon-green py-5 rounded-2xl font-bold active:scale-95 transition-all border border-neon-green/30 flex items-center justify-center gap-2';
  shootBtn.innerHTML = '<span class="material-symbols-outlined">ads_click</span>';
  shootBtn.title = 'Start Shooting';
  shootBtn.onclick = () => {
    window.location.href = `athletes.html?shoot=${athlete.id}`;
  };
  container.insertBefore(shootBtn, container.firstChild);
}

function setupListeners() {
  const dobInput = document.getElementById('dateOfBirth');
  if (dobInput) {
    dobInput.addEventListener('change', function () {
      const dob = new Date(this.value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      const ageInput = document.getElementById('age');
      if (ageInput) ageInput.value = age;
    });
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }
}

function handleSave() {
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const dateOfBirth = document.getElementById('dateOfBirth').value;
  const age = document.getElementById('age').value;
  const ageGroup = document.getElementById('ageGroup').value;
  const squad = document.getElementById('squad').value;
  const gender = document.getElementById('gender').value;
  const proneStart = document.getElementById('p_left').checked ? t('left') : t('right');
  const standingStart = document.getElementById('s_left').checked ? t('left') : t('right');
  const useDefaultTimes = document
    .getElementById('use-defaults-toggle')
    .classList.contains('bg-primary');
  const proneTimeAdd = document.getElementById('athlete-prone-time').value;
  const standingTimeAdd = document.getElementById('athlete-standing-time').value;
  const clickValue = document.getElementById('athlete-click-value').value;
  if (!firstName || !lastName || !dateOfBirth) {
    alert(t('please_enter_name_dob'));
    return;
  }

  if (!ageGroup || !squad) {
    alert(t('please_select_age_squad'));
    return;
  }

  const athleteData = {
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    dateOfBirth,
    age: parseInt(age) || 0,
    ageGroup,
    squad,
    gender,
    proneStart,
    standingStart,
    useDefaultTimes,
    proneTimeAdd: parseInt(proneTimeAdd) || 0,
    standingTimeAdd: parseInt(standingTimeAdd) || 0,
    clickValue: parseFloat(clickValue) || 6.0,
  };
  let athletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
  if (isEditMode) {
    const index = athletes.findIndex((a) => a.id === currentAthleteId);
    if (index !== -1) {
      athletes[index] = {
        ...athletes[index],
        ...athleteData,
      };
    }
  } else {
    athletes.push({
      ...athleteData,
      id: Date.now(),
      sessions: 0,
    });
  }
  localStorage.setItem('b_athletes', JSON.stringify(athletes));
  showSuccessMessage(isEditMode ? t('athlete_updated_success') : t('athlete_saved_success'));
}

let useDefaults = true;

function toggleUseDefaults() {
  useDefaults = !useDefaults;
  updateUseDefaultsUI();
}

function updateUseDefaultsUI() {
  const toggle = document.getElementById('use-defaults-toggle');
  const knob = document.getElementById('use-defaults-knob');
  const container = document.getElementById('custom-times-container');
  const proneInput = document.getElementById('athlete-prone-time');
  const standingInput = document.getElementById('athlete-standing-time');
  if (useDefaults) {
    toggle.classList.remove('bg-zinc-700');
    toggle.classList.add('bg-primary');
    knob.style.transform = 'translateX(20px)';
    container.classList.add('opacity-50', 'pointer-events-none');
    proneInput.disabled = true;
    standingInput.disabled = true;
  } else {
    toggle.classList.remove('bg-primary');
    toggle.classList.add('bg-zinc-700');
    knob.style.transform = 'translateX(0)';
    container.classList.remove('opacity-50', 'pointer-events-none');
    proneInput.disabled = false;
    standingInput.disabled = false;
  }
}

function showSuccessMessage(text) {
  const msgContainer = document.getElementById('successMessage');
  if (!msgContainer) {
    window.location.href = 'athletes.html';
    return;
  }

  const msgEl = msgContainer.querySelector('div');
  if (msgEl && text) msgEl.textContent = text;
  msgEl.classList.remove('opacity-0', '-translate-y-4');
  msgEl.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    msgEl.classList.add('opacity-0', '-translate-y-4');
    msgEl.classList.remove('opacity-100', 'translate-y-0');
    setTimeout(() => {
      window.location.href = 'athletes.html';
    }, 300);
  }, 2000);
}
