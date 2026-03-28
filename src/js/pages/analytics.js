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
    this.init();
  }

  async init() {
    await Promise.all([this.loadAthletes(), this.loadSessions()]);
    this.updateAthleteSessionCounts();
    this.renderSelection();
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => {
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
    } catch (e) {
      this.athletes = [];
    }
  }

  async loadSessions() {
    try {
      this.sessions = (await apiService.getSessions()) || [];
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

  renderSelection() {
    if (!this.container) return;
    this.currentView = 'selection';
    if (this.backBtn) this.backBtn.classList.add('hidden');
    if (this.title) this.title.textContent = t('analytics') || 'Analytics';

    this.container.innerHTML = `
      <div class="space-y-6 pt-2">
        <div class="px-1">
          <h2 class="text-xs font-bold text-light-blue-info uppercase tracking-widest mb-4 transition-all animate-in fade-in slide-in-from-left duration-500">${t('select_view') || 'Ansicht wählen'}</h2>
          
          <div class="grid grid-cols-2 gap-4">
            <!-- Athlete Card -->
            <div id="select-athletes" 
              class="group relative overflow-hidden bg-card-dark border border-subtle rounded-[28px] p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-all hover:border-primary/50 shadow-lg animate-in zoom-in duration-300">
              <div class="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[40px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              
              <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center transition-all group-hover:bg-primary group-hover:shadow-[0_0_20px_rgba(0,122,255,0.4)]">
                <span class="material-symbols-outlined text-[32px] text-primary transition-colors group-hover:text-white">groups</span>
              </div>
              
              <div class="text-center">
                <h3 class="text-base font-bold text-off-white leading-tight">${t('athletes') || 'Sportler'}</h3>
                <p class="text-[10px] text-light-blue-info/60 font-medium mt-1 leading-snug">${t('view_athlete_stats_short') || 'Nach Sportler'}</p>
              </div>
              
              <div class="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-primary text-sm">arrow_forward</span>
              </div>
            </div>

            <!-- Training Card -->
            <div id="select-sessions" 
              class="group relative overflow-hidden bg-card-dark border border-subtle rounded-[28px] p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-all hover:border-neon-green/50 shadow-lg animate-in zoom-in duration-300 delay-75">
              <div class="absolute top-0 right-0 w-16 h-16 bg-neon-green/5 rounded-bl-[40px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              
              <div class="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center transition-all group-hover:bg-neon-green group-hover:shadow-[0_0_20px_rgba(57,255,20,0.3)]">
                <span class="material-symbols-outlined text-[32px] text-neon-green transition-colors group-hover:text-black font-variation-light">event_note</span>
              </div>
              
              <div class="text-center">
                <h3 class="text-base font-bold text-off-white leading-tight">${t('trainings') || 'Trainings'}</h3>
                <p class="text-[10px] text-light-blue-info/60 font-medium mt-1 leading-snug">${t('view_session_stats_short') || 'Nach Training'}</p>
              </div>

              <div class="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-neon-green text-sm">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Summary Header -->
        <div class="px-1 pt-2 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
           <h2 class="text-xs font-bold text-light-blue-info uppercase tracking-widest mb-1">${t('overall_stats') || 'Gesamtstatistik'}</h2>
        </div>
      </div>
    `;

    document.getElementById('select-athletes').addEventListener('click', () => {
      this.renderAthleteList();
    });
    document.getElementById('select-sessions').addEventListener('click', () => {
      this.renderSessionList();
    });

    let allShots = [];
    let totalSeries = 0;
    this.sessions.forEach((session) => {
      if (session.series) {
        session.series.forEach((s) => {
          totalSeries++;
          if (s.shots) {
            allShots = allShots.concat(s.shots);
          }
        });
      }
    });
    this.updateAnalysis(allShots, totalSeries, []);
  }

  renderSessionList() {
    if (!this.container) return;
    this.currentView = 'sessions';
    if (this.backBtn) this.backBtn.classList.remove('hidden');
    if (this.title) this.title.textContent = t('trainings') || 'Trainings';

    let filteredSessions = this.sessions;
    if (this.currentSessionFilter !== 'all') {
      filteredSessions = filteredSessions.filter((s) => s.type === this.currentSessionFilter);
    }

    this.container.innerHTML = `
      <div class="px-1 pb-4 space-y-4">
        ${this.renderSessionFilters()}
        <div id="analytics-session-list" class="space-y-6"></div>
      </div>
    `;

    this.attachSessionFilterListeners();
    const list = document.getElementById('analytics-session-list');

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
          totalSeries++;
          if (s.shots) {
            allShots = allShots.concat(s.shots);
          }
        });
      }
    });
    this.updateAnalysis(allShots, totalSeries, []);
  }

  renderSessionFilters() {
    const filters = [
      { id: 'all', label: t('filter_all') || 'Alle' },
      { id: 'training', label: t('training') || 'Training' },
      { id: 'competition', label: t('competitions') || 'Wettkampf' },
      { id: 'testing', label: t('testing') || 'Test' },
    ];

    return `
      <div class="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        ${filters
          .map((f) => {
            const isActive = this.currentSessionFilter === f.id;
            let count = 0;
            if (f.id === 'all') count = this.sessions.length;
            else count = this.sessions.filter((s) => s.type === f.id).length;

            return `
              <button data-filter="${f.id}"
                class="session-filter-btn px-6 py-2.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-off-white font-bold active:opacity-80'
                    : 'bg-card-dark text-off-white font-semibold border border-subtle active:bg-off-white/5'
                }">
                ${f.label} (${count})
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  }

  attachSessionFilterListeners() {
    const btns = this.container.querySelectorAll('.session-filter-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentSessionFilter = btn.dataset.filter;
        this.renderSessionList();
      });
    });
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
        <div class="w-12 h-12 rounded-2xl ${activeColor} border border-transparent flex flex-col items-center justify-center shrink-0 group-hover:border-current transition-colors">
          <span class="text-[10px] font-black uppercase leading-none mb-0.5">${dateStr.split(' ')[0]}</span>
          <span class="text-base font-bold leading-none">${dateStr.split(' ')[1] || ''}</span>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="font-bold text-off-white text-base truncate">${this.escapeHtml(session.name)}</h3>
            <span class="px-1.5 py-0.5 rounded-md ${activeColor} text-[8px] font-black uppercase tracking-tighter">${session.type}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-light-blue-info/60 font-medium">
             <div class="flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">location_on</span>
                <span class="truncate max-w-[100px]">${this.escapeHtml(session.location || 'Unknown')}</span>
             </div>
             <span>•</span>
             <div class="flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">groups</span>
                <span>${athleteCount}</span>
             </div>
             <span>•</span>
             <div class="flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">history</span>
                <span>${seriesCount} ${t('series')}</span>
             </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
         ${session.type === 'competition' ? '<span class="material-symbols-outlined text-neon-green text-sm">stars</span>' : ''}
         <span class="material-symbols-outlined text-light-blue-info/30 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
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
    if (this.backBtn) this.backBtn.classList.remove('hidden');
    if (this.title) this.title.textContent = t('athletes') || 'Sportler';

    let filteredAthletes = this.athletes;
    if (this.currentAthleteFilter !== 'all') {
      if (['m', 'w'].includes(this.currentAthleteFilter)) {
        filteredAthletes = filteredAthletes.filter((a) => a.gender === this.currentAthleteFilter);
      } else {
        filteredAthletes = filteredAthletes.filter((a) => a.ageGroup === this.currentAthleteFilter);
      }
    }
    this.container.innerHTML = `
            <div class="px-1 pb-2 space-y-3">

                ${this.renderAthleteFilters()}
            </div>
            <div id="analytics-athlete-list" class="space-y-3"></div>
        `;
    this.attachAthleteFilterListeners();
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

  renderAthleteFilters() {
    const groups = new Set();
    this.athletes.forEach((a) => {
      if (a.ageGroup) groups.add(a.ageGroup);
    });
    const categories = ['all', 'm', 'w', ...Array.from(groups).sort()];
    const style = '';
    return `
            ${style}
            <div class="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                ${categories
                  .map((cat) => {
                    const isActive = this.currentAthleteFilter === cat;
                    const label = cat === 'all' ? t('filter_all') : cat;
                    // Count
                    let count = 0;
                    if (cat === 'all') count = this.athletes.length;
                    else if (['m', 'w'].includes(cat))
                      count = this.athletes.filter((a) => a.gender === cat).length;
                    else count = this.athletes.filter((a) => a.ageGroup === cat).length;

                    return `
                        <button data-filter="${cat}"
                            class="athlete-filter-btn px-6 py-2.5 rounded-full text-sm whitespace-nowrap transition-all ${
                              isActive
                                ? 'bg-primary text-off-white font-bold active:opacity-80'
                                : 'bg-card-dark text-off-white font-semibold border border-subtle active:bg-off-white/5'
                            }">
                            ${label} (${count})
                        </button>
                    `;
                  })
                  .join('')}
            </div>
        `;
  }

  attachAthleteFilterListeners() {
    const btns = this.container.querySelectorAll('.athlete-filter-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentAthleteFilter = btn.dataset.filter;
        this.renderAthleteList();
      });
    });
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
    this.renderLoadAccuracy(shots);
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
      };
    });

    const activeLevels = levels.filter((lvl) => stats[lvl].count > 0);

    container.innerHTML = `
      <div class="space-y-6">
        ${this._intensityHitRateChart(stats, activeLevels, cfg)}
        ${this._intensityAvgRingChart(stats, activeLevels, cfg)}
        ${this._intensityDistributionChart(stats, activeLevels, cfg)}
        ${this._intensityScatterChart(stats, activeLevels, cfg)}
        ${this._intensityBreakpointCard(stats, activeLevels, cfg)}
      </div>
    `;
  }

  _intensityBarRows(stats, levels, key, maxVal, formatFn, cfg) {
    const labelW = 36;
    const maxBarW = 170;

    return levels
      .map((lvl, i) => {
        const val = stats[lvl][key];
        if (stats[lvl].count === 0) return '';
        const barW = maxVal > 0 ? Math.max(4, (val / maxVal) * maxBarW) : 0;
        const y = i * 36 + 4;
        const displayVal = formatFn(val);
        const countLabel = `(${stats[lvl].count}x)`;
        const fillColor = cfg[lvl] ? cfg[lvl].fill : '#e5e7eb';
        const borderColor = cfg[lvl] ? cfg[lvl].border : '#9ca3af';
        const textColor = cfg[lvl] ? cfg[lvl].text : '#374151';
        return `
          <g>
            <text x="34" y="${y + 15}" font-size="11" fill="${textColor}" text-anchor="end" font-weight="900" font-family="sans-serif">${lvl}</text>
            <rect x="${labelW}" y="${y}" width="${maxBarW}" height="26" rx="5" fill="#27272a" />
            <rect x="${labelW}" y="${y}" width="${barW}" height="26" rx="5" fill="${fillColor}" />
            <text x="${labelW + maxBarW + 8}" y="${y + 13}" font-size="11" fill="${textColor}" font-weight="900" font-family="sans-serif">${displayVal}</text>
            <text x="${labelW + maxBarW + 8}" y="${y + 24}" font-size="8" fill="#6b7280" font-family="sans-serif">${countLabel}</text>
          </g>`;
      })
      .join('');
  }

  _intensityHitRateChart(stats, levels, cfg) {
    const rows = this._intensityBarRows(
      stats,
      levels,
      'hitRate',
      100,
      (v) => `${v.toFixed(0)}%`,
      cfg
    );
    const h = levels.length * 36 + 20;
    return `
      <div>
        <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Treffer-Quote je Intensität</p>
        <svg viewBox="0 0 280 ${h}" class="w-full">
          <text x="210" y="10" font-size="8" fill="#4b5563" text-anchor="start" font-family="sans-serif">0%   50%   100%</text>
          <line x1="36" y1="14" x2="206" y2="14" stroke="#27272a" stroke-width="0.5" />
          ${rows}
        </svg>
      </div>`;
  }

  _intensityAvgRingChart(stats, levels, cfg) {
    const rows = this._intensityBarRows(
      stats,
      levels,
      'avgRing',
      10,
      (v) => `Ø ${v.toFixed(1)}`,
      cfg
    );
    const h = levels.length * 36 + 20;
    return `
      <div>
        <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Ø Ring je Intensität</p>
        <svg viewBox="0 0 280 ${h}" class="w-full">
          <text x="210" y="10" font-size="8" fill="#4b5563" text-anchor="start" font-family="sans-serif">0     5     10</text>
          <line x1="36" y1="14" x2="206" y2="14" stroke="#27272a" stroke-width="0.5" />
          ${rows}
        </svg>
      </div>`;
  }

  _intensityDistributionChart(stats, levels, cfg) {
    const total = levels.reduce((s, lvl) => s + stats[lvl].count, 0);
    if (total === 0) return '';
    const maxCount = Math.max(...levels.map((lvl) => stats[lvl].count));
    const barW = 32;
    const gap = 10;
    const chartH = 70;
    const totalW = levels.length * (barW + gap) - gap + 10;

    const bars = levels
      .map((lvl, i) => {
        const count = stats[lvl].count;
        if (count === 0) return '';
        const barH = maxCount > 0 ? Math.max(6, (count / maxCount) * chartH) : 0;
        const x = i * (barW + gap) + 5;
        const y = chartH - barH;
        const fillColor = cfg[lvl] ? cfg[lvl].fill : '#e5e7eb';
        const borderColor = cfg[lvl] ? cfg[lvl].border : '#9ca3af';
        const textColor = cfg[lvl] ? cfg[lvl].text : '#374151';
        const pct = Math.round((count / total) * 100);
        return `
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${fillColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="${x + barW / 2}" y="${chartH + 14}" font-size="9" fill="${textColor}" text-anchor="middle" font-weight="900" font-family="sans-serif">${lvl}</text>
          <text x="${x + barW / 2}" y="${y - 4}" font-size="9" fill="#d1d5db" text-anchor="middle" font-weight="bold" font-family="sans-serif">${count}</text>
          <text x="${x + barW / 2}" y="${y - 14}" font-size="8" fill="#6b7280" text-anchor="middle" font-family="sans-serif">${pct}%</text>`;
      })
      .join('');

    return `
      <div>
        <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Schüsse je Intensität</p>
        <svg viewBox="0 0 ${totalW} ${chartH + 25}" class="w-full max-h-32">${bars}</svg>
      </div>`;
  }

  _intensityScatterChart(stats, levels, cfg) {
    const maxDist = Math.max(...levels.map((lvl) => stats[lvl].avgDist), 1);
    const rows = this._intensityBarRows(
      stats,
      levels,
      'avgDist',
      maxDist * 1.1 || 1,
      (v) => `${v.toFixed(1)}`,
      cfg
    );
    const h = levels.length * 36 + 20;
    return `
      <div>
        <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Streuung vom Zentrum je Intensität</p>
        <p class="text-[9px] text-zinc-500 mb-2">Ø Abstand vom Zentrum – kleiner ist genauer</p>
        <svg viewBox="0 0 280 ${h}" class="w-full">
          <line x1="36" y1="14" x2="206" y2="14" stroke="#27272a" stroke-width="0.5" />
          ${rows}
        </svg>
      </div>`;
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
        <div class="rounded-xl p-3 border-2" style="${bestCfg ? `background-color:${bestCfg.bg};border-color:${bestCfg.border};color:${bestCfg.text}` : 'background:#1f2937;border-color:#374151;color:#9ca3af'}">
          <p class="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Beste Intensität</p>
          <p class="text-xl font-black">${best || '–'}</p>
          <p class="text-xs font-bold mt-0.5">${best ? stats[best].hitRate.toFixed(0) + '% Treffer' : '–'}</p>
        </div>
        <div class="rounded-xl p-3 border-2" style="${worstCfg ? `background-color:${worstCfg.bg};border-color:${worstCfg.border};color:${worstCfg.text}` : 'background:#1f2937;border-color:#374151;color:#9ca3af'}">
          <p class="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Schlechteste Intensität</p>
          <p class="text-xl font-black">${worst || '–'}</p>
          <p class="text-xs font-bold mt-0.5">${worst ? stats[worst].hitRate.toFixed(0) + '% Treffer' : '–'}</p>
        </div>
        ${
          breakpointLvl
            ? `
        <div class="col-span-2 rounded-xl p-3 border-2" style="background-color:#fef3c7;border-color:#d97706;color:#92400e">
          <p class="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">⚠ Belastungsgrenze erkannt</p>
          <p class="text-sm font-black">Ab ${breakpointLvl} bricht die Trefferquote unter 70%</p>
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

    const dirs = {
      top: { label: 'Oben', angle: -90 },
      right_top: { label: 'Oben-R', angle: -45 },
      right: { label: 'Rechts', angle: 0 },
      right_bottom: { label: 'Unten-R', angle: 45 },
      bottom: { label: 'Unten', angle: 90 },
      left_bottom: { label: 'Unten-L', angle: 135 },
      left: { label: 'Links', angle: 180 },
      left_top: { label: 'Oben-L', angle: -135 },
      center: { label: 'Mitte', angle: 0 },
    };

    const counts = {};
    Object.keys(dirs).forEach((k) => (counts[k] = 0));
    missShots.forEach((s) => {
      const d = s.direction && counts[s.direction] !== undefined ? s.direction : 'center';
      counts[d]++;
    });

    const mainDir = Object.keys(counts)
      .filter((k) => k !== 'center')
      .reduce((a, b) => (counts[a] > counts[b] ? a : b), 'right');

    const maxCount = Math.max(...Object.values(counts), 1);
    const cx = 100,
      cy = 100,
      outerR = 85,
      innerR = 28;

    const dirKeys = [
      'top',
      'right_top',
      'right',
      'right_bottom',
      'bottom',
      'left_bottom',
      'left',
      'left_top',
    ];
    const segments = dirKeys
      .map((key) => {
        if (counts[key] === 0) return '';
        const angle = (dirs[key].angle * Math.PI) / 180;
        const frac = counts[key] / maxCount;
        const barLen = (outerR - innerR - 4) * frac;
        const r1 = innerR + 2;
        const r2 = r1 + barLen;
        const x1 = cx + r1 * Math.cos(angle),
          y1 = cy + r1 * Math.sin(angle);
        const x2 = cx + r2 * Math.cos(angle),
          y2 = cy + r2 * Math.sin(angle);
        const opacity = 0.4 + 0.6 * frac;
        const isMain = key === mainDir;
        const color = isMain ? '#f43f5e' : '#6366f1';
        const sw = isMain ? 5 : 3;
        const lx = cx + (r2 + 10) * Math.cos(angle);
        const ly = cy + (r2 + 10) * Math.sin(angle);
        return `
        <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
          stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}" />
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="7" fill="${color}"
          text-anchor="middle" dominant-baseline="central" font-weight="900" font-family="sans-serif">${counts[key]}</text>`;
      })
      .join('');

    const mainAngle = (dirs[mainDir].angle * Math.PI) / 180;
    const ax1 = cx + (innerR - 2) * Math.cos(mainAngle);
    const ay1 = cy + (innerR - 2) * Math.sin(mainAngle);
    const ax2 = cx + (innerR + 20) * Math.cos(mainAngle);
    const ay2 = cy + (innerR + 20) * Math.sin(mainAngle);

    const svg = `
      <svg viewBox="0 0 200 200" class="w-full max-h-48">
        <!-- Rings for context -->
        <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="#27272a" stroke-width="0.5" stroke-dasharray="4 3" />
        <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#18181b" stroke="#3f3f46" stroke-width="1" />
        <!-- Direction guides -->
        ${dirKeys
          .map((k) => {
            const a = (dirs[k].angle * Math.PI) / 180;
            const gx1 = cx + innerR * Math.cos(a),
              gy1 = cy + innerR * Math.sin(a);
            const gx2 = cx + outerR * Math.cos(a),
              gy2 = cy + outerR * Math.sin(a);
            return `<line x1="${gx1.toFixed(1)}" y1="${gy1.toFixed(1)}" x2="${gx2.toFixed(1)}" y2="${gy2.toFixed(1)}" stroke="#27272a" stroke-width="0.5" />`;
          })
          .join('')}
        <!-- Radial bars -->
        ${segments}
        <!-- Main tendency arrow -->
        <line x1="${ax1.toFixed(1)}" y1="${ay1.toFixed(1)}" x2="${ax2.toFixed(1)}" y2="${ay2.toFixed(1)}"
          stroke="#f43f5e" stroke-width="3" stroke-linecap="round" marker-end="url(#arrowRed)" />
        <defs>
          <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#f43f5e" />
          </marker>
        </defs>
        <!-- Center dot -->
        <circle cx="${cx}" cy="${cy}" r="3" fill="#f43f5e" />
        <!-- Center miss count -->
        ${counts.center > 0 ? `<text x="${cx}" y="${cy}" font-size="8" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="900" font-family="sans-serif">${counts.center}</text>` : ''}
      </svg>`;

    const tendLabel = dirs[mainDir]?.label || mainDir;
    const tendPct = Math.round((counts[mainDir] / missShots.length) * 100);
    container.innerHTML = `
      ${svg}
      <div class="mt-2 flex items-center justify-between px-1">
        <p class="text-xs text-zinc-500">Haupttendenz: <span class="text-rose-400 font-black">${tendLabel}</span></p>
        <p class="text-xs text-zinc-500">${counts[mainDir]} von ${missShots.length} Fehlern (${tendPct}%)</p>
      </div>`;
  }

  renderTimeGapAnalysis(shots, seriesList) {
    const container = document.getElementById('time-gap-container');
    if (!container) return;

    let allShots = [];
    const sorted = [...(seriesList || [])]
      .filter((s) => s.shots && s.shots.length > 0)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    sorted.forEach((series, si) => {
      series.shots.forEach((shot, idx) => {
        allShots.push({ hit: shot.hit, seriesIdx: si, shotIdx: idx });
      });
    });

    if (allShots.length === 0 && shots && shots.length > 0) {
      allShots = shots.map((s, i) => ({ hit: s.hit, seriesIdx: 0, shotIdx: i }));
    }

    if (allShots.length === 0) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Schussdaten vorhanden</div>';
      return;
    }

    const W = 300,
      H = 80,
      pad = { l: 10, r: 10, t: 16, b: 20 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const n = allShots.length;
    const xStep = n > 1 ? chartW / (n - 1) : chartW;
    const yHit = pad.t + 4;
    const yMiss = pad.t + chartH - 4;
    const yMid = pad.t + chartH / 2;

    let separators = '';
    let prevSeries = -1;
    allShots.forEach((sh, i) => {
      if (sh.seriesIdx !== prevSeries && i > 0) {
        const x = pad.l + i * xStep;
        separators += `<line x1="${x.toFixed(1)}" y1="${pad.t}" x2="${x.toFixed(1)}" y2="${H - pad.b}" stroke="#3f3f46" stroke-width="0.8" stroke-dasharray="3 2" />`;
      }
      prevSeries = sh.seriesIdx;
    });

    const dots = allShots
      .map((sh, i) => {
        const x = (pad.l + i * xStep).toFixed(1);
        const y = sh.hit ? yHit : yMiss;
        const fill = sh.hit ? '#39FF14' : '#ef4444';
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="${fill}" stroke="#18181b" stroke-width="1" />`;
      })
      .join('');

    let movingLine = '';
    if (allShots.length >= 3) {
      const linePoints = allShots.map((_, i) => {
        const window = allShots.slice(Math.max(0, i - 3), i + 4);
        const rate = window.filter((s) => s.hit).length / window.length;
        const x = pad.l + i * xStep;
        const y = yMiss + (yHit - yMiss) * rate;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      movingLine = `<polyline points="${linePoints.join(' ')}" fill="none" stroke="#007AFF" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />`;
    }

    const hitCount = allShots.filter((s) => s.hit).length;
    const missCount = allShots.length - hitCount;

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="w-full">
        <!-- Midline -->
        <line x1="${pad.l}" y1="${yMid}" x2="${W - pad.r}" y2="${yMid}" stroke="#27272a" stroke-width="0.5" />
        <!-- Labels -->
        <text x="${pad.l}" y="${yHit - 6}" font-size="7" fill="#39FF14" font-family="sans-serif" font-weight="900">TREFFER</text>
        <text x="${pad.l}" y="${H - pad.b + 13}" font-size="7" fill="#ef4444" font-family="sans-serif" font-weight="900">FEHLER</text>
        <!-- Series separators -->
        ${separators}
        <!-- Moving avg -->
        ${movingLine}
        <!-- Dots -->
        ${dots}
      </svg>
      <div class="flex justify-between px-1 mt-1">
        <p class="text-[10px] text-zinc-500">Schuss 1 → ${allShots.length}</p>
        <div class="flex gap-3">
          <span class="text-[10px] text-neon-green font-black">${hitCount} ✓</span>
          <span class="text-[10px] text-rose-400 font-black">${missCount} ✗</span>
        </div>
      </div>`;
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
      { label: '< 3s', min: 0, max: 3 },
      { label: '3–5s', min: 3, max: 5 },
      { label: '5–8s', min: 5, max: 8 },
      { label: '> 8s', min: 8, max: Infinity },
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
      arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
    const avgHit = avg(hitTimes);
    const avgMiss = avg(missTimes);

    const W = 280,
      pH = 90,
      pad = 30;
    const barW = 40,
      gap = 18;
    const totalW = zones.length * (barW + gap) + pad;
    const maxBar = Math.max(...zones.map((_, i) => zoneHits[i] + zoneMisses[i]), 1);

    const bars = zones
      .map((z, i) => {
        const total = zoneHits[i] + zoneMisses[i];
        if (total === 0) return '';
        const x = pad + i * (barW + gap);
        const hitH = (zoneHits[i] / maxBar) * (pH - 20);
        const missH = (zoneMisses[i] / maxBar) * (pH - 20);
        const hitY = pH - hitH - missH;
        const hitRate = Math.round((zoneHits[i] / total) * 100);
        return `
        <rect x="${x}" y="${hitY.toFixed(1)}" width="${barW}" height="${hitH.toFixed(1)}" rx="3" fill="#39FF14" opacity="0.8" />
        <rect x="${x}" y="${(hitY + hitH).toFixed(1)}" width="${barW}" height="${missH.toFixed(1)}" rx="3" fill="#ef4444" opacity="0.7" />
        <text x="${x + barW / 2}" y="${pH + 12}" font-size="8" fill="#9ca3af" text-anchor="middle" font-family="sans-serif" font-weight="900">${z.label}</text>
        <text x="${x + barW / 2}" y="${(hitY - 4).toFixed(1)}" font-size="7" fill="#d1d5db" text-anchor="middle" font-family="sans-serif">${hitRate}%</text>`;
      })
      .join('');

    container.innerHTML = `
      <!-- Avg hit vs miss summary cards -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-neon-green/10 border border-neon-green/20 rounded-xl p-3 text-center">
          <p class="text-[9px] font-black text-neon-green uppercase tracking-widest">Ø Zeit Treffer</p>
          <p class="text-xl font-black text-neon-green">${avgHit !== null ? avgHit + 's' : '–'}</p>
        </div>
        <div class="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
          <p class="text-[9px] font-black text-rose-400 uppercase tracking-widest">Ø Zeit Fehler</p>
          <p class="text-xl font-black text-rose-400">${avgMiss !== null ? avgMiss + 's' : '–'}</p>
        </div>
      </div>
      <!-- Zone breakdown -->
      <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Trefferquote nach Schusszeit</p>
      <svg viewBox="0 0 ${totalW} ${pH + 20}" class="w-full max-h-32">
        ${bars}
        <!-- Legend -->
        <rect x="${pad}" y="2" width="8" height="6" rx="1" fill="#39FF14" />
        <text x="${pad + 10}" y="8" font-size="7" fill="#39FF14" font-family="sans-serif">Treffer</text>
        <rect x="${pad + 50}" y="2" width="8" height="6" rx="1" fill="#ef4444" />
        <text x="${pad + 62}" y="8" font-size="7" fill="#ef4444" font-family="sans-serif">Fehler</text>
      </svg>`;
  }

  renderLoadAccuracy(shots) {
    const container = document.getElementById('load-accuracy-container');
    if (!container) return;

    const levels =
      typeof INTENSITY_LEVELS !== 'undefined'
        ? INTENSITY_LEVELS
        : ['Ruhe', 'I1', 'I2', 'I3', 'I4', 'I5'];
    const cfg =
      typeof INTENSITY_CONFIG !== 'undefined'
        ? INTENSITY_CONFIG
        : {
            Ruhe: { fill: '#e5e7eb', border: '#9ca3af', text: '#374151' },
            I1: { fill: '#d1d5db', border: '#6b7280', text: '#374151' },
            I2: { fill: '#93c5fd', border: '#3b82f6', text: '#1e40af' },
            I3: { fill: '#86efac', border: '#16a34a', text: '#166534' },
            I4: { fill: '#fcd34d', border: '#d97706', text: '#92400e' },
            I5: { fill: '#fca5a5', border: '#dc2626', text: '#991b1b' },
          };

    const groups = {};
    levels.forEach((lvl) => (groups[lvl] = { hits: 0, misses: 0 }));
    (shots || []).forEach((s) => {
      const lvl = s.intensity && levels.includes(s.intensity) ? s.intensity : 'Ruhe';
      if (s.hit) groups[lvl].hits++;
      else groups[lvl].misses++;
    });

    const activeLevels = levels.filter((lvl) => groups[lvl].hits + groups[lvl].misses > 0);
    const hasIntensity = activeLevels.some((lvl) => lvl !== 'Ruhe');

    if (!hasIntensity || activeLevels.length === 0) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Intensitätsdaten vorhanden</div>';
      return;
    }

    const labelW = 36,
      maxBarW = 160;
    const maxTotal = Math.max(
      ...activeLevels.map((lvl) => groups[lvl].hits + groups[lvl].misses),
      1
    );

    const rows = activeLevels
      .map((lvl, i) => {
        const { hits, misses } = groups[lvl];
        const total = hits + misses;
        if (total === 0) return '';
        const hitFrac = hits / total;
        const missFrac = misses / total;
        const totalW_bar = Math.max(8, (total / maxTotal) * maxBarW);
        const hitW = totalW_bar * hitFrac;
        const missW = totalW_bar * missFrac;
        const y = i * 34 + 4;
        const fcfg = cfg[lvl] || {};
        const textColor = fcfg.text || '#9ca3af';
        return `
        <text x="34" y="${y + 14}" font-size="11" fill="${textColor}" text-anchor="end"
          font-weight="900" font-family="sans-serif">${lvl}</text>
        <rect x="${labelW}" y="${y}" width="${maxBarW}" height="24" rx="4" fill="#27272a" />
        <rect x="${labelW}" y="${y}" width="${hitW.toFixed(1)}" height="24" rx="4" fill="#39FF14" opacity="0.8" />
        <rect x="${(labelW + hitW).toFixed(1)}" y="${y}" width="${missW.toFixed(1)}" height="24" rx="4"
          fill="#ef4444" opacity="0.7" />
        <text x="${labelW + maxBarW + 8}" y="${y + 11}" font-size="10" fill="#d1d5db"
          font-weight="900" font-family="sans-serif">${hits}/${total}</text>
        <text x="${labelW + maxBarW + 8}" y="${y + 22}" font-size="8" fill="#6b7280"
          font-family="sans-serif">${Math.round(hitFrac * 100)}%</text>`;
      })
      .join('');

    const h = activeLevels.length * 34 + 20;
    container.innerHTML = `
      <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Treffer (grün) vs. Fehler (rot) je Intensität</p>
      <svg viewBox="0 0 260 ${h}" class="w-full">
        <rect x="${labelW + maxBarW / 2 - 40}" y="2" width="8" height="6" rx="1" fill="#39FF14" />
        <text x="${labelW + maxBarW / 2 - 30}" y="8" font-size="7" fill="#39FF14" font-family="sans-serif">Treffer</text>
        <rect x="${labelW + maxBarW / 2 + 10}" y="2" width="8" height="6" rx="1" fill="#ef4444" />
        <text x="${labelW + maxBarW / 2 + 20}" y="8" font-size="7" fill="#ef4444" font-family="sans-serif">Fehler</text>
        ${rows}
      </svg>`;
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

    const seriesData = [];
    (seriesList || [])
      .filter((s) => s.splits && s.shots && s.shots.length > 1)
      .forEach((series) => {
        const intervals = [];
        let prevSec = null;
        for (let i = 0; i < series.shots.length; i++) {
          const sec = parseSplit(series.splits[i]);
          if (sec === null) {
            prevSec = null;
            continue;
          }

if (i === 0) {
            prevSec = sec;
            continue;
          }

if (prevSec !== null) intervals.push(sec - prevSec);
          prevSec = sec;
        }

if (intervals.length === 0) return;
        const anyMiss = series.shots.some((s) => !s.hit);
        seriesData.push({ intervals, anyMiss });
      });

    if (seriesData.length === 0) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Split-Daten für Rhythmus-Analyse vorhanden</div>';
      return;
    }

    const W = 300,
      H = 120,
      padL = 28,
      padR = 10,
      padT = 10,
      padB = 24;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const allIntervals = seriesData.flatMap((sd) => sd.intervals).filter((v) => v > 0 && v < 60);
    const maxVal = Math.max(...allIntervals, 1) * 1.1;
    const avgVal = allIntervals.reduce((a, b) => a + b, 0) / allIntervals.length;

    const numPoints = Math.max(...seriesData.map((sd) => sd.intervals.length));
    const xStep = chartW / Math.max(numPoints - 1, 1);

    const lines = seriesData
      .map((sd) => {
        const color = sd.anyMiss ? '#ef4444' : '#39FF14';
        const opacity = sd.anyMiss ? '0.8' : '0.5';
        const pts = sd.intervals.map((v, i) => {
          const x = padL + i * xStep;
          const y = padT + (1 - Math.min(v, maxVal) / maxVal) * chartH;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        });
        return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${sd.anyMiss ? 2 : 1.5}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />`;
      })
      .join('');

    const avgY = padT + (1 - Math.min(avgVal, maxVal) / maxVal) * chartH;
    const avgLine = `<line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${W - padR}" y2="${avgY.toFixed(1)}"
      stroke="white" stroke-width="1" stroke-dasharray="4 3" opacity="0.3" />
    <text x="${padL - 2}" y="${avgY.toFixed(1)}" font-size="7" fill="white" opacity="0.4"
      text-anchor="end" dominant-baseline="central" font-family="sans-serif">Ø</text>`;

    const xLabels = Array.from(
      { length: numPoints },
      (_, i) =>
        `<text x="${(padL + i * xStep).toFixed(1)}" y="${H - padB + 12}" font-size="7" fill="#6b7280"
        text-anchor="middle" font-family="sans-serif" font-weight="900">${i + 1}→${i + 2}</text>`
    ).join('');

    const yLabel = `<text x="${padL - 4}" y="${padT}" font-size="7" fill="#6b7280"
      text-anchor="end" font-family="sans-serif">${maxVal.toFixed(0)}s</text>
    <text x="${padL - 4}" y="${padT + chartH}" font-size="7" fill="#6b7280"
      text-anchor="end" font-family="sans-serif">0s</text>`;

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="w-full max-h-36">
        <!-- Grid -->
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#27272a" stroke-width="0.5" />
        <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#27272a" stroke-width="0.5" />
        ${yLabel}
        ${avgLine}
        ${lines}
        ${xLabels}
      </svg>
      <div class="flex gap-4 mt-2 px-1">
        <div class="flex items-center gap-1.5">
          <div class="w-6 h-1 rounded bg-rose-500"></div>
          <span class="text-[10px] text-zinc-500">Serie mit Fehler</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-6 h-1 rounded bg-neon-green opacity-50"></div>
          <span class="text-[10px] text-zinc-500">Saubere Serie</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-4 h-px bg-white opacity-30" style="border-top: 1px dashed white"></div>
          <span class="text-[10px] text-zinc-500">Ø ${avgVal.toFixed(1)}s</span>
        </div>
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

    const offX = (meanX - 100).toFixed(1);
    const offY = (meanY - 100).toFixed(1);
    const offXLabel =
      offX > 0 ? `${offX}px rechts` : offX < 0 ? `${Math.abs(offX)}px links` : 'zentriert';
    const offYLabel =
      offY > 0 ? `${offY}px unten` : offY < 0 ? `${Math.abs(offY)}px oben` : 'zentriert';

    const circles = shots
      .map((sh) => {
        const fill = sh.hit ? 'rgba(57,255,20,0.5)' : 'rgba(239,68,68,0.5)';
        const stroke = sh.hit ? '#39FF14' : '#ef4444';
        return `<circle cx="${(sh.x || 100).toFixed(1)}" cy="${(sh.y || 100).toFixed(1)}" r="4" fill="${fill}" stroke="${stroke}" stroke-width="0.8" />`;
      })
      .join('');

    const ellipse =
      stdDev > 0
        ? `<circle cx="${meanX.toFixed(1)}" cy="${meanY.toFixed(1)}" r="${stdDev.toFixed(1)}"
           fill="rgba(0,122,255,0.08)" stroke="#007AFF" stroke-width="1" stroke-dasharray="4 3" />`
        : '';

    const ch = 10;
    const crosshair = `
      <line x1="${(meanX - ch).toFixed(1)}" y1="${meanY.toFixed(1)}" x2="${(meanX + ch).toFixed(1)}" y2="${meanY.toFixed(1)}"
        stroke="#007AFF" stroke-width="2" />
      <line x1="${meanX.toFixed(1)}" y1="${(meanY - ch).toFixed(1)}" x2="${meanX.toFixed(1)}" y2="${(meanY + ch).toFixed(1)}"
        stroke="#007AFF" stroke-width="2" />
      <circle cx="${meanX.toFixed(1)}" cy="${meanY.toFixed(1)}" r="3" fill="#007AFF" />`;

    container.innerHTML = this._meanShotTargetSvg(circles, ellipse, crosshair);

    const info = document.createElement('div');
    info.className = 'mt-2 space-y-1 px-1';
    info.innerHTML = `
      <div class="flex justify-between">
        <span class="text-[10px] text-zinc-500">Ø Position</span>
        <span class="text-[10px] font-black text-primary">${offXLabel} · ${offYLabel}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-[10px] text-zinc-500">Ø Streuung (σ)</span>
        <span class="text-[10px] font-black text-primary">${stdDev.toFixed(1)} px</span>
      </div>
      <div class="flex gap-3 mt-1">
        <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-primary/20 border border-primary border-dashed"></div><span class="text-[9px] text-zinc-500">Konfidenz-Kreis (1σ)</span></div>
        <div class="flex items-center gap-1"><div class="w-3 h-[2px] bg-primary"></div><span class="text-[9px] text-zinc-500">Ø Schuss</span></div>
      </div>`;
    container.appendChild(info);
  }

  _meanShotTargetSvg(shotCircles, ellipse, overlay) {
    return `
      <svg viewBox="0 0 200 200" class="w-full h-full rounded-full bg-white shadow-inner overflow-hidden flex-shrink-0">
        <style>
          .rn-w { font-family: sans-serif; font-weight: bold; font-size: 4px; fill: white; text-anchor: middle; dominant-baseline: central; }
          .rn-b { font-family: sans-serif; font-weight: bold; font-size: 4px; fill: #000; text-anchor: middle; dominant-baseline: central; }
        </style>
        <rect x="0" y="0" width="200" height="200" fill="white" />
        <circle cx="100" cy="100" r="100" fill="white" stroke="#000" stroke-width="0.5" />
        <circle cx="100" cy="100" r="90"  fill="white" stroke="#000" stroke-width="0.5" />
        <circle cx="100" cy="100" r="80"  fill="white" stroke="#000" stroke-width="0.5" />
        <circle cx="100" cy="100" r="70"  fill="#000"  stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="60"  fill="#000"  stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="50"  fill="#000"  stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="40"  fill="#000"  stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="30"  fill="#000"  stroke="white" stroke-width="2.5" />
        <circle cx="100" cy="100" r="20"  fill="#000"  stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="10"  fill="#000"  stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="2"   fill="white" stroke="none" />
        ${ellipse}
        ${shotCircles}
        ${overlay}
      </svg>`;
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
