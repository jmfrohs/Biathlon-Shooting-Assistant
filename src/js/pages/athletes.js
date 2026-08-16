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
 * Athleten-Seite Script
 * Verwaltet Athletenliste und Schießtraining
 */

class AthletesPage {
  constructor() {
    this.athletesList = document.getElementById('athletesList');
    this.addAthleteBtn = document.getElementById('btn-new-athlete');
    this.targetModal = document.getElementById('targetModal');
    this.targetModalBackdrop = document.getElementById('targetModalBackdrop');
    this.targetSvgContainer = document.getElementById('targetSvgContainer');
    this.targetAthleteName = document.getElementById('targetAthleteName');
    this.closeTargetModalBtn = document.getElementById('closeTargetModalBtn');
    this.clearShotsBtn = document.getElementById('clearShotsBtn');
    this.saveShotsBtn = document.getElementById('saveShotsBtn');
    this.cancelShotsBtn = document.getElementById('cancelShotsBtn');
    this.backToAthletesBtn = document.getElementById('backToAthletesBtn');
    this.shotCount = document.getElementById('shotCount');
    this.hitCount = document.getElementById('hitCount');
    this.pointsCount = document.getElementById('pointsCount');
    this.shotListContainer = document.getElementById('shotListContainer');
    this.targetAthletesListContainer = document.getElementById('targetAthletesListContainer');
    this.shootingSection = document.getElementById('shootingSection');
    this.athletes = [];
    this.currentShots = [];
    this.currentAthlete = null;
    this.svgTarget = null;
    this.currentFilter = 'all';
    this.currentSearchTerm = '';
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadAthletes();
    await this.updateAthleteSessionCounts();
    this.updateFilterCounts();
    this.renderAthletesList();
    const urlParams = new URLSearchParams(window.location.search);
    const shootId = urlParams.get('shoot');
    if (shootId) {
      const athlete = this.athletes.find((a) => a.id === parseInt(shootId));
      if (athlete) {
        window.history.replaceState({}, document.title, window.location.pathname);
        this.openShootingModal(athlete);
      }
    }
  }

  setupEventListeners() {
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => this.goBack());
    }

    if (this.addAthleteBtn) {
      this.addAthleteBtn.addEventListener('click', () => this.addNewAthlete());
    }

    if (this.targetModalBackdrop) {
      this.targetModalBackdrop.addEventListener('click', () => this.closeTargetModal());
    }

    if (this.closeTargetModalBtn) {
      this.closeTargetModalBtn.addEventListener('click', () => this.closeTargetModal());
    }

    if (this.clearShotsBtn) {
      this.clearShotsBtn.addEventListener('click', () => this.clearShots());
    }

    if (this.saveShotsBtn) {
      this.saveShotsBtn.addEventListener('click', () => this.saveShots());
    }

    if (this.cancelShotsBtn) {
      this.cancelShotsBtn.addEventListener('click', () => this.closeTargetModal());
    }

    if (this.backToAthletesBtn) {
      this.backToAthletesBtn.addEventListener('click', () => this.backToAthletesList());
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentSearchTerm = e.target.value.toLowerCase();
        this.renderAthletesList();
      });
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.getAttribute('data-filter');
        filterBtns.forEach((b) => {
          b.classList.remove('bg-primary', 'font-bold');
          b.classList.add('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
        });
        btn.classList.remove('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
        btn.classList.add('bg-primary', 'font-bold');
        this.renderAthletesList();
      });
    });
  }

  goBack() {
    window.location.href = 'index.html';
  }

  async loadAthletes() {
    try {
      this.athletes = (await apiService.getAthletes()) || [];
    } catch (e) {
      this.athletes = [];
    }
  }

  async updateAthleteSessionCounts() {
    try {
      const sessions = (await apiService.getSessions()) || [];
      const counts = {};
      sessions.forEach((session) => {
        if (session.athletes && Array.isArray(session.athletes)) {
          session.athletes.forEach((id) => {
            counts[id] = (counts[id] || 0) + 1;
          });
        }
      });
      this.athletes.forEach((athlete) => {
        athlete.sessions = counts[athlete.id] || 0;
      });
    } catch (e) {
      console.error('Error updating session counts:', e);
    }
  }

  getMockAthletes() {
    return [
      { id: 1, name: 'Julius Ceasar', sessions: 5, ageGroup: 'AK 16', gender: 'm' },
      { id: 2, name: 'Anna Bolina', sessions: 3, ageGroup: 'AK 17', gender: 'w' },
      { id: 3, name: 'Michael Jordan', sessions: 7, ageGroup: 'Senioren', gender: 'm' },
    ];
  }

  applySuggestion(value) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = value;
      this.currentSearchTerm = value.toLowerCase();
      this.renderAthletesList();
    }
  }

  resetFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    this.currentSearchTerm = '';
    this.currentFilter = 'all';
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      const filter = btn.getAttribute('data-filter');
      if (filter === 'all') {
        btn.classList.remove('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
        btn.classList.add('bg-primary', 'font-bold');
      } else {
        btn.classList.remove('bg-primary', 'font-bold');
        btn.classList.add('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
      }
    });
    this.renderAthletesList();
  }

  renderAthletesList() {
    if (!this.athletesList) {
      return;
    }

    let filteredAthletes = [...this.athletes];
    if (this.currentSearchTerm) {
      filteredAthletes = filteredAthletes.filter(
        (athlete) =>
          athlete.name.toLowerCase().includes(this.currentSearchTerm) ||
          (athlete.ageGroup && athlete.ageGroup.toLowerCase().includes(this.currentSearchTerm))
      );
    }

    if (this.currentFilter !== 'all') {
      if (this.currentFilter === 'm' || this.currentFilter === 'w') {
        filteredAthletes = filteredAthletes.filter(
          (athlete) => athlete.gender === this.currentFilter
        );
      } else {
        filteredAthletes = filteredAthletes.filter(
          (athlete) => athlete.ageGroup === this.currentFilter
        );
      }
    }
    this.athletesList.innerHTML = '';
    if (filteredAthletes.length === 0) {
      if (this.athletes.length === 0) {
        this.athletesList.innerHTML = `
          <div class="py-10 px-4 text-center animate-fade-in bg-card-dark/60 border border-subtle rounded-3xl p-6 shadow-xl backdrop-blur-md max-w-sm mx-auto my-4">
            <div class="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary shadow-inner">
              <span class="material-symbols-outlined text-3xl">person_add</span>
            </div>
            <h3 class="text-lg font-bold text-off-white mb-1">${typeof t === 'function' ? t('empty_state_no_athletes_title') : 'Noch keine Sportler angelegt'}</h3>
            <p class="text-xs text-light-blue-info/70 mb-6 leading-relaxed">${typeof t === 'function' ? t('empty_state_no_athletes_desc') : 'Lege deinen ersten Sportler an, um Schießergebnisse und Trainingseinheiten zuzuordnen.'}</p>
            <div class="flex justify-center">
              <a href="new-athlete.html" class="w-full px-5 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-lg">person_add</span>
                <span>${typeof t === 'function' ? t('create_first_athlete') : 'Ersten Sportler anlegen'}</span>
              </a>
            </div>
          </div>`;
        return;
      }

      let suggestionsHtml = '';
      if (this.currentSearchTerm) {
        const candidates = Array.from(
          new Set(this.athletes.flatMap((a) => [a.name, a.ageGroup]).filter(Boolean))
        );
        const suggestions = getBestSuggestions(this.currentSearchTerm, candidates);
        if (suggestions.length > 0) {
          suggestionsHtml = `
            <div class="mt-4 flex flex-col items-center gap-2">
              <span class="text-xs text-light-blue-info/50 font-medium">${t('did_you_mean')}</span>
              <div class="flex flex-wrap gap-2 justify-center">
                ${suggestions
                  .map(
                    (s) => `
                  <button onclick="window.athletesPageInstance.applySuggestion('${s.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-primary/10 hover:bg-primary/25 border border-primary/20 hover:border-primary/40 text-xs text-primary font-medium rounded-full transition-all duration-200 cursor-pointer">
                    ${s}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
          `;
        }
      }

      let filterResetBtnHtml = '';
      if (this.currentFilter !== 'all' || this.currentSearchTerm) {
        filterResetBtnHtml = `
          <button onclick="window.athletesPageInstance.resetFilters()" class="mt-4 px-4 py-2 bg-off-white/5 hover:bg-off-white/10 border border-subtle text-xs text-primary font-semibold rounded-full active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-sm">filter_alt_off</span>
            <span>${typeof t === 'function' ? t('reset_filter') : 'Filter zurücksetzen'}</span>
          </button>
        `;
      }

      this.athletesList.innerHTML = `
                <div class="py-12 text-center">
                    <div class="w-16 h-16 bg-off-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="material-symbols-outlined text-3xl text-off-white/20">search_off</span>
                    </div>
                    <p class="text-light-blue-info/50 text-base italic">${t('no_athletes')}</p>
                    ${suggestionsHtml}
                    ${filterResetBtnHtml}
                    <div class="mt-6 flex justify-center">
                      <a href="new-athlete.html" class="px-4 py-2.5 bg-primary/20 border border-primary/30 text-primary font-bold text-xs rounded-xl active:scale-95 transition-all inline-flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">person_add</span>
                        <span>${typeof t === 'function' ? t('create_athlete') : 'Sportler anlegen'}</span>
                      </a>
                    </div>
                </div>`;
      return;
    }
    filteredAthletes.forEach((athlete) => {
      const card = this.createAthleteCard(athlete);
      this.athletesList.appendChild(card);
    });
  }

  createAthleteCard(athlete) {
    const wrapper = document.createElement('div');
    wrapper.className = 'athlete-card relative group';
    wrapper.setAttribute('data-athlete-id', athlete.id);
    const deleteLayer = document.createElement('div');
    deleteLayer.className = 'athlete-card-delete';
    deleteLayer.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined">delete</span>
                <span class="font-bold text-sm">${t('delete')}</span>
            </div>
        `;
    deleteLayer.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAthlete(athlete.id);
    });
    const content = document.createElement('div');
    content.className =
      'athlete-card-content bg-card-dark border border-subtle rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer';
    const initials = this.getInitials(athlete.name);
    const sessionCount = athlete.sessions || 0;
    const sessionLabel =
      sessionCount === 1 ? t('session_singular') || 'Einheit' : t('sessions') || 'Einheiten';
    content.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span class="text-primary font-bold text-sm uppercase">${this.escapeHtml(initials)}</span>
                </div>
                <div>
                    <h3 class="font-bold text-off-white text-base">${this.escapeHtml(athlete.name)}</h3>
                    <p class="text-xs text-light-blue-info font-medium">${sessionCount} ${sessionLabel} • ${athlete.ageGroup || t('no_group')}</p>
                </div>
            </div>
            <span class="material-symbols-outlined text-light-blue-info/50">chevron_right</span>
        `;
    wrapper.appendChild(deleteLayer);
    wrapper.appendChild(content);
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    let dragDistance = 0;
    const threshold = 80;

    content.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startX = e.clientX;
      content.style.transition = 'none';
      isSwiping = true;
      dragDistance = 0;
      content.setPointerCapture(e.pointerId);
    });

    content.addEventListener('pointermove', (e) => {
      if (!isSwiping) return;
      currentX = e.clientX - startX;
      if (currentX < 0) currentX = 0;
      if (currentX > 120) currentX = 120 + (currentX - 120) * 0.2;
      dragDistance = Math.abs(currentX);

      content.style.transform = `translateX(${currentX}px)`;
    });

    content.addEventListener('pointerup', (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      content.releasePointerCapture(e.pointerId);

      content.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      if (currentX > threshold) {
        content.style.transform = 'translateX(100px)';
      } else {
        content.style.transform = 'translateX(0)';
      }
      setTimeout(() => {
        currentX = 0;
      }, 50);
    });

    content.addEventListener('pointercancel', (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      content.releasePointerCapture(e.pointerId);
      content.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      content.style.transform = 'translateX(0)';
      currentX = 0;
    });

    content.addEventListener('click', (e) => {
      const currentTransform =
        parseFloat(content.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
      if (currentTransform > 5 || dragDistance > 5) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (currentTransform > 0) {
        content.style.transition = 'transform 0.3s ease';
        content.style.transform = 'translateX(0)';
        return;
      }
      window.location.href = `new-athlete.html?edit=${athlete.id}`;
    });
    return wrapper;
  }

  async deleteAthlete(athleteId) {
    if (!confirm(t('confirm_delete_athlete'))) return;
    try {
      await apiService.deleteAthlete(athleteId);
    } catch (e) {
      alert('Fehler beim Löschen.');
      return;
    }
    this.athletes = this.athletes.filter((a) => a.id !== athleteId);
    this.updateFilterCounts();
    this.renderAthletesList();
  }

  openShootingModal(athlete) {
    this.renderTargetAthletesList(athlete);
    this.shootingSection.style.display = 'none';
    this.targetModal.style.display = 'flex';
  }

  renderTargetAthletesList(selectedAthlete) {
    this.targetAthletesListContainer.innerHTML = '';
    const item = document.createElement('div');
    item.className = 'target-athlete-item active';
    const initials = this.getInitials(selectedAthlete.name);
    item.innerHTML = `
            <div class="target-athlete-info">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <span class="text-primary font-bold text-xs uppercase">${this.escapeHtml(initials)}</span>
                </div>
                <span class="target-athlete-name font-semibold">${this.escapeHtml(selectedAthlete.name)}</span>
            </div>
            <div class="target-athlete-controls">
                <button class="expand-btn" data-athlete-name="${selectedAthlete.name}" title="Aufklappen">▼</button>
                <button class="shoot-btn" data-athlete-name="${selectedAthlete.name}">+ Schießen</button>
            </div>
        `;
    const shootBtn = item.querySelector('.shoot-btn');
    shootBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startShooting(selectedAthlete.name);
    });
    this.targetAthletesListContainer.appendChild(item);
  }

  startShooting(athleteName) {
    this.currentAthlete = athleteName;
    this.currentShots = [];
    this.targetAthleteName.textContent = athleteName;
    this.shootingSection.style.display = 'block';
    this.clearShotsBtn.style.display = 'block';
    this.saveShotsBtn.style.display = 'block';
    this.backToAthletesBtn.style.display = 'block';
    this.renderTarget();
    this.updateShotStats();
  }

  backToAthletesList() {
    this.shootingSection.style.display = 'none';
    this.clearShotsBtn.style.display = 'none';
    this.saveShotsBtn.style.display = 'none';
    this.backToAthletesBtn.style.display = 'none';
    this.currentShots = [];
    this.currentAthlete = null;
  }

  closeTargetModal() {
    this.targetModal.style.display = 'none';
    this.currentShots = [];
    this.currentAthlete = null;
  }

  renderTarget() {
    const svgString = generateTargetSvg(this.currentShots);
    this.targetSvgContainer.innerHTML = svgString;
    this.svgTarget = this.targetSvgContainer.querySelector('svg');
    if (this.svgTarget) {
      this.svgTarget.addEventListener('click', (e) => this.handleTargetClick(e));
    }
  }

  handleTargetClick(e) {
    if (e.target.tagName !== 'svg') {
      const svg = this.svgTarget;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (200 / rect.width);
      const y = (e.clientY - rect.top) * (200 / rect.height);
      this.addShot(x, y);
    } else {
      const rect = e.target.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (200 / rect.width);
      const y = (e.clientY - rect.top) * (200 / rect.height);
      this.addShot(x, y);
    }
  }

  addShot(x, y) {
    const ring = calculateRing(x, y);
    if (ring < 0) {
      return;
    }

    const shot = {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      ring: Math.max(0, ring),
      hit: isHit(ring),
      shot: this.currentShots.length + 1,
    };
    this.currentShots.push(shot);
    this.renderTarget();
    this.updateShotStats();
  }

  clearShots() {
    if (confirm(t('confirm_clear_shots'))) {
      this.currentShots = [];
      this.renderTarget();
      this.updateShotStats();
    }
  }

  updateShotStats() {
    const totalShots = this.currentShots.length;
    const hits = this.currentShots.filter((s) => s.hit).length;
    const points = this.currentShots.reduce((sum, shot) => {
      return sum + (shot.hit ? shot.ring : 0);
    }, 0);
    this.shotCount.textContent = totalShots;
    this.hitCount.textContent = hits;
    this.pointsCount.textContent = points;
    this.renderShotList();
  }

  renderShotList() {
    this.shotListContainer.innerHTML = '';
    if (this.currentShots.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.style.cssText =
        'text-align: center; color: var(--dark-gray); padding: 1rem; margin: 0;';
      emptyMsg.textContent = t('no_shots_recorded');
      this.shotListContainer.appendChild(emptyMsg);
      return;
    }
    this.currentShots.forEach((shot) => {
      const item = document.createElement('div');
      item.className = `shot-item ${shot.hit ? 'hit' : 'miss'}`;
      const status = shot.hit ? 'TREFFER' : 'FEHLER';
      const points = shot.hit ? shot.ring : 0;
      item.innerHTML = `
                <span class="shot-item-number">#${shot.shot}</span>
                <span class="shot-item-ring">Ring ${shot.ring}</span>
                <span class="shot-item-status ${shot.hit ? 'hit' : 'miss'}">${status}</span>
                <span class="shot-item-points">${points}pt</span>
            `;
      this.shotListContainer.appendChild(item);
    });
  }

  saveShots() {
    if (this.currentShots.length === 0) {
      alert(t('no_shots_recorded'));
      return;
    }
    try {
      const athleteIndex = this.athletes.findIndex((a) => a.name === this.currentAthlete);
      if (athleteIndex === -1) {
        alert(t('athlete_not_found'));
        return;
      }

      const sessionsData = localStorage.getItem('b_sessions');
      let sessions = sessionsData ? JSON.parse(sessionsData) : [];
      const newSession = {
        athleteIndex: athleteIndex,
        datum: new Date().toISOString().split('T')[0],
        zeit: new Date().toLocaleTimeString('de-DE'),
        typ: 'Training',
        ort: '',
        shots: this.currentShots.map((shot) => ({
          x: shot.x,
          y: shot.y,
          ring: shot.ring,
          hit: shot.hit,
        })),
        summary: {
          totalShots: this.currentShots.length,
          hits: this.currentShots.filter((s) => s.hit).length,
          points: this.currentShots.reduce((sum, s) => sum + (s.hit ? s.ring : 0), 0),
        },
      };
      sessions.push(newSession);
      localStorage.setItem('b_sessions', JSON.stringify(sessions));
      this.athletes[athleteIndex].sessions = (this.athletes[athleteIndex].sessions || 0) + 1;
      this.saveAthletes();
      this.renderAthletesList();
    } catch (e) {
      alert(t('error_saving') + ' ' + e.message);
      return;
    }

    alert(`${this.currentShots.length} ${t('shots_saved_msg')} ${this.currentAthlete}!`);
    this.closeTargetModal();
  }

  addNewAthlete() {
    const name = prompt(t('enter_athlete_name'));
    if (!name) return;
    const newAthlete = {
      id: Math.max(...(this.athletes.map((a) => a.id) || [0]), 0) + 1,
      name: name.trim(),
      sessions: 0,
    };
    this.athletes.push(newAthlete);
    this.saveAthletes();
    this.renderAthletesList();
  }

  saveAthletes() {}

  updateFilterCounts() {
    const counts = {
      all: this.athletes.length,
    };
    const groupBtns = document.querySelectorAll('.filter-btn[data-filter]');
    groupBtns.forEach((btn) => {
      const filter = btn.getAttribute('data-filter');
      if (filter !== 'all') {
        if (filter === 'm' || filter === 'w') {
          counts[filter] = this.athletes.filter((a) => a.gender === filter).length;
        } else {
          counts[filter] = this.athletes.filter((a) => a.ageGroup === filter).length;
        }
      }
    });
    groupBtns.forEach((btn) => {
      const filter = btn.getAttribute('data-filter');
      const label = filter === 'all' ? 'All' : filter;
      btn.textContent = `${label} (${counts[filter] || 0})`;
    });
  }

  getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ').filter((p) => p.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

function navigateTo(url) {
  window.location.href = url;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('athletesList')) {
    window.athletesPageInstance = new AthletesPage();
  }

  if (typeof translateApp === 'function') {
    translateApp();
  }

  const athletesBtn = document.getElementById('nav-athletes');
  if (athletesBtn) {
    athletesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('athletes.html');
    });
  }

  const calendarBtn = document.getElementById('nav-calendar');
  if (calendarBtn) {
    calendarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('calendar.html');
    });
  }

  const sessionsBtn = document.getElementById('nav-sessions');
  if (sessionsBtn) {
    sessionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('index.html');
    });
  }

  const analyticsBtn = document.getElementById('nav-analytics');
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('analytics.html');
    });
  }

  const menuBtn = document.getElementById('nav-menu');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('menu.html');
    });
  }

  const settingsBtn = document.getElementById('nav-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('settings.html');
    });
  }
});
