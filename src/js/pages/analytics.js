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
 * Analytics Page Script
 * Displays athlete list for selection and handles analytics views
 */

class AnalyticsPage {
  constructor() {
    this.container = document.getElementById('analytics-content');
    this.analylsisSection = document.getElementById('analysis-content');
    this.analysisChevron = document.getElementById('analysis-chevron');
    this.backBtn = document.getElementById('analytics-back');
    this.title = document.getElementById('analytics-title');
    this.subtitle = document.getElementById('analytics-subtitle');
    this.athletes = [];
    this.sessions = [];
    this.currentAthleteFilter = 'all';
    this.currentSessionFilter = 'all';
    this.currentSeriesFilter = 'all';
    this.currentAthlete = null;
    this.currentSession = null;
    this.currentView = 'selection';
    this.currentAthleteSessionFilter = 'all';
    this.currentShots = [];
    this.currentSeriesList = [];
    this.userRole = localStorage.getItem('b_user_role');
    this.personalAthleteId = parseInt(localStorage.getItem('b_personal_athlete_id'));
    this.init();
  }

  async init() {
    await Promise.all([this.loadAthletes(), this.loadSessions()]);
    this.updateAthleteSessionCounts();

    this.renderSessionList();
    if (this.backBtn) this.backBtn.classList.add('hidden');

    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => {
        if (this.userRole === 'athlete') {
          if (this.currentView === 'session_detail') {
            this.renderSessionList();
            if (this.backBtn) this.backBtn.classList.add('hidden');
            return;
          }
        }

        if (this.currentView === 'athletes' || this.currentView === 'sessions') {
          this.renderSelection();
        } else if (this.currentView === 'athlete_detail') {
          this.currentAthlete = null;
          this.renderAthleteList();
        } else if (this.currentView === 'session_detail') {
          this.currentSession = null;
          this.renderSessionList();
        }
      });
    }
  }

  async loadAthletes() {
    try {
      this.athletes = (await apiService.getAthletes()) || [];
      if (this.userRole === 'athlete' && this.personalAthleteId) {
        this.athletes = this.athletes.filter((a) => a.id === this.personalAthleteId);
      }
    } catch (e) {
      this.athletes = [];
    }
  }

  async loadSessions() {
    try {
      this.sessions = (await apiService.getSessions()) || [];
      if (this.userRole === 'athlete' && this.personalAthleteId) {
        this.sessions = this.sessions.filter((s) => {
          const inAthletesList = s.athletes && s.athletes.includes(this.personalAthleteId);
          const hasSeries =
            s.series && s.series.some((ser) => ser.athleteId === this.personalAthleteId);
          return inAthletesList || hasSeries;
        });
      }
    } catch (e) {
      this.sessions = [];
    }
  }

  updateAthleteSessionCounts() {
    if (!this.athletes.length || !this.sessions.length) return;

    const counts = {};
    this.sessions.forEach((session) => {
      if (session.athletes && Array.isArray(session.athletes)) {
        session.athletes.forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }

      if (session.series) {
        const uniqueInSeries = new Set();
        session.series.forEach((s) => {
          if (s.athleteId && (!session.athletes || !session.athletes.includes(s.athleteId))) {
            uniqueInSeries.add(s.athleteId);
          }
        });
        uniqueInSeries.forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }
    });

    this.athletes.forEach((athlete) => {
      athlete.sessions = counts[athlete.id] || 0;
    });
  }

  renderSessionList() {
    if (!this.container) return;
    this.currentView = 'sessions';
    if (this.backBtn) this.backBtn.classList.add('hidden');
    if (this.title) this.title.textContent = t('analytics') || 'Analyse';
    if (this.subtitle) {
      this.subtitle.textContent =
        this.userRole === 'coach' ? t('coach_account') : t('athlete_account');
    }

    let filteredSessions = [...this.sessions];
    if (this.currentSessionFilter !== 'all') {
      filteredSessions = filteredSessions.filter((s) => s.type === this.currentSessionFilter);
    }

    this.container.innerHTML = `
      <div class="px-1 pb-4 space-y-4">
        <div id="analytics-session-list" class="space-y-6"></div>
      </div>
    `;

    const list = document.getElementById('analytics-session-list');
    if (!list) return;

    if (filteredSessions.length === 0) {
      list.innerHTML = `
        <div class="py-12 text-center bg-card-dark rounded-2xl border border-subtle">
          <p class="text-light-blue-info/50 text-base italic">${t('no_sessions') || 'Keine Trainings gefunden'}</p>
        </div>`;
    } else {
      const groups = {};
      [...filteredSessions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach((session) => {
          const date = new Date(session.date);
          const monthYear = date.toLocaleDateString([], { month: 'long', year: 'numeric' });
          if (!groups[monthYear]) groups[monthYear] = [];
          groups[monthYear].push(session);
        });

      Object.entries(groups).forEach(([monthYear, monthSessions]) => {
        const header = document.createElement('div');
        header.className = 'pt-2 pb-1 px-1';
        header.innerHTML = `<span class="text-[10px] font-black uppercase tracking-[0.2em] text-light-blue-info/50">${monthYear}</span>`;
        list.appendChild(header);

        monthSessions.forEach((session) => {
          const card = this.createSessionCard(session);
          list.appendChild(card);
        });
      });
    }

    let allShots = [];
    let totalSeries = 0;
    filteredSessions.forEach((session) => {
      if (session.series) {
        session.series.forEach((s) => {
          if (this.userRole === 'athlete' && s.athleteId !== this.personalAthleteId) return;
          totalSeries++;
          if (s.shots) {
            allShots = allShots.concat(s.shots);
          }
        });
      }
    });
    this.updateAnalysis(allShots, totalSeries, []);
  }

  createSessionCard(session) {
    const card = document.createElement('div');
    card.className =
      'w-full bg-card-dark border border-subtle rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer group hover:border-primary/50';

    const typeColors = {
      training: 'bg-primary/10 text-primary border-primary/20',
      competition: 'bg-neon-green/10 text-neon-green border-neon-green/20',
      testing: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20',
    };
    const activeColor = typeColors[session.type] || typeColors.training;

    const typeIcons = {
      training: 'fitness_center',
      competition: 'emoji_events',
      testing: 'biotech',
    };
    const icon = typeIcons[session.type] || 'calendar_today';

    const dateStr = session.date
      ? new Date(session.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '??';

    const athleteCount = session.athletes ? session.athletes.length : 0;
    const seriesCount = session.series ? session.series.length : 0;

    card.innerHTML = `
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <div class="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0 group-hover:border-primary/50 transition-all overflow-hidden relative shadow-inner">
          <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span class="text-[10px] font-black uppercase leading-none mb-0.5 text-primary">${dateStr.split(' ')[0]}</span>
          <span class="text-sm font-bold leading-none text-off-white">${dateStr.split(' ')[1] || ''}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-bold text-off-white text-lg truncate tracking-tight group-hover:text-primary transition-colors leading-tight">${this.escapeHtml(session.name)}</h3>
            <span class="px-2 py-0.5 rounded-full ${activeColor} text-[9px] font-black uppercase tracking-widest shadow-sm border border-current/10">${session.type}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-light-blue-info/50 font-bold">
             <div class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">location_on</span>
                <span class="truncate max-w-[80px]">${this.escapeHtml(session.location || 'Unknown')}</span>
             </div>
             <span class="text-zinc-800 font-black">•</span>
             <div class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">person</span>
                <span>${athleteCount}</span>
             </div>
             <span class="text-zinc-800 font-black">•</span>
             <div class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">history</span>
                <span>${seriesCount} ${t('series')}</span>
             </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 ml-2">
         <span class="material-symbols-outlined text-light-blue-info/20 group-hover:text-primary group-hover:translate-x-1 transition-all text-2xl">chevron_right</span>
      </div>
    `;
    card.addEventListener('click', () => {
      this.selectSession(session);
    });
    return card;
  }

  selectSession(session) {
    this.currentSession = session;
    this.currentView = 'session_detail';
    if (this.title) this.title.textContent = session.name;
    if (this.backBtn) this.backBtn.classList.remove('hidden');
    this.renderSessionSeriesList(session);
  }

  renderSessionSeriesList(session) {
    if (!session) return;
    let sessionSeries = session.series || [];
    if (this.userRole === 'athlete' && this.personalAthleteId) {
      sessionSeries = sessionSeries.filter((s) => s.athleteId === this.personalAthleteId);
    }

    sessionSeries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.container.innerHTML = `
      <div class="px-1 pb-2 space-y-3">
        <div class="flex justify-between items-center bg-card-dark/50 p-3 rounded-2xl border border-subtle/20">
          <div class="flex flex-col">
            <h2 class="text-sm font-bold text-light-blue-info uppercase tracking-widest">${t('series')}</h2>
            <span class="text-[10px] text-light-blue-info/50 font-bold">${sessionSeries.length} ${t('series')}</span>
          </div>
          <div class="flex gap-2">
            <button id="session-export-pdf" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold border border-primary/20 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-sm">picture_as_pdf</span>
                ${t('export_pdf') || 'PDF'}
            </button>
            <button id="session-export-excel" class="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/10 text-neon-green rounded-xl text-xs font-bold border border-neon-green/20 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-sm">description</span>
                ${t('export_excel') || 'Excel'}
            </button>
          </div>
        </div>
      </div>
      <div id="analytics-series-list" class="space-y-3 pb-20"></div>
    `;

    const pdfBtn = document.getElementById('session-export-pdf');
    const excelBtn = document.getElementById('session-export-excel');
    if (pdfBtn) pdfBtn.onclick = () => this.exportSessionToPDF_Analytics(session, sessionSeries);
    if (excelBtn)
      excelBtn.onclick = () => this.exportSessionToExcel_Analytics(session, sessionSeries);

    const list = document.getElementById('analytics-series-list');
    if (sessionSeries.length === 0) {
      list.innerHTML = `
        <div class="py-12 text-center">
          <div class="w-16 h-16 bg-off-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined text-3xl text-off-white/20">history</span>
          </div>
          <p class="text-light-blue-info/50 text-base italic">${t('no_series_found') || 'Keine Serien gefunden'}</p>
        </div>`;
    } else {
      sessionSeries.forEach((s) => {
        const card = this.createSeriesCard({
          ...s,
          sessionDate: session.date,
          sessionLocation: session.location,
          sessionId: session.id,
          sessionType: session.type,
        });
        list.appendChild(card);
      });
    }

    let allShots = [];
    sessionSeries.forEach((s) => {
      if (s.shots) {
        allShots = allShots.concat(s.shots);
      }
    });
    this.updateAnalysis(allShots, sessionSeries.length, sessionSeries);
  }

  renderAthleteList() {
    if (!this.container) return;
    this.currentView = 'athletes';
    if (this.backBtn) this.backBtn.classList.add('hidden');
    if (this.title) this.title.textContent = t('analytics') || 'Analyse';
    if (this.subtitle) {
      this.subtitle.textContent =
        this.userRole === 'coach' ? t('coach_account') : t('athlete_account');
    }

    let filteredAthletes = this.athletes;
    if (this.currentAthleteFilter !== 'all') {
      if (['m', 'w'].includes(this.currentAthleteFilter)) {
        filteredAthletes = filteredAthletes.filter((a) => a.gender === this.currentAthleteFilter);
      } else {
        filteredAthletes = filteredAthletes.filter((a) => a.ageGroup === this.currentAthleteFilter);
      }
    }
    this.container.innerHTML = `
            <div id="analytics-athlete-list" class="space-y-3 pt-2"></div>
        `;
    const list = document.getElementById('analytics-athlete-list');
    if (filteredAthletes.length === 0) {
      list.innerHTML = `
                <div class="py-12 text-center bg-card-dark rounded-2xl border border-subtle">
                    <p class="text-light-blue-info/50 text-base italic">${t('no_athletes_filter')}</p>
                </div>`;
      return;
    }
    filteredAthletes.forEach((athlete) => {
      const card = this.createAthleteCard(athlete);
      list.appendChild(card);
    });
    let allShots = [];
    let totalSeries = 0;
    const athleteIds = new Set(filteredAthletes.map((a) => a.id));
    this.sessions.forEach((session) => {
      if (session.series) {
        session.series.forEach((s) => {
          if (athleteIds.has(s.athleteId)) {
            totalSeries++;
            if (s.shots) {
              allShots = allShots.concat(s.shots);
            }
          }
        });
      }
    });
    this.updateAnalysis(allShots, totalSeries, []);
  }

  createAthleteCard(athlete) {
    const card = document.createElement('div');
    card.className =
      'w-full bg-card-dark border border-subtle rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer group hover:border-primary/50';
    const initials = this.getInitials(athlete.name);
    card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span class="text-primary font-bold text-sm uppercase">${this.escapeHtml(initials)}</span>
                </div>
                <div>
                    <h3 class="font-bold text-off-white text-base">${this.escapeHtml(athlete.name)}</h3>
                    <p class="text-xs text-light-blue-info font-medium">${athlete.sessions || 0} ${t('sessions')} • ${athlete.ageGroup || t('no_group')}</p>
                </div>
            </div>
            <span class="material-symbols-outlined text-light-blue-info/50 group-hover:text-primary transition-colors">chevron_right</span>
        `;
    card.addEventListener('click', () => {
      this.selectAthlete(athlete);
    });
    return card;
  }

  selectAthlete(athlete) {
    this.currentAthlete = athlete;
    this.currentView = 'athlete_detail';
    this.currentAthleteSessionFilter = 'all';
    if (this.title) this.title.textContent = athlete.name;
    if (this.backBtn) this.backBtn.classList.remove('hidden');
    this.renderSeriesList();
  }

  renderSeriesList() {
    if (!this.currentAthlete) return;
    let athleteSeries = [];
    const athleteSessions = [];
    const seenSessions = new Set();

    this.sessions.forEach((session) => {
      let athleteJoinedSession = false;
      if (session.series) {
        session.series.forEach((s) => {
          if (s.athleteId === this.currentAthlete.id) {
            athleteJoinedSession = true;
            athleteSeries.push({
              ...s,
              sessionDate: session.date,
              sessionLocation: session.location,
              sessionId: session.id,
              sessionType: session.type,
              sessionName: session.name,
            });
          }
        });
      }

      if (athleteJoinedSession && !seenSessions.has(session.id)) {
        athleteSessions.push(session);
        seenSessions.add(session.id);
      }
    });

    const totalSeriesCount = athleteSeries.length;

    if (this.currentAthleteSessionFilter !== 'all') {
      athleteSeries = athleteSeries.filter((s) => s.sessionId === this.currentAthleteSessionFilter);
    }

    if (this.currentSeriesFilter !== 'all') {
      if (this.currentSeriesFilter === 'competition') {
        athleteSeries = athleteSeries.filter((s) => s.sessionType === 'competition');
      } else if (this.currentSeriesFilter === 'training') {
        athleteSeries = athleteSeries.filter((s) => s.sessionType === 'training');
      } else if (this.currentSeriesFilter === 'zeroing') {
        athleteSeries = athleteSeries.filter((s) => s.type === 'zeroing');
      } else if (this.currentSeriesFilter === 'series') {
        athleteSeries = athleteSeries.filter((s) => s.type !== 'zeroing');
      }
    }

    athleteSeries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.container.innerHTML = `
            <div class="px-1 pb-2 space-y-3">
                <div class="flex justify-between items-center bg-card-dark/50 p-3 rounded-2xl border border-subtle/20">
                    <div class="flex flex-col">
                        <h2 class="text-sm font-bold text-light-blue-info uppercase tracking-widest">${t('history')}</h2>
                        <span class="text-[10px] text-light-blue-info/50 font-bold">${athleteSeries.length} / ${totalSeriesCount} ${t('series')}</span>
                    </div>
                    <div class="flex gap-2">
                        <button id="athlete-export-pdf" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold border border-primary/20 active:scale-95 transition-all">
                            <span class="material-symbols-outlined text-sm">picture_as_pdf</span>
                            ${t('export_pdf') || 'PDF'}
                        </button>
                        <button id="athlete-export-excel" class="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/10 text-neon-green rounded-xl text-xs font-bold border border-neon-green/20 active:scale-95 transition-all">
                            <span class="material-symbols-outlined text-sm">description</span>
                            ${t('export_excel') || 'Excel'}
                        </button>
                    </div>
                </div>

                <!-- Session Units Filter -->
                <div class="space-y-1.5 pt-1">
                  <p class="text-[10px] font-bold text-light-blue-info/50 uppercase tracking-widest px-1">${t('training_units') || 'Einheiten'}</p>
                  <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                    <button data-session-filter="all"
                        class="athlete-session-filter-btn px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${
                          this.currentAthleteSessionFilter === 'all'
                            ? 'bg-primary text-off-white font-bold'
                            : 'bg-card-dark text-off-white/60 font-semibold border border-subtle'
                        }">
                        ${t('filter_all') || 'Alle'}
                    </button>
                    ${athleteSessions
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((session) => {
                        const isActive = this.currentAthleteSessionFilter === session.id;
                        const dateStr = new Date(session.date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        });
                        return `
                        <button data-session-filter="${session.id}"
                            class="athlete-session-filter-btn px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${
                              isActive
                                ? 'bg-primary text-off-white font-bold'
                                : 'bg-card-dark text-off-white/60 font-semibold border border-subtle'
                            }">
                            <div class="flex flex-col items-start leading-tight">
                              <span>${this.escapeHtml(session.name)}</span>
                              <span class="text-[8px] opacity-60">${dateStr}</span>
                            </div>
                        </button>
                      `;
                      })
                      .join('')}
                  </div>
                </div>

                ${this.renderSeriesFilters(athleteSeries, totalSeriesCount)}
            </div>
            <div id="analytics-series-list" class="space-y-3 pb-20"></div>
        `;

    const pdfBtn = document.getElementById('athlete-export-pdf');
    const excelBtn = document.getElementById('athlete-export-excel');
    if (pdfBtn) pdfBtn.onclick = () => this.exportAthleteToPDF(this.currentAthlete, athleteSeries);
    if (excelBtn)
      excelBtn.onclick = () => this.exportAthleteToExcel(this.currentAthlete, athleteSeries);

    this.attachSeriesFilterListeners();
    this.attachAthleteSessionFilterListeners();

    const list = document.getElementById('analytics-series-list');
    if (athleteSeries.length === 0) {
      list.innerHTML = `
                <div class="py-12 text-center">
                    <div class="w-16 h-16 bg-off-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="material-symbols-outlined text-3xl text-off-white/20">history</span>
                    </div>
                    <p class="text-light-blue-info/50 text-base italic">${t('no_series_filter')}</p>
                </div>`;
      return;
    }
    athleteSeries.forEach((s) => {
      const card = this.createSeriesCard(s);
      list.appendChild(card);
    });
    let allShots = [];
    athleteSeries.forEach((s) => {
      if (s.shots) {
        allShots = allShots.concat(s.shots);
      }
    });
    this.updateAnalysis(allShots, athleteSeries.length, athleteSeries);
  }

  renderSeriesFilters(currentFilteredList, totalCount) {
    const filters = [
      { id: 'all', label: t('filter_all') },
      { id: 'series', label: t('series') },
      { id: 'zeroing', label: t('zeroing') },
      { id: 'competition', label: t('competitions') },
      { id: 'training', label: t('training') },
    ];
    const style = '';
    return `
            ${style}
            <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                ${filters
                  .map((f) => {
                    const isActive = this.currentSeriesFilter === f.id;
                    return `
                        <button data-filter="${f.id}"
                            class="series-filter-btn px-6 py-2.5 rounded-full text-sm whitespace-nowrap transition-all ${
                              isActive
                                ? 'bg-primary text-off-white font-bold active:opacity-80'
                                : 'bg-card-dark text-off-white font-semibold border border-subtle active:bg-off-white/5'
                            }">
                            ${f.label}
                        </button>
                    `;
                  })
                  .join('')}
            </div>
        `;
  }

  attachSeriesFilterListeners() {
    const btns = this.container.querySelectorAll('.series-filter-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentSeriesFilter = btn.dataset.filter;
        this.renderSeriesList();
      });
    });
  }

  createSeriesCard(s) {
    const card = document.createElement('div');
    card.id = `series-card-${s.id}`;
    const stats = s.stats || {
      hitCount: s.shots ? s.shots.filter((sh) => sh.hit).length : 0,
      totalShots: s.shots ? s.shots.length : 0,
      avgRing: 0,
    };
    const label = s.type === 'zeroing' ? t('zeroing') : t('series');
    const dateStr = new Date(s.timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = new Date(s.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const shotIndicators = Array.from({ length: 5 })
      .map((_, i) => {
        const shot = s.shots && s.shots[i];
        const statusColor = shot ? (shot.hit ? 'bg-neon-green' : 'bg-neon-red') : 'bg-zinc-800';
        return `<div class="w-2 h-2 rounded-full ${statusColor} shadow-sm"></div>`;
      })
      .join('');
    const avgRing =
      stats.avgRing ||
      (s.shots && s.shots.length
        ? (s.shots.reduce((a, b) => a + (b.ring || 0), 0) / s.shots.length).toFixed(1)
        : '0');
    card.innerHTML = `
            <div class="group flex items-center gap-3 p-3 bg-card-dark rounded-2xl border border-subtle shadow-sm active:scale-[0.99] transition-all cursor-pointer to-toggle-detail">

                <!-- Left: Mini Target -->
                <div class="shrink-0 w-[52px] h-[52px]">
                    ${this.renderMiniTarget(s.shots)}
                </div>

                <!-- Right: Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-bold text-off-white tracking-wide uppercase leading-none">${label}</p>
                                <span class="text-xs text-light-blue-info/60 font-medium">${dateStr}</span>
                            </div>
                            <p class="text-xs font-bold text-light-blue-info/40 uppercase tracking-tighter mt-1">
                                ${timeStr} • ${s.sessionLocation || t('unknown_location')}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            ${s.wind !== undefined ? this.renderWindFlag(s.wind, 32) : ''}
                            <div class="text-right flex flex-col items-end">
                                <div class="flex items-center gap-1">
                                    <span class="text-xl font-black text-off-white leading-none">${stats.hitCount}</span><span class="text-xs text-zinc-500">/5</span>
                                </div>
                                ${s.totalTime ? `<span class="text-[10px] font-black text-primary/80 font-mono tracking-tighter leading-none">${s.totalTime}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Hit Indicators Row -->
                    <div class="flex items-center justify-between mt-1">
                        <div class="flex items-center gap-1.5 ml-1">
                            ${shotIndicators}
                        </div>
                        <span id="series-expand-icon-${s.id}" class="material-symbols-outlined text-xs text-light-blue-info/20 group-hover:text-primary transition-colors">chevron_left</span>
                    </div>
                </div>
            </div>

            <!-- Expanded Content (Hidden by default) -->
            <div id="series-detail-${s.id}" class="hidden mt-2 p-4 bg-white/[0.02] border border-subtle/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div class="flex gap-4">
                    <!-- Clickable Larger Target (Now opens Modal) -->
                    <div class="shrink-0 cursor-pointer active:scale-95 transition-transform to-open-modal w-[120px] h-[120px]">
                        ${this.renderMiniTarget(s.shots)}
                        <p class="text-[8px] text-center text-light-blue-info/40 mt-1 uppercase font-bold text-primary">${t('large_view')}</p>
                    </div>

                    <!-- Stats & Shot List -->
                    <div class="flex-1 min-w-0 space-y-3">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="bg-card-dark p-2 rounded-xl border border-subtle/10">
                                <p class="text-[8px] text-zinc-500 uppercase font-black">${t('avg_ring')}</p>
                                <p class="text-sm font-black text-off-white">${avgRing}</p>
                            </div>
                            <div class="bg-card-dark p-2 rounded-xl border border-subtle/10">
                                <p class="text-[8px] text-zinc-500 uppercase font-black">${t('total_time')}</p>
                                <p class="text-sm font-black text-primary font-mono">${s.totalTime || '--:--.-'}</p>
                            </div>
                        </div>

                        <!-- Detailed Shot List -->
                        <div class="space-y-1">
                            <p class="text-[8px] text-zinc-500 uppercase font-black mb-1">${t('shot_details')}</p>
                            ${(s.shots || [])
                              .map((shot, idx) => {
                                const split = s.splits
                                  ? s.splits[idx]
                                  : idx === 0
                                    ? t('start')
                                    : '';
                                return `
                                    <div class="flex items-center justify-between py-1 px-2 bg-white/[0.02] rounded-lg border border-subtle/5">
                                        <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-black text-light-blue-info/40 w-4">${idx + 1}</span>
                                            <div class="w-2 h-2 rounded-full ${shot.hit ? 'bg-neon-green' : 'bg-neon-red'} shadow-sm"></div>
                                            <span class="text-[11px] font-black text-off-white">Ring ${shot.ring || '-'}</span>
                                        </div>
                                        <span class="text-[10px] font-black text-off-white/40 font-mono">${split || '-'}</span>
                                    </div>
                                `;
                              })
                              .join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    const toggleBtn = card.querySelector('.to-toggle-detail');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSeriesDetail(s.id));
    }

    const modalBtn = card.querySelector('.to-open-modal');
    if (modalBtn) {
      modalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openTargetModal({
          type: 'series',
          series: s,
        });
      });
    }
    return card;
  }

  toggleSeriesDetail(seriesId) {
    const detail = document.getElementById(`series-detail-${seriesId}`);
    const icon = document.getElementById(`series-expand-icon-${seriesId}`);
    if (!detail || !icon) return;
    if (detail.classList.contains('hidden')) {
      detail.classList.remove('hidden');
      icon.textContent = 'expand_more';
      icon.classList.replace('text-light-blue-info/20', 'text-primary');
      icon.style.transform = 'rotate(-90deg)';
    } else {
      detail.classList.add('hidden');
      icon.textContent = 'chevron_left';
      icon.classList.replace('text-primary', 'text-light-blue-info/20');
      icon.style.transform = 'rotate(0deg)';
    }
  }

  renderMiniTarget(shots, showNumbers = true) {
    const shotSize = typeof getShotSize === 'function' ? getShotSize() : 6;
    const shotCircles = (shots || [])
      .map((s, i) => {
        const color = s.hit ? getHitColor() : getMissColor();
        const labelColor = s.hit ? getHitLabelColor() : getMissLabelColor();
        const r = shotSize;
        const sw = (shotSize / 6) * 1.5;
        const fontSize = (shotSize / 6) * 7;
        const labelContent = getShotLabelContent();
        let labelText = '';
        if (labelContent === 'number') labelText = s.shot || i + 1;
        else if (labelContent === 'ring') labelText = s.ring !== undefined ? s.ring : '0';

        const textElement =
          showNumbers && labelContent !== 'none'
            ? `<text x="${s.x}" y="${s.y + (shotSize / 6) * 0.5}" text-anchor="middle" dominant-baseline="central" fill="${labelColor}"
                          style="font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif;">${labelText}</text>`
            : '';
        return `
                <g>
                    <circle cx="${s.x}" cy="${s.y}" r="${r}" fill="${color}" stroke="white" stroke-width="${sw}" />
                    ${textElement}
                </g>
            `;
      })
      .join('');
    return `
            <svg viewBox="0 0 200 200" class="w-full h-full rounded-full bg-white shadow-inner overflow-hidden flex-shrink-0">
                <style>
                    .ring-number-white { font-family: sans-serif; font-weight: bold; font-size: 4px; fill: white; text-anchor: middle; dominant-baseline: central; }
                    .ring-number-black { font-family: sans-serif; font-weight: bold; font-size: 4px; fill: #000; text-anchor: middle; dominant-baseline: central; }
                </style>

                <!-- Background -->
                <rect x="0" y="0" width="200" height="200" fill="white" />

                <circle cx="100" cy="100" r="100" fill="white" stroke="#000" stroke-width="0.5"></circle>
                <text x="195" y="100" class="ring-number-black" text-anchor="end">1</text>
                <text x="5" y="100" class="ring-number-black" text-anchor="start">1</text>
                <text x="100" y="5" class="ring-number-black">1</text>
                <text x="100" y="195" class="ring-number-black">1</text>

                <circle cx="100" cy="100" r="90" fill="white" stroke="#000" stroke-width="0.5"></circle>
                <text x="185" y="100" class="ring-number-black" text-anchor="end">2</text>
                <text x="15" y="100" class="ring-number-black" text-anchor="start">2</text>
                <text x="100" y="15" class="ring-number-black">2</text>
                <text x="100" y="185" class="ring-number-black">2</text>

                <circle cx="100" cy="100" r="80" fill="white" stroke="#000" stroke-width="0.5"></circle>
                <text x="175" y="100" class="ring-number-black" text-anchor="end">3</text>
                <text x="25" y="100" class="ring-number-black" text-anchor="start">3</text>
                <text x="100" y="25" class="ring-number-black">3</text>
                <text x="100" y="175" class="ring-number-black">3</text>

                <circle cx="100" cy="100" r="70" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="165" y="100" class="ring-number-white" text-anchor="end">4</text>
                <text x="35" y="100" class="ring-number-white" text-anchor="start">4</text>
                <text x="100" y="35" class="ring-number-white">4</text>
                <text x="100" y="165" class="ring-number-white">4</text>

                <circle cx="100" cy="100" r="60" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="155" y="100" class="ring-number-white" text-anchor="end">5</text>
                <text x="45" y="100" class="ring-number-white" text-anchor="start">5</text>
                <text x="100" y="45" class="ring-number-white">5</text>
                <text x="100" y="155" class="ring-number-white">5</text>

                <circle cx="100" cy="100" r="50" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="145" y="100" class="ring-number-white" text-anchor="end">6</text>
                <text x="55" y="100" class="ring-number-white" text-anchor="start">6</text>
                <text x="100" y="55" class="ring-number-white">6</text>
                <text x="100" y="145" class="ring-number-white">6</text>

                <circle cx="100" cy="100" r="40" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="135" y="100" class="ring-number-white" text-anchor="end">7</text>
                <text x="65" y="100" class="ring-number-white" text-anchor="start">7</text>
                <text x="100" y="65" class="ring-number-white">7</text>
                <text x="100" y="135" class="ring-number-white">7</text>

                <circle cx="100" cy="100" r="30" fill="#000" stroke="white" stroke-width="2.5"></circle>
                <text x="125" y="100" class="ring-number-white" text-anchor="end">8</text>
                <text x="75" y="100" class="ring-number-white" text-anchor="start">8</text>
                <text x="100" y="75" class="ring-number-white">8</text>
                <text x="100" y="125" class="ring-number-white">8</text>

                <circle cx="100" cy="100" r="20" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <circle cx="100" cy="100" r="10" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <circle cx="100" cy="100" r="2" fill="white" stroke="none"></circle>

                ${shotCircles}
            </svg>
        `;
  }

  renderWindFlag(wind = 0, size = 24) {
    const absVal = Math.min(Math.abs(wind), 10);
    const scaleX = wind < 0 ? -1 : 1;
    return `
            <svg viewBox="0 0 40 40" style="width: ${size}px; height: ${size}px; overflow: visible;" class="flex-shrink-0">
                <rect x="18" y="5" width="2" height="30" fill="#cbd5e1" rx="1" />
                <circle cx="19" cy="5" r="2" fill="#94a3b8" />
                <g style="transform-origin: 19px 14px; transform: scaleX(${scaleX}) rotate(${wind}deg);">
                    <path d="M19 8 L36 14 L19 20 Z" fill="#ef4444" />
                    <path d="M19 8 L36 14 L19 11 Z" fill="rgba(0,0,0,0.15)" />
                </g>
            </svg>
        `;
  }

  getInitials(name) {
    if (!name) return '';
    const parts = name.split(' ').filter((p) => p.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  openTargetModal(data) {
    const modal = document.getElementById('targetPreviewModal');
    const container = document.getElementById('largeTargetContainer');
    const editBtn = document.getElementById('modalEditSeriesBtn');
    const titleEl = modal ? modal.querySelector('[data-i18n="target_analysis"]') : null;

    if (!modal || !container || !editBtn) return;

    if (data.type === 'series') {
      const s = data.series;
      container.innerHTML = this.renderMiniTarget(s.shots);
      if (titleEl) titleEl.textContent = t('target_analysis') || 'Treffbild Analyse';
      editBtn.classList.remove('hidden');
      editBtn.onclick = () => {
        window.location.href = `shooting.html?series=${s.id}&session=${s.sessionId}&athleteId=${s.athleteId}`;
      };
    } else if (data.type === 'heatmap') {
      container.innerHTML = this.renderHeatmap(data.shots);
      if (titleEl) titleEl.textContent = t('heatmap_analysis') || 'Heatmap Analyse';
      editBtn.classList.add('hidden');
    } else if (data.type === 'combined') {
      container.innerHTML = this.renderMiniTarget(data.shots, false);
      if (titleEl) titleEl.textContent = t('combined_accuracy') || 'Gesamtplatzierung';
      editBtn.classList.add('hidden');
    } else if (data.type === 'trend') {
      container.innerHTML = this.renderTrendChart(data.series, true);
      if (titleEl) titleEl.textContent = t('performance_trend') || 'Leistungsverlauf';
      editBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    const closeBtn = document.getElementById('closeTargetPreviewBtn');
    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.add('hidden');
    }
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    };
  }

  updateAnalysis(shots, seriesCount = 0, seriesList = []) {
    this.currentShots = shots;
    this.currentSeriesList = seriesList;
    const totalShots = shots.length;
    const hitCount = shots.filter((s) => s.hit).length;
    const totalRings = shots.reduce((sum, s) => sum + (s.ring || 0), 0);
    const hitRate = totalShots > 0 ? Math.round((hitCount / totalShots) * 100) : 0;
    const avgRings = totalShots > 0 ? (totalRings / totalShots).toFixed(1) : '0.0';

    const elSeries = document.getElementById('stat-total-series');
    const elRate = document.getElementById('stat-hit-rate');
    const elRings = document.getElementById('stat-avg-rings');
    const elShots = document.getElementById('stat-total-shots');

    if (elSeries) elSeries.textContent = seriesCount;
    if (elRate) elRate.textContent = `${hitRate}%`;
    if (elRings) elRings.textContent = avgRings;
    if (elShots) elShots.textContent = totalShots;

    const heatmapContainer = document.getElementById('heatmap-container');
    const totalContainer = document.getElementById('total-placements-container');
    const trendContainer = document.getElementById('trend-chart-container');

    if (heatmapContainer) {
      heatmapContainer.innerHTML = this.renderHeatmap(shots);
      heatmapContainer.onclick = () => {
        this.openTargetModal({
          type: 'heatmap',
          shots: this.currentShots,
        });
      };
    }

    if (totalContainer) {
      totalContainer.innerHTML = this.renderMiniTarget(shots, false);
      totalContainer.onclick = () => {
        this.openTargetModal({
          type: 'combined',
          shots: this.currentShots,
        });
      };
    }

    if (trendContainer) {
      trendContainer.innerHTML = this.renderTrendChart(seriesList);
      trendContainer.onclick = () => {
        this.openTargetModal({
          type: 'trend',
          series: this.currentSeriesList,
        });
      };
    }

    this.renderIntensityAnalytics(shots);
    this.renderDirectionTendency(shots);
    this.renderTimeGapAnalysis(shots, seriesList);
    this.renderShotTimeAnalysis(seriesList);
    this.renderRhythmAnalysis(seriesList);
    this.renderMeanShot(shots);
  }

  renderTrendChart(series, isLarge = false) {
    if (!series || series.length === 0) {
      return `<div class="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">${t('no_trend_data') || 'Keine Daten für Trend'}</div>`;
    }

    const dayData = {};
    series.forEach((s) => {
      if (!s.timestamp || s.isPlaceholder) return;
      const date = new Date(s.timestamp).toLocaleDateString();
      if (!dayData[date]) {
        dayData[date] = { hits: 0, total: 0, time: new Date(s.timestamp).getTime() };
      }

      const h = s.shots ? s.shots.filter((sh) => sh.hit).length : 0;
      const t = s.shots ? s.shots.length : 0;
      dayData[date].hits += h;
      dayData[date].total += t;
    });

    const sortedDays = Object.keys(dayData)
      .map((d) => ({ date: d, ...dayData[d] }))
      .sort((a, b) => a.time - b.time);

    if (sortedDays.length === 0) {
      return `<div class="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">${t('no_trend_data') || 'Keine Daten für Trend'}</div>`;
    }

    const width = isLarge ? 400 : 300;
    const height = isLarge ? 300 : 150;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = sortedDays.map((d, i) => {
      const x =
        padding +
        (sortedDays.length > 1 ? (i / (sortedDays.length - 1)) * chartWidth : chartWidth / 2);
      const hitRate = d.total > 0 ? d.hits / d.total : 0;
      const y = padding + (1 - hitRate) * chartHeight;
      return { x, y, hitRate, date: d.date };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, i) => {
      if (i > 0) pathD += ` L ${p.x} ${p.y}`;
    });

    const dots = points
      .map(
        (p) => `
      <circle cx="${p.x}" cy="${p.y}" r="${isLarge ? 4 : 3}" fill="#007AFF" stroke="white" stroke-width="1.5" />
      <text x="${p.x}" y="${height - 10}" font-size="8" fill="#8E8E93" text-anchor="middle" class="font-bold">${p.date.split('.')[0]}.${p.date.split('.')[1]}</text>
    `
      )
      .join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-full">
        <!-- Grid -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#8E8E93" stroke-width="0.5" opacity="0.3" />
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#8E8E93" stroke-width="0.5" opacity="0.3" />
        
        <text x="${padding - 5}" y="${padding + 5}" font-size="8" fill="#8E8E93" text-anchor="end">100%</text>
        <text x="${padding - 5}" y="${height - padding}" font-size="8" fill="#8E8E93" text-anchor="end">0%</text>

        <!-- Path -->
        <path d="${pathD}" fill="none" stroke="#007AFF" stroke-width="${isLarge ? 4 : 3}" stroke-linecap="round" stroke-linejoin="round" />
        
        ${dots}
      </svg>
    `;
  }

  renderHeatmap(shots) {
    const center = { x: 100, y: 100 };
    let countZone1 = 0;
    let countZone2 = 0;
    let countZone3 = 0;
    let countZone4Total = 0;
    let countZone4TopRight = 0;
    let countZone4BottomRight = 0;
    let countZone4BottomLeft = 0;
    let countZone4TopLeft = 0;
    shots.forEach((shot) => {
      if (!shot) return;
      const dx = shot.x - center.x;
      const dy = shot.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 15) {
        countZone1++;
      } else if (distance <= 30) {
        countZone2++;
      } else if (distance <= 70) {
        countZone3++;
      } else {
        countZone4Total++;
        if (dx > 0 && dy < 0) countZone4TopRight++;
        else if (dx > 0 && dy > 0) countZone4BottomRight++;
        else if (dx < 0 && dy > 0) countZone4BottomLeft++;
        else if (dx < 0 && dy < 0) countZone4TopLeft++;
      }
    });
    const total = shots.length;
    const p = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);
    const positions = [
      { x: 100, y: 100, percent: p(countZone1), size: 12 },
      { x: 100, y: 80, percent: p(countZone2), size: 11 },
      { x: 100, y: 50, percent: p(countZone3), size: 11 },
      { x: 165, y: 40, percent: p(countZone4TopRight), size: 11 },
      { x: 165, y: 160, percent: p(countZone4BottomRight), size: 11 },
      { x: 35, y: 160, percent: p(countZone4BottomLeft), size: 11 },
      { x: 35, y: 40, percent: p(countZone4TopLeft), size: 11 },
      { x: 100, y: 15, percent: p(countZone4Total), size: 11 },
    ];
    let svg = `
            <svg viewBox="0 0 200 200" class="w-full h-full rounded-full bg-zinc-100 shadow-inner overflow-hidden">
                <style>
                    .zone-percentage { font-family: sans-serif; text-anchor: middle; dominant-baseline: central; font-weight: 900; }
                    .crosshair-line { stroke: #ffffff; stroke-width: 1px; opacity: 0.9; }
                </style>
                <circle cx="100" cy="100" r="100" fill="#560101" />
                <circle cx="100" cy="100" r="70" fill="#034286" />
                <circle cx="100" cy="100" r="30" fill="#226b03" stroke="white" stroke-width="2" />
                <circle cx="100" cy="100" r="15" fill="#fbbf24" />
                <line x1="100" y1="0" x2="100" y2="200" class="crosshair-line" />
                <line x1="0" y1="100" x2="200" y2="100" class="crosshair-line" />
        `;
    positions.forEach((pos) => {
      const textColor = pos.y === 100 && pos.x === 100 ? 'black' : 'white';
      svg += `<text x="${pos.x}" y="${pos.y}" class="zone-percentage" font-size="${pos.size}" fill="${textColor}">${pos.percent}%</text>`;
    });
    svg += `</svg>`;
    return svg;
  }

  exportAthleteToPDF(athlete, series) {
    if (!window.jspdf) {
      alert('PDF library not loaded');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.text(t('analytics') || 'Analytics', 14, 20);

    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text(athlete.name, 14, 30);

    const totalShots = series.reduce((sum, s) => sum + (s.shots ? s.shots.length : 0), 0);
    const hitCount = series.reduce(
      (sum, s) => sum + (s.shots ? s.shots.filter((sh) => sh.hit).length : 0),
      0
    );
    const hitRate = totalShots > 0 ? `${Math.round((hitCount / totalShots) * 100)}%` : '-';

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`${t('hit_rate')}: ${hitRate} (${hitCount}/${totalShots})`, 14, 40);
    doc.text(`${t('history')}: ${series.length} ${t('series')}`, 14, 45);

    const head = [
      [
        t('session_date') || 'Datum',
        t('location') || 'Ort',
        t('stance') || 'Anschlag',
        t('hits') || 'Treffer',
        t('total_time') || 'Zeit',
      ],
    ];

    const body = series.map((s) => {
      const sHits = s.shots ? s.shots.filter((sh) => sh.hit).length : 0;
      const sTotal = s.shots ? s.shots.length : 0;
      const dateStr = new Date(s.timestamp).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return [
        dateStr,
        s.sessionLocation || '-',
        s.type === 'zeroing' ? t('zeroing') : s.stance === 'prone' ? t('prone') : t('standing'),
        `${sHits}/${sTotal}`,
        s.totalTime || '-',
      ];
    });

    if (doc.autoTable) {
      doc.autoTable({
        head,
        body,
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [0, 122, 255] },
      });
    }

    doc.save(`Analytics_${athlete.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  }

  exportAthleteToExcel(athlete, series) {
    if (typeof XLSX === 'undefined') {
      alert('Excel library not loaded');
      return;
    }

    const data = series.map((s) => {
      const sHits = s.shots ? s.shots.filter((sh) => sh.hit).length : 0;
      const sTotal = s.shots ? s.shots.length : 0;
      const hitRate = sTotal > 0 ? Math.round((sHits / sTotal) * 100) : 0;

      return {
        [t('session_date') || 'Datum']: new Date(s.timestamp).toLocaleDateString(),
        [t('location') || 'Ort']: s.sessionLocation || '-',
        [t('stance') || 'Anschlag']: s.type === 'zeroing' ? t('zeroing') : s.stance,
        [t('hits') || 'Treffer']: sHits,
        [t('total') || 'Gesamt']: sTotal,
        [t('hit_rate') || 'Quote (%)']: hitRate,
        [t('total_time') || 'Zeit']: s.totalTime || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');

    const wscols = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Analytics_${athlete.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  }

  exportSessionToPDF_Analytics(session, series) {
    if (!window.jspdf) {
      alert('PDF library not loaded');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text(session.name, 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${session.location || '-'} | ${new Date(session.date).toLocaleDateString()}`, 14, 28);

    const uniqueAthleteIds = [...new Set(series.map((s) => s.athleteId))];
    const sessionAthletes = uniqueAthleteIds.map((id) => {
      const athlete = this.athletes.find((a) => a.id == id);
      return athlete || { id, name: t('unknown_athlete') };
    });

    let maxSeriesCount = 0;
    sessionAthletes.forEach((athlete) => {
      const count = series.filter((s) => s.athleteId == athlete.id).length;
      if (count > maxSeriesCount) maxSeriesCount = count;
    });

    const seriesCols = Array.from({ length: maxSeriesCount }, (_, i) => `SF ${i + 1}`);

    const head = [[t('name') || 'Name', t('hits') || 'Treffer', ...seriesCols]];

    const body = sessionAthletes.map((athlete) => {
      const atomSeries = series
        .filter((s) => s.athleteId == athlete.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const hitCount = atomSeries.reduce(
        (sum, s) =>
          sum + (s.stats?.hitCount || (s.shots ? s.shots.filter((sh) => sh.hit).length : 0)),
        0
      );
      const totalShots = atomSeries.reduce(
        (sum, s) => sum + (s.stats?.totalShots || (s.shots ? s.shots.length : 0)),
        0
      );
      const hitRate = totalShots > 0 ? `${Math.round((hitCount / totalShots) * 100)}%` : '-';

      const seriesData = Array.from({ length: maxSeriesCount }, (_, i) => {
        const s = atomSeries[i];
        if (!s) return '-';
        const sHits = s.shots ? s.shots.filter((sh) => sh.hit).length : s.stats?.hitCount || 0;
        const sTotal = s.shots ? s.shots.length : s.stats?.totalShots || 0;
        return `${s.rangeTime || s.totalTime || '-'} (${sHits}/${sTotal})`;
      });

      return [athlete.name, `${hitCount}/${totalShots} (${hitRate})`, ...seriesData];
    });

    if (doc.autoTable) {
      doc.autoTable({
        head,
        body,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [0, 122, 255] },
      });
    }

    doc.save(`Session_${session.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  }

  exportSessionToExcel_Analytics(session, series) {
    if (typeof XLSX === 'undefined') {
      alert('Excel library not loaded');
      return;
    }

    const uniqueAthleteIds = [...new Set(series.map((s) => s.athleteId))];
    const sessionAthletes = uniqueAthleteIds.map((id) => {
      const athlete = this.athletes.find((a) => a.id == id);
      return athlete || { id, name: t('unknown_athlete') };
    });

    let maxSeriesCount = 0;
    sessionAthletes.forEach((athlete) => {
      const count = series.filter((s) => s.athleteId == athlete.id).length;
      if (count > maxSeriesCount) maxSeriesCount = count;
    });

    const data = sessionAthletes.map((athlete) => {
      const atomSeries = series
        .filter((s) => s.athleteId == athlete.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const hitCount = atomSeries.reduce(
        (sum, s) =>
          sum + (s.stats?.hitCount || (s.shots ? s.shots.filter((sh) => sh.hit).length : 0)),
        0
      );
      const totalShots = atomSeries.reduce(
        (sum, s) => sum + (s.stats?.totalShots || (s.shots ? s.shots.length : 0)),
        0
      );
      const hitRate = totalShots > 0 ? Math.round((hitCount / totalShots) * 100) : 0;

      const row = {
        [t('name') || 'Name']: athlete.name,
        [t('hits') || 'Treffer']: hitCount,
        [t('total') || 'Gesamt']: totalShots,
        [t('hit_rate') || 'Quote (%)']: hitRate,
      };

      for (let i = 0; i < maxSeriesCount; i++) {
        const s = atomSeries[i];
        const sHits = s?.shots ? s.shots.filter((sh) => sh.hit).length : s?.stats?.hitCount || 0;
        const sTotal = s?.shots ? s.shots.length : s?.stats?.totalShots || 0;
        row[`SF ${i + 1} Zeit`] = s?.rangeTime || s?.totalTime || '-';
        row[`SF ${i + 1} Treffer`] = s ? `${sHits}/${sTotal}` : '-';
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Session');

    const wscols = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    for (let i = 0; i < maxSeriesCount; i++) {
      wscols.push({ wch: 12 });
      wscols.push({ wch: 10 });
    }
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Session_${session.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  }

  attachAthleteSessionFilterListeners() {
    const btns = this.container.querySelectorAll('.athlete-session-filter-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.sessionFilter;
        this.currentAthleteSessionFilter = filter === 'all' ? 'all' : filter;
        this.renderSeriesList();
      });
    });
  }

  renderIntensityAnalytics(shots) {
    const container = document.getElementById('intensity-analytics-container');
    if (!container) return;

    const levels =
      typeof INTENSITY_LEVELS !== 'undefined'
        ? INTENSITY_LEVELS
        : ['Ruhe', 'I1', 'I2', 'I3', 'I4', 'I5'];
    const cfg =
      typeof INTENSITY_CONFIG !== 'undefined'
        ? INTENSITY_CONFIG
        : {
            Ruhe: { bg: '#ffffff', border: '#9ca3af', text: '#374151', fill: '#e5e7eb' },
            I1: { bg: '#f3f4f6', border: '#6b7280', text: '#374151', fill: '#d1d5db' },
            I2: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', fill: '#93c5fd' },
            I3: { bg: '#dcfce7', border: '#16a34a', text: '#166534', fill: '#86efac' },
            I4: { bg: '#fef3c7', border: '#d97706', text: '#92400e', fill: '#fcd34d' },
            I5: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', fill: '#fca5a5' },
          };

    if (!shots || shots.length === 0) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Schussdaten vorhanden</div>';
      return;
    }

    const groups = {};
    levels.forEach((lvl) => (groups[lvl] = []));
    shots.forEach((s) => {
      const lvl = s.intensity && levels.includes(s.intensity) ? s.intensity : 'Ruhe';
      groups[lvl].push(s);
    });

    const hasIntensityData = levels.some((lvl) => lvl !== 'Ruhe' && groups[lvl].length > 0);

    if (!hasIntensityData) {
      container.innerHTML = `
        <div class="text-center py-6 space-y-2">
          <div class="text-zinc-400 text-sm font-bold">Noch keine Intensitätsdaten</div>
          <div class="text-zinc-500 text-xs">Wähle beim Schießen eine Intensitätsstufe (I1–I5) aus</div>
        </div>`;
      return;
    }

    const stats = {};
    levels.forEach((lvl) => {
      const grp = groups[lvl];
      const hits = grp.filter((s) => s.hit).length;
      const totalRing = grp.reduce((a, s) => a + (s.ring || 0), 0);
      const totalDist = grp.reduce((a, s) => {
        const dx = (s.x || 100) - 100;
        const dy = (s.y || 100) - 100;
        return a + Math.sqrt(dx * dx + dy * dy);
      }, 0);
      stats[lvl] = {
        count: grp.length,
        hitRate: grp.length > 0 ? (hits / grp.length) * 100 : 0,
        avgRing: grp.length > 0 ? totalRing / grp.length : 0,
        avgDist: grp.length > 0 ? totalDist / grp.length : 0,
        avgDistRings: grp.length > 0 ? totalDist / grp.length / 10 : 0,
      };
    });

    const activeLevels = levels.filter((lvl) => stats[lvl].count > 0);

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Best/Worst Cards -->
        ${this._intensityBreakpointCard(stats, activeLevels, cfg)}

        <!-- Main Stats Table (Modern look) -->
        <div class="space-y-4">
          <p class="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1">Leistung nach Belastung</p>
          <div class="bg-off-white/5 rounded-2xl border border-subtle overflow-hidden">
            ${activeLevels
              .map((lvl) => {
                const s = stats[lvl];
                const c = cfg[lvl] || {};
                return `
              <div class="p-3 border-b border-subtle last:border-0 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs" style="background-color:${c.bg}; color:${c.text}; border: 1px solid ${c.border}">
                    ${lvl}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-off-white">${s.count} ${s.count === 1 ? 'Schuss' : 'Schüsse'}</span>
                    <span class="text-[10px] text-zinc-500 font-medium">Ø ${s.avgRing.toFixed(1)} Ringe</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-lg font-black" style="color: ${s.hitRate >= 80 ? '#39FF14' : s.hitRate >= 60 ? '#fcd34d' : '#ef4444'}">
                    ${s.hitRate.toFixed(0)}%
                  </div>
                  <div class="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Trefferquote</div>
                </div>
              </div>`;
              })
              .join('')}
          </div>
        </div>

        <!-- Visual Scatter Summary -->
        <div>
          <p class="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2">Präzision (Ø Abstand)</p>
          <div class="grid grid-cols-2 gap-2">
            ${activeLevels
              .map((lvl) => {
                const s = stats[lvl];
                const c = cfg[lvl] || {};
                return `
              <div class="p-2 rounded-xl bg-off-white/5 border border-subtle/50 flex justify-between items-center transition-all hover:bg-off-white/10">
                 <span class="text-[10px] font-black" style="color:${c.border}">${lvl}</span>
                 <span class="text-xs font-bold text-off-white">${s.avgDistRings.toFixed(2)} <span class="opacity-30 text-[10px]">Ringe</span></span>
              </div>`;
              })
              .join('')}
          </div>
        </div>

        <!-- Toggle for Charts -->
        <button id="toggle-intensity-charts" class="w-full py-4 border-2 border-dashed border-subtle/20 rounded-2xl flex items-center justify-center gap-2 group hover:border-primary/50 transition-all hover:bg-primary/5">
           <span class="material-symbols-outlined text-zinc-500 group-hover:text-primary transition-colors">analytics</span>
           <span class="text-[11px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-primary transition-colors">Details & Diagramme einblenden</span>
           <span id="intensity-toggle-chevron" class="material-symbols-outlined text-zinc-500 text-sm group-hover:text-primary transition-transform">expand_more</span>
        </button>

        <!-- Hidden Charts Container -->
        <div id="intensity-charts-container" class="hidden space-y-8 pt-4 border-t border-subtle animate-in slide-in-from-top-4 duration-300">
           ${this._intensityChartsLegacy(stats, activeLevels, cfg)}
        </div>
      </div>
    `;

    const toggleBtn = document.getElementById('toggle-intensity-charts');
    const chartsContainer = document.getElementById('intensity-charts-container');
    const chevron = document.getElementById('intensity-toggle-chevron');
    if (toggleBtn && chartsContainer) {
      toggleBtn.onclick = () => {
        const isHidden = chartsContainer.classList.toggle('hidden');
        if (chevron) chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        const label = toggleBtn.querySelector('span:nth-child(2)');
        if (label)
          label.textContent = isHidden
            ? 'Details & Diagramme einblenden'
            : 'Details & Diagramme ausblenden';
      };
    }
  }

  _intensityChartsLegacy(stats, levels, cfg) {
    const total = levels.reduce((s, lvl) => s + stats[lvl].count, 0);
    const maxCount = Math.max(...levels.map((lvl) => stats[lvl].count));

    return `
      <!-- Distribution -->
      <div class="space-y-3">
         <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Trefferdichte (Histogramm)</p>
         <div class="flex items-end gap-2 h-24 px-2">
            ${levels
              .map((lvl) => {
                const s = stats[lvl];
                const pct = (s.count / total) * 100;
                const h = (s.count / maxCount) * 100;
                return `
              <div class="flex-1 flex flex-col items-center gap-1 group">
                 <div class="w-full bg-primary/10 rounded-t-md relative hover:bg-primary/20 transition-all" style="height: ${h}%">
                    <span class="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">${s.count} (${pct.toFixed(0)}%)</span>
                 </div>
                 <span class="text-[9px] font-black text-zinc-600">${lvl}</span>
              </div>`;
              })
              .join('')}
         </div>
      </div>

      <!-- Hitrate Bars -->
      <div class="space-y-4">
         <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Trefferquote nach Zone</p>
         <div class="space-y-3">
            ${levels
              .map((lvl) => {
                const s = stats[lvl];
                return `
              <div class="space-y-1">
                 <div class="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                    <span class="text-zinc-500">${lvl}</span>
                    <span class="text-off-white">${s.hitRate.toFixed(0)}%</span>
                 </div>
                 <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-primary transition-all duration-1000" style="width: ${s.hitRate}%"></div>
                 </div>
              </div>`;
              })
              .join('')}
         </div>
      </div>
    `;
  }

  _intensityBreakpointCard(stats, levels, cfg) {
    let breakpointLvl = null;
    let prevRate = null;
    for (const lvl of levels) {
      if (stats[lvl].count === 0) continue;
      const rate = stats[lvl].hitRate;
      if (prevRate !== null && rate < 70 && breakpointLvl === null) {
        breakpointLvl = lvl;
      }
      prevRate = rate;
    }

    const best = levels.reduce((b, lvl) => {
      if (stats[lvl].count === 0) return b;
      if (!b || stats[lvl].hitRate > stats[b].hitRate) return lvl;
      return b;
    }, null);

    const worst = levels.reduce((w, lvl) => {
      if (stats[lvl].count === 0) return w;
      if (!w || stats[lvl].hitRate < stats[w].hitRate) return lvl;
      return w;
    }, null);

    const bestCfg = best ? cfg[best] : null;
    const worstCfg = worst ? cfg[worst] : null;

    return `
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl p-4 bg-card-dark border border-subtle shadow-lg relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-16 h-16 bg-primary/5 -mr-4 -mt-4 rounded-full blur-2xl"></div>
          <p class="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-1 leading-none">Beste Zone</p>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-black text-off-white">${best || '–'}</p>
            <span class="text-xs font-bold text-primary">${best ? stats[best].hitRate.toFixed(0) + '%' : '–'}</span>
          </div>
          <div class="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div class="h-full bg-primary" style="width: ${best ? stats[best].hitRate : 0}%"></div>
          </div>
        </div>

        <div class="rounded-2xl p-4 bg-card-dark border border-subtle shadow-lg relative overflow-hidden">
           <div class="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 -mr-4 -mt-4 rounded-full blur-2xl"></div>
           <p class="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-1 leading-none">Schwächste Zone</p>
           <div class="flex items-baseline gap-2">
             <p class="text-2xl font-black text-off-white">${worst || '–'}</p>
             <span class="text-xs font-bold text-rose-500">${worst ? stats[worst].hitRate.toFixed(0) + '%' : '–'}</span>
           </div>
           <div class="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
             <div class="h-full bg-rose-500" style="width: ${worst ? stats[worst].hitRate : 0}%"></div>
           </div>
        </div>

        ${
          breakpointLvl
            ? `
        <div class="col-span-2 rounded-2xl p-4 bg-amber-500/10 border border-amber-500/20 shadow-lg flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
             <span class="material-symbols-outlined text-amber-500">warning</span>
          </div>
          <div>
            <p class="text-[9px] font-black uppercase tracking-[0.15em] text-amber-500/70 mb-0.5">Belastungsgrenze erkannt</p>
            <p class="text-sm font-bold text-off-white">Ab <span class="text-amber-500 font-black">${breakpointLvl}</span> sinkt deine Leistung signifikant.</p>
          </div>
        </div>`
            : ''
        }
      </div>`;
  }

  renderDirectionTendency(shots) {
    const container = document.getElementById('dir-tendency-container');
    if (!container) return;

    const missShots = (shots || []).filter((s) => !s.hit);
    if (missShots.length === 0) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Fehlschüsse vorhanden</div>';
      return;
    }

    const nMiss = missShots.length;
    const meanMissX = missShots.reduce((s, sh) => s + (sh.x || 100), 0) / nMiss;
    const meanMissY = missShots.reduce((s, sh) => s + (sh.y || 100), 0) / nMiss;

    const dists = missShots.map((sh) =>
      Math.sqrt(Math.pow((sh.x || 100) - meanMissX, 2) + Math.pow((sh.y || 100) - meanMissY, 2))
    );
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const varMiss = dists.reduce((a, b) => a + Math.pow(b - avgDist, 2), 0) / dists.length;
    const stdDevMiss = Math.sqrt(varMiss);

    const ellipseMiss =
      stdDevMiss > 0
        ? `<circle cx="${meanMissX.toFixed(1)}" cy="${meanMissY.toFixed(1)}" r="${stdDevMiss.toFixed(1)}"
               fill="rgba(244, 63, 94, 0.08)" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="4 3" />`
        : '';

    const ch = 15;
    const crosshairMiss = `
      <defs>
        <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g filter="url(#glow-red)">
        <line x1="${(meanMissX - ch).toFixed(1)}" y1="${meanMissY.toFixed(1)}" x2="${(meanMissX + ch).toFixed(1)}" y2="${meanMissY.toFixed(1)}"
          stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
        <line x1="${meanMissX.toFixed(1)}" y1="${(meanMissY - ch).toFixed(1)}" x2="${meanMissX.toFixed(1)}" y2="${(meanMissY + ch).toFixed(1)}"
          stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
      </g>
      <circle cx="${meanMissX.toFixed(1)}" cy="${meanMissY.toFixed(1)}" r="4.5" fill="#f43f5e" stroke="white" stroke-width="1.5" />
    `;

    const dots = missShots
      .map((s) => {
        const sx = s.x || 100;
        const sy = s.y || 100;
        return `<circle cx="${sx}" cy="${sy}" r="2" fill="#f43f5e" opacity="0.12" />`;
      })
      .join('');

    container.innerHTML = this._meanShotTargetSvg(dots, '', ellipseMiss + crosshairMiss);

    const offX = (meanMissX - 100) / 10;
    const offY = (meanMissY - 100) / 10;
    const offXLabel =
      offX > 0
        ? `${offX.toFixed(2)} R rechts`
        : offX < 0
          ? `${Math.abs(offX).toFixed(2)} R links`
          : 'mittig';
    const offYLabel =
      offY > 0
        ? `${offY.toFixed(2)} R unten`
        : offY < 0
          ? `${Math.abs(offY).toFixed(2)} R oben`
          : 'mittig';

    const meanRadMiss = Math.sqrt(Math.pow(meanMissX - 100, 2) + Math.pow(meanMissY - 100, 2));
    const meanRingMiss = Math.max(0, 11 - meanRadMiss / 10).toFixed(2);

    const info = document.createElement('div');
    info.className = 'mt-4 space-y-2 px-1';
    info.innerHTML = `
      <div class="flex justify-between items-center bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
        <span class="text-[10px] font-black text-rose-500/60 uppercase tracking-widest">Ø Fehler-Punkt (Ring)</span>
        <span class="text-lg font-black text-rose-500">${meanRingMiss}</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Abweichung</p>
           <p class="text-[11px] font-bold text-off-white">${offXLabel}<br/>${offYLabel}</p>
        </div>
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Ø Streuung (σ)</p>
           <p class="text-[11px] font-bold text-off-white">${(stdDevMiss / 10).toFixed(2)} <span class="text-[9px] opacity-40">Ringe</span></p>
        </div>
      </div>`;
    container.appendChild(info);
  }

  renderTimeGapAnalysis(shots, seriesList) {
    const container = document.getElementById('time-gap-container');
    if (!container) return;

    const parseSplit = (str) => {
      if (!str || str === '-') return null;
      const s = String(str).trim();
      const parts = s.split(':');
      if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(s) || null;
    };

    const sortedSeries = [...(seriesList || [])]
      .filter((s) => s.shots && s.shots.length > 0)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8);

    if (sortedSeries.length === 0) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Zeit-Daten vorhanden</div>';
      return;
    }

    let maxTotalTime = 0;
    const processedSeries = sortedSeries.map((series) => {
      const times = (series.splits || []).map(parseSplit).filter((t) => t !== null);
      const totalTime = times.length > 0 ? Math.max(...times) : 0;
      if (totalTime > maxTotalTime) maxTotalTime = totalTime;
      return { ...series, totalTime, times };
    });

    if (maxTotalTime === 0) maxTotalTime = 30;

    let html = '<div class="space-y-4 pb-2">';
    processedSeries.forEach((series) => {
      const isProne = series.stance === 'Liegend';
      const stanceIcon = isProne
        ? 'assets/images/prone_silhouette.png'
        : 'assets/images/standing_silhouette.png';

      const dots = series.shots
        .map((sh, idx) => {
          const color = sh.hit ? 'bg-neon-green' : 'bg-rose-500';
          return `<div class="w-2.5 h-2.5 rounded-full ${color} ring-1 ring-white/20"></div>`;
        })
        .join('');

      const markers = series.times
        .map((t, idx) => {
          const pos = (t / maxTotalTime) * 100;
          const isHit = series.shots[idx] ? series.shots[idx].hit : true;
          const color = isHit ? '#39FF14' : '#f43f5e';
          const opacity = isHit ? '1' : '0.9';
          return `<line x1="${pos}%" y1="0" x2="${pos}%" y2="100%" stroke="${color}" stroke-width="2" opacity="${opacity}" />`;
        })
        .join('');

      html += `
        <div class="group">
          <div class="flex items-center gap-3 mb-1.5 px-1">
            <div class="w-6 h-6 flex-shrink-0 bg-white/5 rounded-md p-1 border border-subtle/30">
                <img src="${stanceIcon}" class="w-full h-full object-contain ${isProne ? '' : 'scale-110'}" style="filter: invert(1) brightness(0.9) grayscale(1);" />
            </div>
            <div class="flex gap-1.5">
                ${dots}
                ${
                  series.shots.length < 5
                    ? `<div class="flex gap-1.5 opacity-20">${Array(5 - series.shots.length)
                        .fill('<div class="w-2.5 h-2.5 rounded-full bg-zinc-600"></div>')
                        .join('')}</div>`
                    : ''
                }
            </div>
            <div class="ml-auto text-[10px] font-black text-zinc-500 uppercase tracking-tighter">
                ${series.totalTime > 0 ? series.totalTime.toFixed(1) + 's' : ''}
            </div>
          </div>
          
          <div class="relative h-6 bg-white/5 rounded-lg overflow-hidden border border-subtle/20 shadow-inner">
            <div class="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/20" style="width: ${(series.totalTime / maxTotalTime) * 100}%"></div>
            <svg class="absolute inset-0 w-full h-full overflow-visible">
                ${markers}
            </svg>
            ${series.times.length === 0 ? `<div class="absolute inset-0 flex items-center justify-center"><span class="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">Keine Splits</span></div>` : ''}
          </div>
          
          <div class="flex justify-between mt-1 px-1">
             <span class="text-[8px] font-bold text-zinc-600 uppercase">${new Date(series.timestamp).toLocaleDateString()} ${new Date(series.timestamp).getHours()}:${new Date(series.timestamp).getMinutes()}</span>
             <span class="text-[8px] font-black text-primary/60 uppercase tracking-widest">${series.stance}</span>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  renderShotTimeAnalysis(seriesList) {
    const container = document.getElementById('shot-time-container');
    if (!container) return;

    const parseSplit = (str) => {
      if (!str || str === '-') return null;
      const s = String(str).trim();
      const parts = s.split(':');
      if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(s) || null;
    };

    const hitTimes = [],
      missTimes = [];
    const zones = [
      { label: '< 3s', min: 0, max: 3, id: 'fast' },
      { label: '3–5s', min: 3, max: 5, id: 'steady' },
      { label: '5–8s', min: 5, max: 8, id: 'focused' },
      { label: '> 8s', min: 8, max: Infinity, id: 'slow' },
    ];
    const zoneHits = zones.map(() => 0);
    const zoneMisses = zones.map(() => 0);

    (seriesList || []).forEach((series) => {
      if (!series.splits || !series.shots) return;
      series.shots.forEach((shot, idx) => {
        const raw = series.splits[idx];
        const sec = parseSplit(raw);
        if (sec === null) return;
        if (shot.hit) hitTimes.push(sec);
        else missTimes.push(sec);
        zones.forEach((z, zi) => {
          if (sec >= z.min && sec < z.max) {
            if (shot.hit) zoneHits[zi]++;
            else zoneMisses[zi]++;
          }
        });
      });
    });

    const hasSplitData = hitTimes.length + missTimes.length > 0;
    if (!hasSplitData) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Split-Daten vorhanden (Splits werden beim Schießen automatisch erfasst)</div>';
      return;
    }

    const avg = (arr) =>
      arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
    const avgHit = avg(hitTimes);
    const avgMiss = avg(missTimes);

    let bestZoneIdx = -1;
    let maxRate = -1;
    zones.forEach((z, i) => {
      const total = zoneHits[i] + zoneMisses[i];
      if (total >= 3) {
        const rate = (zoneHits[i] / total) * 100;
        if (rate > maxRate) {
          maxRate = rate;
          bestZoneIdx = i;
        }
      }
    });

    const zoneHtml = zones
      .map((z, i) => {
        const total = zoneHits[i] + zoneMisses[i];
        const rate = total > 0 ? Math.round((zoneHits[i] / total) * 100) : 0;
        const isBest = i === bestZoneIdx;

        let barColor = 'bg-zinc-800';
        if (total > 0) {
          if (rate >= 85) barColor = 'bg-neon-green';
          else if (rate >= 60) barColor = 'bg-yellow-400';
          else barColor = 'bg-rose-500';
        }

        return `
        <div class="space-y-1.5">
          <div class="flex justify-between items-end px-1">
            <span class="text-[10px] font-black ${isBest ? 'text-primary' : 'text-zinc-500'} uppercase tracking-tight">${z.label}</span>
            <div class="flex items-baseline gap-1">
               <span class="text-xs font-black text-off-white">${rate}%</span>
               <span class="text-[8px] font-bold text-zinc-600 uppercase">Rate</span>
            </div>
          </div>
          <div class="h-3 w-full bg-off-white/5 rounded-full overflow-hidden border border-subtle/20 flex gap-0.5 p-0.5">
            <div class="h-full ${barColor} rounded-full transition-all duration-1000 shadow-sm" style="width: ${rate}%"></div>
          </div>
          <div class="flex justify-between px-1">
            <span class="text-[8px] font-bold text-zinc-600 uppercase">${total} Schüsse</span>
            ${isBest ? '<span class="text-[8px] font-black text-primary uppercase tracking-widest">Comfort Zone</span>' : ''}
          </div>
        </div>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Summary Dashboard -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-card-dark border border-subtle rounded-2xl p-4 shadow-lg relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-12 h-12 bg-neon-green/5 -mr-4 -mt-4 rounded-full blur-xl"></div>
            <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 leading-none">Ø Zeit Treffer</p>
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-black text-neon-green">${avgHit || '–'}</span>
              <span class="text-[10px] font-bold text-zinc-500 uppercase">sek</span>
            </div>
          </div>
          <div class="bg-card-dark border border-subtle rounded-2xl p-4 shadow-lg relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-12 h-12 bg-rose-500/5 -mr-4 -mt-4 rounded-full blur-xl"></div>
            <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 leading-none">Ø Zeit Fehler</p>
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-black text-rose-500">${avgMiss || '–'}</span>
              <span class="text-[10px] font-bold text-zinc-500 uppercase">sek</span>
            </div>
          </div>
        </div>

        <!-- Zones Grid -->
        <div class="space-y-4">
          <div class="flex justify-between items-center px-1">
            <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Quote nach Zeitfenster</p>
            <div class="flex gap-2">
               <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-neon-green"></div><span class="text-[8px] font-bold text-zinc-600 uppercase">Gut</span></div>
               <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-yellow-400"></div><span class="text-[8px] font-bold text-zinc-600 uppercase">Mittel</span></div>
               <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div><span class="text-[8px] font-bold text-zinc-600 uppercase">Kritisch</span></div>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-4 bg-off-white/5 p-4 rounded-2xl border border-subtle/50">
            ${zoneHtml}
          </div>
        </div>

        <!-- Insight Message -->
        ${
          bestZoneIdx !== -1
            ? `
          <div class="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
             <span class="material-symbols-outlined text-primary text-xl">psychology</span>
             <p class="text-xs font-medium text-off-white/80">
               Deine höchste Präzision liegt im Bereich <span class="text-primary font-bold">${zones[bestZoneIdx].label}</span>.
               ${bestZoneIdx === 0 ? 'Extrem mutiges Timing!' : bestZoneIdx === 3 ? 'Geduld zahlt sich aus.' : 'Ein stabiler Rhythmus.'}
             </p>
          </div>
        `
            : ''
        }
      </div>`;
  }

  renderRhythmAnalysis(seriesList) {
    const container = document.getElementById('rhythm-container');
    if (!container) return;

    const parseSplit = (str) => {
      if (!str || str === '-') return null;
      const s = String(str).trim();
      const parts = s.split(':');
      if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      return parseFloat(s) || null;
    };

    const dataByStep = [
      { clean: [], error: [] },
      { clean: [], error: [] },
      { clean: [], error: [] },
      { clean: [], error: [] },
    ];

    (seriesList || [])
      .filter((s) => s.splits && s.shots && s.shots.length > 1)
      .forEach((series) => {
        const anyMiss = series.shots.some((s) => !s.hit);
        let prevSec = null;
        for (let i = 0; i < Math.min(series.shots.length, 5); i++) {
          const sec = parseSplit(series.splits[i]);
          if (sec === null) {
            prevSec = null;
            continue;
          }

if (i > 0 && prevSec !== null && dataByStep[i - 1]) {
            const interval = sec - prevSec;
            if (interval > 0 && interval < 40) {
              if (anyMiss) dataByStep[i - 1].error.push(interval);
              else dataByStep[i - 1].clean.push(interval);
            }
          }
          prevSec = sec;
        }
      });

    const hasData = dataByStep.some((d) => d.clean.length + d.error.length > 0);
    if (!hasData) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Zu wenig Rhythmus-Daten vorhanden</div>';
      return;
    }

    const calcStats = (arr) => {
      if (arr.length === 0) return { avg: null, sd: 0 };
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      const sd =
        arr.length > 1
          ? Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length)
          : 0;
      return { avg, sd };
    };

    const statsClean = dataByStep.map((d) => calcStats(d.clean));
    const statsError = dataByStep.map((d) => calcStats(d.error));

    const W = 300,
      H = 140,
      pad = { l: 24, r: 10, t: 20, b: 34 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const xStep = chartW / 3;
    const allVals = dataByStep.flatMap((d) => [...d.clean, ...d.error]);
    const maxTime = Math.min(Math.max(...allVals, 5) * 1.15, 30);

    const getPath = (stats, type) => {
      const valid = stats
        .map((s, i) =>
          s.avg !== null
            ? {
                x: pad.l + i * xStep,
                y: pad.t + chartH - (s.avg / maxTime) * chartH,
                sd: (s.sd / maxTime) * chartH,
              }
            : null
        )
        .filter((p) => p !== null);
      if (valid.length < 2) return { line: '', area: '', dots: '' };

      const line = `M ${valid.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
      const area = `M ${valid.map((p) => `${p.x.toFixed(1)},${(p.y - p.sd).toFixed(1)}`).join(' L ')} 
                     L ${valid
                       .reverse()
                       .map((p) => `${p.x.toFixed(1)},${(p.y + p.sd).toFixed(1)}`)
                       .join(' L ')} Z`;

      const dots = stats
        .map((s, i) => {
          if (s.avg === null) return '';
          const x = pad.l + i * xStep;
          const y = pad.t + chartH - (s.avg / maxTime) * chartH;
          const color = type === 'clean' ? '#39FF14' : '#f43f5e';
          return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="#18181b" stroke-width="1.5" />`;
        })
        .join('');

      return { line, area, dots };
    };

    const pClean = getPath(statsClean, 'clean');
    const pError = getPath(statsError, 'error');

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="w-full overflow-visible">
        <!-- Grid -->
        <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + chartH}" stroke="#27272a" stroke-width="0.5" />
        <line x1="${pad.l}" y1="${pad.t + chartH}" x2="${W - pad.r}" y2="${pad.t + chartH}" stroke="#27272a" stroke-width="0.5" />
        
        <!-- Y Axis Labels -->
        <text x="${pad.l - 4}" y="${pad.t + 4}" font-size="7" fill="#52525b" text-anchor="end">${maxTime.toFixed(0)}s</text>
        <text x="${pad.l - 4}" y="${pad.t + chartH}" font-size="7" fill="#52525b" text-anchor="end">0s</text>
        
        <!-- Clean Path (Area + Line) -->
        <path d="${pClean.area}" fill="#39FF14" opacity="0.08" />
        <path d="${pClean.line}" fill="none" stroke="#39FF14" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pClean.dots}
        
        <!-- Error Path (Area + Line) -->
        <path d="${pError.area}" fill="#f43f5e" opacity="0.1" />
        <path d="${pError.line}" fill="none" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pError.dots}
        
        <!-- X Axis Labels -->
        ${['1→2', '2→3', '3→4', '4→5']
          .map(
            (label, i) => `
            <text x="${pad.l + i * xStep}" y="${H - 12}" font-size="8" font-weight="900" fill="#71717a" text-anchor="middle">${label}</text>
        `
          )
          .join('')}
      </svg>
      
      <div class="flex justify-between items-center mt-2 px-1">
        <div class="flex gap-4">
          <div class="flex items-center gap-1.5">
            <div class="w-5 h-1 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.4)]"></div>
            <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ø Sauber</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-5 h-1 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
            <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ø Fehler</span>
          </div>
        </div>
        <p class="text-[8px] text-zinc-600 font-bold uppercase italic">Rhythmus-Band (Trend)</p>
      </div>`;
  }

  renderMeanShot(shots) {
    const container = document.getElementById('mean-shot-container');
    if (!container) return;

    if (!shots || shots.length === 0) {
      container.innerHTML =
        '<div class="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">Keine Schussdaten</div>';
      return;
    }

    const n = shots.length;
    const meanX = shots.reduce((s, sh) => s + (sh.x || 100), 0) / n;
    const meanY = shots.reduce((s, sh) => s + (sh.y || 100), 0) / n;

    const dists = shots.map((sh) =>
      Math.sqrt(Math.pow((sh.x || 100) - meanX, 2) + Math.pow((sh.y || 100) - meanY, 2))
    );
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const variance = dists.reduce((a, b) => a + Math.pow(b - avgDist, 2), 0) / dists.length;
    const stdDev = Math.sqrt(variance);

    const offX = (meanX - 100) / 10;
    const offY = (meanY - 100) / 10;
    const offXLabel =
      offX > 0
        ? `${offX.toFixed(2)} R rechts`
        : offX < 0
          ? `${Math.abs(offX).toFixed(2)} R links`
          : 'mittig';
    const offYLabel =
      offY > 0
        ? `${offY.toFixed(2)} R unten`
        : offY < 0
          ? `${Math.abs(offY).toFixed(2)} R oben`
          : 'mittig';

    const meanRad = Math.sqrt(Math.pow(meanX - 100, 2) + Math.pow(meanY - 100, 2));
    const meanRingScore = Math.max(0, 11 - meanRad / 10).toFixed(2);

    const ellipse =
      stdDev > 0
        ? `<circle cx="${meanX.toFixed(1)}" cy="${meanY.toFixed(1)}" r="${stdDev.toFixed(1)}"
           fill="rgba(0,122,255,0.08)" stroke="#007AFF" stroke-width="1" stroke-dasharray="4 3" />`
        : '';

    const ch = 15;
    const crosshair = `
      <!-- Glow Effect for Crosshair -->
      <g filter="url(#crosshair-glow)">
        <line x1="${(meanX - ch).toFixed(1)}" y1="${meanY.toFixed(1)}" x2="${(meanX + ch).toFixed(1)}" y2="${meanY.toFixed(1)}"
          stroke="#007AFF" stroke-width="4" stroke-linecap="round" />
        <line x1="${meanX.toFixed(1)}" y1="${(meanY - ch).toFixed(1)}" x2="${meanX.toFixed(1)}" y2="${(meanY + ch).toFixed(1)}"
          stroke="#007AFF" stroke-width="4" stroke-linecap="round" />
      </g>
      <circle cx="${meanX.toFixed(1)}" cy="${meanY.toFixed(1)}" r="4.5" fill="#007AFF" stroke="white" stroke-width="1.5 rounded-full shadow-lg" />`;

    container.innerHTML = this._meanShotTargetSvg('', ellipse, crosshair);

    const info = document.createElement('div');
    info.className = 'mt-4 space-y-2 px-1';
    info.innerHTML = `
      <div class="flex justify-between items-center bg-off-white/5 p-3 rounded-xl border border-subtle/30">
        <span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ø Treffpunkt (Ring)</span>
        <span class="text-lg font-black text-primary">${meanRingScore}</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Abweichung</p>
           <p class="text-[11px] font-bold text-off-white">${offXLabel}<br/>${offYLabel}</p>
        </div>
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Ø Streuung (σ)</p>
           <p class="text-[11px] font-bold text-off-white">${(stdDev / 10).toFixed(2)} <span class="text-[9px] opacity-40">Ringe</span></p>
        </div>
      </div>
      
      <div class="flex items-center justify-center gap-2 pt-1">
        <div class="w-4 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(0,122,255,0.5)]"></div>
        <span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Durchschnittlicher Schuss</span>
      </div>`;
    container.appendChild(info);
  }

  _meanShotTargetSvg(shotCircles, ellipse, overlay) {
    return `
      <svg viewBox="0 0 200 200" class="w-64 h-64 rounded-full bg-white shadow-inner overflow-hidden flex-shrink-0 animate-in zoom-in-50 duration-500">
        <defs>
          <filter id="crosshair-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <style>
            .rn-w { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 4px; fill: white; text-anchor: middle; dominant-baseline: central; }
            .rn-b { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 4px; fill: #000; text-anchor: middle; dominant-baseline: central; }
          </style>
        </defs>

        <rect x="0" y="0" width="200" height="200" fill="white" />

        <circle cx="100" cy="100" r="100" fill="white" stroke="#000" stroke-width="0.5" />
        <text x="195" y="100" class="rn-b" text-anchor="end">1</text>
        <text x="5" y="100" class="rn-b" text-anchor="start">1</text>
        <text x="100" y="5" class="rn-b">1</text>
        <text x="100" y="195" class="rn-b">1</text>

        <circle cx="100" cy="100" r="90" fill="white" stroke="#000" stroke-width="0.5" />
        <text x="185" y="100" class="rn-b" text-anchor="end">2</text>
        <text x="15" y="100" class="rn-b" text-anchor="start">2</text>
        <text x="100" y="15" class="rn-b">2</text>
        <text x="100" y="185" class="rn-b">2</text>

        <circle cx="100" cy="100" r="80" fill="white" stroke="#000" stroke-width="0.5" />
        <text x="175" y="100" class="rn-b" text-anchor="end">3</text>
        <text x="25" y="100" class="rn-b" text-anchor="start">3</text>
        <text x="100" y="25" class="rn-b">3</text>
        <text x="100" y="175" class="rn-b">3</text>

        <circle cx="100" cy="100" r="70" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="165" y="100" class="rn-w" text-anchor="end">4</text>
        <text x="35" y="100" class="rn-w" text-anchor="start">4</text>
        <text x="100" y="35" class="rn-w">4</text>
        <text x="100" y="165" class="rn-w">4</text>

        <circle cx="100" cy="100" r="60" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="155" y="100" class="rn-w" text-anchor="end">5</text>
        <text x="45" y="100" class="rn-w" text-anchor="start">5</text>
        <text x="100" y="45" class="rn-w">5</text>
        <text x="100" y="155" class="rn-w">5</text>

        <circle cx="100" cy="100" r="50" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="145" y="100" class="rn-w" text-anchor="end">6</text>
        <text x="55" y="100" class="rn-w" text-anchor="start">6</text>
        <text x="100" y="55" class="rn-w">6</text>
        <text x="100" y="145" class="rn-w">6</text>

        <circle cx="100" cy="100" r="40" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="135" y="100" class="rn-w" text-anchor="end">7</text>
        <text x="65" y="100" class="rn-w" text-anchor="start">7</text>
        <text x="100" y="65" class="rn-w">7</text>
        <text x="100" y="135" class="rn-w">7</text>

        <circle cx="100" cy="100" r="30" fill="#000" stroke="white" stroke-width="2.5" />
        <text x="125" y="100" class="rn-w" text-anchor="end">8</text>
        <text x="75" y="100" class="rn-w" text-anchor="start">8</text>
        <text x="100" y="75" class="rn-w">8</text>
        <text x="100" y="125" class="rn-w">8</text>

        <circle cx="100" cy="100" r="20" fill="#000" stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="10" fill="#000" stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="2" fill="white" stroke="none" />

        ${shotCircles || ''}
        ${ellipse || ''}
        ${overlay || ''}
      </svg>
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
window.AnalyticsPage = AnalyticsPage;
document.addEventListener('DOMContentLoaded', () => {
  window.Analytics = new AnalyticsPage();
});
