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

const defaultSessions = [];

function loadSessions() {
  return JSON.parse(localStorage.getItem('sessions')) || defaultSessions;
}

function saveSessions(sessions) {
  localStorage.setItem('sessions', JSON.stringify(sessions));
}

let currentFilter = 'all';
let currentSearchTerm = '';
document.addEventListener('DOMContentLoaded', () => {
  loadAndRenderSessions();
  updateFilterCounts();
  setupSearchListener();
  setupFilterListeners();
});

function setupSearchListener() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value.toLowerCase();
      loadAndRenderSessions();
    });
  }
}

function setupFilterListeners() {
  const filterBtns = document.querySelectorAll('.session-filter-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.remove('bg-primary', 'font-bold');
        b.classList.add('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
      });
      btn.classList.remove('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
      btn.classList.add('bg-primary', 'font-bold');
      currentFilter = btn.getAttribute('data-filter');
      loadAndRenderSessions();
    });
  });
}

function updateFilterCounts() {
  const allSessions = JSON.parse(localStorage.getItem('sessions')) || [];
  const counts = {
    all: allSessions.length,
    training: allSessions.filter((s) => s.type === 'training').length,
    competition: allSessions.filter((s) => s.type === 'competition').length,
  };
  const allBtn = document.querySelector('[data-filter="all"]');
  const trainingBtn = document.querySelector('[data-filter="training"]');
  const competitionBtn = document.querySelector('[data-filter="competition"]');
  if (allBtn) allBtn.textContent = `${t('filter_all')} (${counts.all})`;
  if (trainingBtn) trainingBtn.textContent = `${t('training')} (${counts.training})`;
  if (competitionBtn) competitionBtn.textContent = `${t('competitions')} (${counts.competition})`;
}

function loadAndRenderSessions() {
  let sessions = loadSessions();
  if (currentFilter !== 'all') {
    sessions = sessions.filter((s) => s.type === currentFilter);
  }

  if (currentSearchTerm) {
    sessions = sessions.filter(
      (s) =>
        s.name.toLowerCase().includes(currentSearchTerm) ||
        s.location.toLowerCase().includes(currentSearchTerm) ||
        (s.competitionCategory && s.competitionCategory.toLowerCase().includes(currentSearchTerm))
    );
  }
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderSessionsList(sessions);
}

function renderSessionsList(sessions) {
  const sessionsList = document.getElementById('sessionsList');
  if (!sessionsList) return;
  sessionsList.innerHTML = '';
  if (sessions.length === 0) {
    sessionsList.innerHTML = `
            <div class="py-12 text-center">
                <div class="w-16 h-16 bg-off-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-3xl text-off-white/20">event_busy</span>
                </div>
                <p class="text-light-blue-info/50 text-base italic">${t('no_sessions')}</p>
            </div>`;
    return;
  }

  const groups = {};
  sessions.forEach((session) => {
    const date = new Date(session.date);
    const dayKey = date.toISOString().split('T')[0];
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(session);
  });
  const sortedDayKeys = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
  sortedDayKeys.forEach((dayKey) => {
    const daySessions = groups[dayKey];
    const dateObj = new Date(dayKey);
    const dateLabel = getFriendlyDate(dateObj);
    const header = document.createElement('div');
    header.className = 'pt-6 pb-2 px-1';
    header.innerHTML = `<span class="text-[11px] font-black uppercase tracking-[0.2em] text-light-blue-info/70">${dateLabel}</span>`;
    sessionsList.appendChild(header);
    daySessions.forEach((session) => {
      const card = createSessionCard(session);
      sessionsList.appendChild(card);
    });
  });
}

function getFriendlyDate(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const d = date.toISOString().split('T')[0];
  const todayIso = today.toISOString().split('T')[0];
  const yesterdayIso = yesterday.toISOString().split('T')[0];
  if (d === todayIso) return t('today');
  if (d === yesterdayIso) return t('yesterday');
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function createSessionCard(session) {
  const wrapper = document.createElement('div');
  wrapper.className = 'swipe-card relative mb-4 group';
  wrapper.setAttribute('data-session-id', session.id);
  const deleteLayer = document.createElement('div');
  deleteLayer.className = 'swipe-card-delete';
  deleteLayer.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="material-symbols-outlined">delete</span>
            <span class="font-bold text-sm">${t('delete')}</span>
        </div>
    `;
  deleteLayer.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(t('confirm_delete_session'))) {
      deleteSession(session.id);
    }
  });
  const content = document.createElement('div');
  content.className =
    'swipe-card-content bg-card-dark border border-subtle rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer';
  const typeColors = {
    training: 'bg-primary/10 text-primary border-primary/20',
    competition: 'bg-neon-green/10 text-neon-green border-neon-green/20',
    testing: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20',
  };
  const activeColor = typeColors[session.type] || typeColors.training;
  let compBadge = '';
  if (session.type === 'competition' && session.competitionCategory) {
    compBadge = `
            <div class="flex items-center gap-1.5 mt-2">
                <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-light-blue-info uppercase tracking-widest">${session.competitionCategory}</span>
                <span class="text-[10px] font-bold text-light-blue-info/50">${session.competitionType || ''}</span>
            </div>
        `;
  }
  content.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div class="space-y-0.5 flex-1 pr-4">
                <h3 class="text-base font-bold text-off-white tracking-tight">${session.name}</h3>
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px] text-light-blue-info/60">location_on</span>
                    <p class="text-xs font-semibold text-light-blue-info/60 truncate">${session.location}</p>
                </div>
            </div>
            <div class="${activeColor} border px-3 py-1 rounded-full">
                <span class="text-[10px] font-black uppercase tracking-wider">${session.type}</span>
            </div>
        </div>

        ${compBadge}

        <div class="mt-4 pt-3 border-t border-subtle/50 flex items-center justify-between text-xs font-bold text-light-blue-info/60">
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">schedule</span>
                    <span>${session.time || '09:00'}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">groups</span>
                    <span>${session.athletes ? session.athletes.length : 0} Athletes</span>
                </div>
            </div>
            <span class="material-symbols-outlined text-[18px] text-light-blue-info/30">chevron_right</span>
        </div>
    `;
  let startX = 0;
  let currentX = 0;
  let isSwiping = false;
  const threshold = 80;
  content.addEventListener(
    'touchstart',
    (e) => {
      startX = e.touches[0].clientX;
      content.style.transition = 'none';
      isSwiping = true;
    },
    { passive: true }
  );
  content.addEventListener(
    'touchmove',
    (e) => {
      if (!isSwiping) return;
      const diff = e.touches[0].clientX - startX;
      currentX = diff;
      if (currentX < 0) currentX = 0;
      if (currentX > 120) currentX = 120 + (currentX - 120) * 0.2;
      content.style.transform = `translateX(${currentX}px)`;
    },
    { passive: true }
  );
  content.addEventListener('touchend', () => {
    isSwiping = false;
    content.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    if (currentX > threshold) {
      content.style.transform = `translateX(100px)`;
    } else {
      content.style.transform = 'translateX(0)';
    }
    currentX = 0;
  });
  content.addEventListener('click', (e) => {
    const style = window.getComputedStyle(content);
    const matrix = new WebKitCSSMatrix(style.transform);
    const translateX = matrix.m41;
    if (translateX > 10) {
      content.style.transform = 'translateX(0)';
      e.stopPropagation();
      return;
    }
    sessionStorage.setItem('selectedSessionId', session.id);
    window.location.href = `./session-detail.html?id=${session.id}`;
  });
  wrapper.appendChild(deleteLayer);
  wrapper.appendChild(content);
  return wrapper;
}

function deleteSession(id) {
  let sessions = loadSessions();
  sessions = sessions.filter((s) => s.id !== id);
  saveSessions(sessions);
  loadAndRenderSessions();
}
