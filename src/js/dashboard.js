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
 * Dashboard Script for New UI Test
 * Handles interactions and data rendering for the Coach Dashboard
 */
class Dashboard {
  constructor() {
    this.mainContent = document.querySelector('main');
    this.searchInput = document.querySelector('input[placeholder="Search sessions..."]');
    this.filterAllBtn = document.querySelector('.filter-all');
    this.filterCompBtn = document.querySelector('.filter-comp');
    this.filterTrainBtn = document.querySelector('.filter-train');
    this.addBtn = document.querySelectorAll('button')[0];
    this.addFab = document.querySelector('button.glow-blue');
    this.navAthletes = document.querySelector('.nav-athletes');
    this.navCalendar = document.querySelector('.nav-calendar');
    this.navStats = document.querySelector('.nav-stats');
    this.navSettings = document.querySelector('.nav-settings');
    this.sessions = [];
    this.currentFilter = 'All';
    this.searchTerm = '';
    this.currentFilteredSessions = [];
    this.init();
  }

init() {
    this.loadSessions();
    this.setupEventListeners();
    this.renderSessions();
    this.loadUserEmail();
  }

setupEventListeners() {
    if (this.filterAllBtn) {
      this.filterAllBtn.addEventListener('click', () => this.setFilter('All'));
    }

if (this.filterCompBtn) {
      this.filterCompBtn.addEventListener('click', () => this.setFilter('Competition'));
    }

if (this.filterTrainBtn) {
      this.filterTrainBtn.addEventListener('click', () => this.setFilter('Training'));
    }

if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

if (this.addBtn) {
      this.addBtn.addEventListener('click', () => this.addNewSession());
    }

if (this.addFab) {
      this.addFab.addEventListener('click', () => this.addNewSession());
    }

if (this.navAthletes) {
      this.navAthletes.addEventListener('click', () => (window.location.href = 'athletes.html'));
    }

if (this.navCalendar) {
      this.navCalendar.addEventListener('click', () => (window.location.href = 'calendar.html'));
    }

if (this.navStats) {
      this.navStats.addEventListener('click', () => alert('Statistiken - Bald verfügbar!'));
    }

if (this.navSettings) {
      this.navSettings.addEventListener('click', () => alert('Einstellungen - Bald verfügbar!'));
    }
  }

loadUserEmail() {
    const email = localStorage.getItem('trainerEmail') || 'coach@biathlonlogger.com';
    const emailEl = document.querySelector('p.text-xs');
    if (emailEl) {
      emailEl.textContent = email;
    }
  }

loadSessions() {
    try {
      const sessionsData = localStorage.getItem('sessions');
      if (sessionsData) {
        this.sessions = JSON.parse(sessionsData);
      } else {
        this.sessions = this.getMockSessions();
      }
    } catch (e) {
      console.warn('Could not load sessions:', e);
      this.sessions = this.getMockSessions();
    }
    this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

getMockSessions() {
    return [
      {
        id: 1,
        name: 'World Cup Warmup',
        location: 'Kontiolahti, Finland',
        date: new Date(2025, 10, 9).toISOString(),
        type: 'Training',
        competitionType: null,
        athletes: ['Athlet 1', 'Athlet 2'],
        series: [],
      },
      {
        id: 2,
        name: 'Regional Cup Finals',
        location: 'Vuokatti, Finland',
        date: new Date(2025, 10, 6).toISOString(),
        type: 'Competition',
        competitionType: null,
        athletes: ['Athlet 1'],
        series: [],
      },
      {
        id: 3,
        name: 'Shooting Drill B',
        location: 'Vuokatti, Finland',
        date: new Date(2025, 10, 5).toISOString(),
        type: 'Training',
        competitionType: null,
        athletes: ['Athlet 2', 'Athlet 3', 'Athlet 4'],
        series: [],
      },
    ];
  }

setFilter(filter) {
    this.currentFilter = filter;
    this.renderSessions();
    this.updateFilterButtons();
  }

handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.renderSessions();
  }

getFilteredSessions() {
    let filtered = this.sessions;
    if (this.currentFilter === 'Competition') {
      filtered = filtered.filter((s) => s.type === 'Competition');
    } else if (this.currentFilter === 'Training') {
      filtered = filtered.filter((s) => s.type === 'Training');
    }

if (this.searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(this.searchTerm) ||
          s.location.toLowerCase().includes(this.searchTerm)
      );
    }
    return filtered;
  }

groupSessionsByDate(sessions) {
    const grouped = {};
    sessions.forEach((session) => {
      const date = new Date(session.date);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(session);
    });
    return grouped;
  }

renderSessions() {
    this.currentFilteredSessions = this.getFilteredSessions();
    const grouped = this.groupSessionsByDate(this.currentFilteredSessions);
    this.mainContent.innerHTML = '';
    if (this.currentFilteredSessions.length === 0) {
      this.mainContent.innerHTML = `
        <div class="py-10 text-center">
          <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-3xl text-white/20">history</span>
          </div>
          <p class="text-light-blue-info/40 text-sm italic">Keine Sessions gefunden</p>
        </div>
      `;
      return;
    }
    Object.entries(grouped).forEach(([monthKey, sessions]) => {
      const monthHeader = document.createElement('div');
      monthHeader.className = 'flex items-center gap-2 pt-2 pb-1';
      monthHeader.innerHTML = `
        <span class="material-symbols-outlined text-light-blue-info/40 text-sm">calendar_today</span>
        <span class="text-[11px] font-bold uppercase tracking-wider text-light-blue-info/60">${monthKey}</span>
      `;
      this.mainContent.appendChild(monthHeader);
      sessions.forEach((session) => {
        const card = this.createSessionCard(session);
        this.mainContent.appendChild(card);
      });
    });
    const endMessage = document.createElement('div');
    endMessage.className = 'py-10 text-center';
    endMessage.innerHTML = `
      <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
        <span class="material-symbols-outlined text-3xl text-white/20">history</span>
      </div>
      <p class="text-light-blue-info/40 text-sm italic">End of recent sessions</p>
    `;
    this.mainContent.appendChild(endMessage);
  }

createSessionCard(session) {
    const card = document.createElement('div');
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const typeBadgeColor =
      session.type === 'Competition'
        ? 'border-neon-green/30 bg-neon-green/10 text-neon-green'
        : 'border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan';
    const typeLabel = session.type === 'Competition' ? 'Competition' : 'Training';
    card.className =
      'bg-card-dark rounded-2xl p-4 border border-white/10 flex justify-between items-center group active:scale-[0.98] transition-all cursor-pointer';
    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-lg text-off-white">${this.escapeHtml(session.name)}</h3>
          <span class="px-2 py-0.5 border ${typeBadgeColor} text-[10px] font-bold uppercase rounded tracking-wider">
            ${typeLabel}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm text-light-blue-info">${this.escapeHtml(session.location)}</span>
          <span class="text-xs text-light-blue-info/60 mt-0.5">${formattedDate}</span>
        </div>
      </div>
      <div class="flex items-center text-white/20">
        <span class="material-symbols-outlined">chevron_right</span>
      </div>
    `;
    card.addEventListener('click', () => this.openSession(session));
    return card;
  }

updateFilterButtons() {
    if (this.filterAllBtn) {
      const text = this.filterAllBtn.textContent;
      if (this.currentFilter === 'All') {
        this.filterAllBtn.className =
          'px-4 py-1.5 bg-primary text-off-white text-xs font-semibold rounded-full whitespace-nowrap';
      } else {
        this.filterAllBtn.className =
          'px-4 py-1.5 bg-card-dark text-light-blue-info text-xs font-semibold rounded-full whitespace-nowrap border border-white/10';
      }
    }

if (this.filterCompBtn) {
      const text = this.filterCompBtn.textContent;
      if (this.currentFilter === 'Competition') {
        this.filterCompBtn.className =
          'px-4 py-1.5 bg-primary text-off-white text-xs font-semibold rounded-full whitespace-nowrap';
      } else {
        this.filterCompBtn.className =
          'px-4 py-1.5 bg-card-dark text-light-blue-info text-xs font-semibold rounded-full whitespace-nowrap border border-white/10';
      }
    }

if (this.filterTrainBtn) {
      const text = this.filterTrainBtn.textContent;
      if (this.currentFilter === 'Training') {
        this.filterTrainBtn.className =
          'px-4 py-1.5 bg-primary text-off-white text-xs font-semibold rounded-full whitespace-nowrap';
      } else {
        this.filterTrainBtn.className =
          'px-4 py-1.5 bg-card-dark text-light-blue-info text-xs font-semibold rounded-full whitespace-nowrap border border-white/10';
      }
    }
  }

openSession(session) {
    window.location.href = `session-detail.html?id=${session.id}`;
  }

addNewSession() {
    window.location.href = 'new-session.html';
  }

escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

saveSessions() {
    try {
      localStorage.setItem('sessions', JSON.stringify(this.sessions));
    } catch (e) {
      console.warn('Could not save sessions:', e);
    }
  }

renderSessions() {
    this.currentFilteredSessions = this.getFilteredSessions();
    const grouped = this.groupSessionsByDate(this.currentFilteredSessions);
    this.mainContent.innerHTML = '';
    if (this.currentFilteredSessions.length === 0) {
      this.mainContent.innerHTML = `
        <div class="py-10 text-center">
          <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-3xl text-white/20">history</span>
          </div>
          <p class="text-light-blue-info/40 text-sm italic">Keine Sessions gefunden</p>
        </div>
      `;
      return;
    }
    Object.entries(grouped).forEach(([monthKey, sessions]) => {
      const monthHeader = document.createElement('div');
      monthHeader.className = 'flex items-center gap-2 pt-2 pb-1';
      monthHeader.innerHTML = `
        <span class="material-symbols-outlined text-light-blue-info/40 text-sm">calendar_today</span>
        <span class="text-[11px] font-bold uppercase tracking-wider text-light-blue-info/60">${monthKey}</span>
      `;
      this.mainContent.appendChild(monthHeader);
      sessions.forEach((session) => {
        const card = this.createSessionCard(session);
        this.mainContent.appendChild(card);
      });
    });
    const endMessage = document.createElement('div');
    endMessage.className = 'py-10 text-center';
    endMessage.innerHTML = `
      <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
        <span class="material-symbols-outlined text-3xl text-white/20">history</span>
      </div>
      <p class="text-light-blue-info/40 text-sm italic">End of recent sessions</p>
    `;
    this.mainContent.appendChild(endMessage);
  }

createSessionCard(session) {
    const card = document.createElement('div');
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const typeBadgeColor =
      session.type === 'Competition'
        ? 'border-neon-green/30 bg-neon-green/10 text-neon-green'
        : 'border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan';
    const typeLabel = session.type === 'Competition' ? 'Competition' : 'Training';
    card.className =
      'bg-card-dark rounded-2xl p-4 border border-white/10 flex justify-between items-center group active:scale-[0.98] transition-all cursor-pointer';
    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-lg text-off-white">${this.escapeHtml(session.name)}</h3>
          <span class="px-2 py-0.5 border ${typeBadgeColor} text-[10px] font-bold uppercase rounded tracking-wider">
            ${typeLabel}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm text-light-blue-info">${this.escapeHtml(session.location)}</span>
          <span class="text-xs text-light-blue-info/60 mt-0.5">${formattedDate}</span>
        </div>
      </div>
      <div class="flex items-center text-white/20">
        <span class="material-symbols-outlined">chevron_right</span>
      </div>
    `;
    card.addEventListener('click', () => this.openSession(session));
    return card;
  }

openSession(session) {
    window.location.href = `session-detail.html?id=${session.id}`;
  }

addNewSession() {
    window.location.href = 'new-session.html';
  }

handleAddTimeframe() {
    alert('Zeitraum hinzufügen - Bald verfügbar');
  }

handleSelectAll() {
    if (this.selectedSessions.length === this.sessions.length) {
      this.selectedSessions = [];
    } else {
      this.selectedSessions = [...this.sessions];
    }
    console.log('Ausgewählte Einheiten:', this.selectedSessions);
  }

handleCompetitionsFilter() {
    const competitionCount = this.sessions.filter((s) => s.type === 'Competition').length;
    alert(`Wettkämpfe: ${competitionCount}`);
  }

handleTrainingsFilter() {
    const trainingCount = this.sessions.filter((s) => s.type === 'Training').length;
    alert(`Trainings: ${trainingCount}`);
  }

saveSessions() {
    try {
      localStorage.setItem('sessions', JSON.stringify(this.sessions));
    } catch (e) {
      console.warn('Could not save sessions:', e);
    }
  }

escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});