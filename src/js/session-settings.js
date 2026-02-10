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
 * Session Settings Logic
 */

let currentSession = null;
let allAthletes = [];
let selectedAthleteIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = parseInt(urlParams.get('id'));

  if (!sessionId) {
    window.location.href = 'index.html';
    return;
  }

  loadSessionData(sessionId);
  setupEventListeners(sessionId);
});

function loadSessionData(sessionId) {
  const sessions = JSON.parse(localStorage.getItem('sessions')) || [];
  currentSession = sessions.find((s) => s.id === sessionId);

  if (!currentSession) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('sessionNameSub').textContent = currentSession.name;

  // Feature settings
  const settings = currentSession.settings || { email: false, detailed: false };
  document.getElementById('emailReporting').checked = settings.email;
  document.getElementById('detailedStats').checked = settings.detailed;

  // Athletes
  allAthletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
  selectedAthleteIds = new Set(currentSession.athletes || []);

  renderAthletesList();
}

function setupEventListeners(sessionId) {
  document.getElementById('backBtn').onclick = () => {
    window.location.href = `session-detail.html?id=${sessionId}`;
  };

  // Toggles
  const toggles = ['emailReporting', 'detailedStats'];
  toggles.forEach((id) => {
    document.getElementById(id).onchange = (e) => saveSettings();
  });

  // Athlete Management
  document.getElementById('addAthletesBtn').onclick = () => openAthletesModal();
  document.getElementById('closeAthletesModal').onclick = () => closeAthletesModal();
  document.getElementById('confirmAthletesBtn').onclick = () => confirmAthletes();

  // Delete Session
  document.getElementById('deleteSessionBtn').onclick = () => {
    if (confirm(t('delete_session_confirm'))) {
      let sessions = JSON.parse(localStorage.getItem('sessions')) || [];
      sessions = sessions.filter((s) => s.id !== sessionId);
      localStorage.setItem('sessions', JSON.stringify(sessions));
      window.location.href = 'index.html';
    }
  };
}

function renderAthletesList() {
  const list = document.getElementById('athletesConfigList');
  if (!list) return;

  const participants = allAthletes.filter((a) => selectedAthleteIds.has(a.id));

  if (participants.length === 0) {
    list.innerHTML = `<p class="text-xs text-light-blue-info/50 italic px-1">${t('no_athletes_selected')}</p>`;
    return;
  }

  list.innerHTML = participants
    .map((athlete) => {
      const initials = athlete.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return `
            <div class="bg-card-dark border border-subtle rounded-2xl p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span class="text-primary font-bold text-xs uppercase">${initials}</span>
                    </div>
                    <div>
                        <h3 class="font-bold text-sm">${athlete.name}</h3>
                        <p class="text-[10px] text-light-blue-info/70 uppercase font-black">${athlete.ageGroup || t('no_group')}</p>
                    </div>
                </div>
                <button onclick="removeAthlete(${athlete.id})" class="p-2 text-red-500/50 hover:text-red-500">
                    <span class="material-symbols-outlined text-lg">person_remove</span>
                </button>
            </div>
        `;
    })
    .join('');
}

function removeAthlete(id) {
  selectedAthleteIds.delete(id);
  saveAthletesToSession();
  renderAthletesList();
}

function openAthletesModal() {
  const modal = document.getElementById('athletesModal');
  const list = document.getElementById('athletesSelectList');
  modal.classList.remove('hidden');

  list.innerHTML = allAthletes
    .map((athlete) => {
      const isSelected = selectedAthleteIds.has(athlete.id);
      const initials = athlete.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return `
            <div onclick="toggleAthleteSelection(${athlete.id}, this)" 
                 class="athlete-select-item p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-primary/10 border-primary' : 'bg-white/5 border-subtle'}"
                 data-id="${athlete.id}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span class="text-primary font-bold text-xs">${initials}</span>
                    </div>
                    <span class="font-bold text-sm">${athlete.name}</span>
                </div>
                <span class="material-symbols-outlined ${isSelected ? 'text-primary' : 'text-transparent'}">check_circle</span>
            </div>
        `;
    })
    .join('');
}

function toggleAthleteSelection(id, el) {
  if (selectedAthleteIds.has(id)) {
    selectedAthleteIds.delete(id);
    el.className =
      'athlete-select-item p-4 rounded-2xl border border-subtle bg-white/5 transition-all flex items-center justify-between cursor-pointer';
    el.querySelector('.material-symbols-outlined').classList.replace(
      'text-primary',
      'text-transparent'
    );
  } else {
    selectedAthleteIds.add(id);
    el.className =
      'athlete-select-item p-4 rounded-2xl border border-primary bg-primary/10 transition-all flex items-center justify-between cursor-pointer';
    el.querySelector('.material-symbols-outlined').classList.replace(
      'text-transparent',
      'text-primary'
    );
  }
}

function confirmAthletes() {
  saveAthletesToSession();
  closeAthletesModal();
  renderAthletesList();
}

function closeAthletesModal() {
  document.getElementById('athletesModal').classList.add('hidden');
}

function saveSettings() {
  const email = document.getElementById('emailReporting').checked;
  const detailed = document.getElementById('detailedStats').checked;

  currentSession.settings = { email, detailed };
  updateSessionInStorage();
}

function saveAthletesToSession() {
  currentSession.athletes = Array.from(selectedAthleteIds);
  updateSessionInStorage();
}

function updateSessionInStorage() {
  let sessions = JSON.parse(localStorage.getItem('sessions')) || [];
  const idx = sessions.findIndex((s) => s.id === currentSession.id);
  if (idx !== -1) {
    sessions[idx] = currentSession;
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }
}
