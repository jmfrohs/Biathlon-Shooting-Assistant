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

const defaultAgeGroups = ['AK 16', 'AK 17', 'AK 18 - 1', 'AK 18 - 2', 'Junioren', 'Senioren'];
const defaultKaders = ['Nothing', 'LK1', 'LK2', 'NK2', 'NK1', 'OK', 'PK'];

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');
let isEditMode = false;
let currentAthleteId = null;

function checkAthleteName(name) {
  const storedNames = JSON.parse(localStorage.getItem('athleteNames') || '[]');
  return storedNames.includes(name);
}

function validateAthleteNameInRealtime() {
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const fullName = `${firstName} ${lastName}`;
  const errorContainer = document.getElementById('duplicateNameError');
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  const saveBtn = document.getElementById('saveBtn');

  if (!isEditMode && firstName && lastName) {
    const isDuplicate = checkAthleteName(fullName);

    if (isDuplicate) {
      errorContainer.classList.remove('hidden');
      const message = t('athlete_name_exists').replace('{name}', fullName);
      document.getElementById('duplicateNameMessage').textContent = message;
      firstNameInput.classList.add('error');
      lastNameInput.classList.add('error');
      saveBtn.disabled = true;
      saveBtn.classList.add('disabled');
    } else {
      errorContainer.classList.add('hidden');
      firstNameInput.classList.remove('error');
      lastNameInput.classList.remove('error');
      saveBtn.disabled = false;
      saveBtn.classList.remove('disabled');
    }
  } else if (isEditMode || !firstName || !lastName) {
    errorContainer.classList.add('hidden');
    firstNameInput.classList.remove('error');
    lastNameInput.classList.remove('error');
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('disabled');
    }
  }
}

function addAthleteNameToStorage(name) {
  const storedNames = JSON.parse(localStorage.getItem('athleteNames') || '[]');
  if (!storedNames.includes(name)) {
    storedNames.push(name);
    localStorage.setItem('athleteNames', JSON.stringify(storedNames));
  }
}

function loadAgeGroups() {
  const stored = localStorage.getItem('ageGroups');
  return stored ? JSON.parse(stored) : defaultAgeGroups;
}

function loadKaders() {
  const stored = localStorage.getItem('kaders');
  return stored ? JSON.parse(stored) : defaultKaders;
}

function getAgeGroupFromBirthDate(dateString) {
  const birthDate = new Date(dateString);
  const birthYear = birthDate.getFullYear();
  const currentYear = new Date().getFullYear();

  const age = currentYear - birthYear;

  if (age === 15) return 'AK 16';
  if (age === 16) return 'AK 17';
  if (age === 17) return 'AK 18 - 1';
  if (age === 18) return 'AK 18 - 2';
  if (age >= 19 && age <= 21) return 'Junioren';
  if (age > 21) return 'Senioren';
  return '';
}

function populateSelects() {
  const ageGroups = loadAgeGroups();
  const kaders = loadKaders();

  const ageGroupSelect = document.getElementById('ageGroup');
  if (ageGroupSelect) {
    const selectedValue = ageGroupSelect.value;
    let html = '<option disabled selected value="" data-i18n="age_group">Age Group</option>';
    ageGroups.forEach((group) => {
      html += `<option value="${group}">${group}</option>`;
    });
    ageGroupSelect.innerHTML = html;
    ageGroupSelect.value = selectedValue;
  }

  const squadSelect = document.getElementById('squad');
  if (squadSelect) {
    const selectedValue = squadSelect.value;
    let html = '<option disabled selected value="" data-i18n="squad_kader">Squad/Kader</option>';
    kaders.forEach((kader) => {
      html += `<option value="${kader}">${kader}</option>`;
    });
    squadSelect.innerHTML = html;
    squadSelect.value = selectedValue;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const role = localStorage.getItem('b_user_role');
  if (role === 'athlete') {
    const backBtn = document.querySelector('header a[href="athletes.html"]');
    if (backBtn) backBtn.href = 'index.html';

    const titleEl = document.getElementById('formTitle');
    const subtitleEl = document.getElementById('formSubtitle');
    if (titleEl) titleEl.textContent = 'Mein Profil';
    if (subtitleEl) subtitleEl.textContent = 'Persönliche Daten verwalten';
  }

  populateSelects();

  if (editId) {
    isEditMode = true;
    currentAthleteId = parseInt(editId);
    await prepareEditMode();
  }

  setupListeners();
});

async function prepareEditMode() {
  const titleEl = document.getElementById('formTitle');
  const subtitleEl = document.getElementById('formSubtitle');
  const saveBtnTextEl = document.getElementById('saveBtnText');
  if (titleEl) titleEl.textContent = t('edit_athlete');
  if (subtitleEl) subtitleEl.textContent = t('update_profile');
  if (saveBtnTextEl) saveBtnTextEl.textContent = t('update_athlete');
  let athlete;
  try {
    athlete = await apiService.getAthlete(currentAthleteId);
  } catch (e) {
    return;
  }

  if (!athlete) return;

  populateSelects();

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

  if (document.getElementById('country')) {
    document.getElementById('country').value = athlete.country || '';
  }

  if (document.getElementById('federation')) {
    document.getElementById('federation').value = athlete.federation || '';
  }

  onCountryChange();

  updateUseDefaultsUI();
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

      const ageGroup = getAgeGroupFromBirthDate(this.value);
      const ageGroupSelect = document.getElementById('ageGroup');
      if (ageGroup && ageGroupSelect) {
        ageGroupSelect.value = ageGroup;
      }
    });
  }

  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  if (firstNameInput) {
    firstNameInput.addEventListener('input', validateAthleteNameInRealtime);
    firstNameInput.addEventListener('blur', validateAthleteNameInRealtime);
  }

  if (lastNameInput) {
    lastNameInput.addEventListener('input', validateAthleteNameInRealtime);
    lastNameInput.addEventListener('blur', validateAthleteNameInRealtime);
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }
}

function onCountryChange() {
  const country = document.getElementById('country');
  const fedContainer = document.getElementById('federation-container');
  if (!country || !fedContainer) return;
  if (country.value === 'Deutschland') {
    fedContainer.classList.remove('hidden');
  } else {
    fedContainer.classList.add('hidden');
    const fedSelect = document.getElementById('federation');
    if (fedSelect) fedSelect.value = '';
  }
}

async function handleSave() {
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
  const countryEl = document.getElementById('country');
  const country = countryEl ? countryEl.value : '';
  const federationEl = document.getElementById('federation');
  const federation = country === 'Deutschland' && federationEl ? federationEl.value : '';
  if (!firstName || !lastName || !dateOfBirth) {
    alert(t('please_enter_name_dob'));
    return;
  }

  if (!ageGroup || !squad) {
    alert(t('please_select_age_squad'));
    return;
  }

  const fullName = `${firstName} ${lastName}`;

  if (!isEditMode && checkAthleteName(fullName)) {
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
    country,
    federation,
  };
  try {
    if (isEditMode) {
      await apiService.updateAthlete(currentAthleteId, athleteData);
    } else {
      await apiService.createAthlete(athleteData);
      addAthleteNameToStorage(fullName);
    }

    showSuccessMessage(isEditMode ? t('athlete_updated_success') : t('athlete_saved_success'));
  } catch (e) {
    alert('Fehler beim Speichern.');
  }
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
    knob.style.transform = 'translateX(1.25rem)';
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
  const role = localStorage.getItem('b_user_role');
  const redirectUrl = role === 'athlete' ? 'index.html' : 'athletes.html';

  if (!msgContainer) {
    window.location.href = redirectUrl;
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
      window.location.href = redirectUrl;
    }, 300);
  }, 2000);
}
