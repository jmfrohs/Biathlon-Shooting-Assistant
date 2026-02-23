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
    this.currentShots = [];
    this.currentSeriesList = [];
    this.init();
  }

  init() {
    this.loadAthletes();
    this.loadSessions();
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

  loadAthletes() {
    try {
      const athletesData = localStorage.getItem('b_athletes');
      if (athletesData) {
        const parsed = JSON.parse(athletesData);
        if (Array.isArray(parsed)) {
          if (typeof parsed[0] === 'string') {
            this.athletes = parsed
              .filter((name) => name && name.trim())
              .map((name, idx) => ({
                id: idx + 1,
                name: name.trim(),
                sessions: 0,
              }));
          } else {
            this.athletes = parsed;
          }
        }
      }
    } catch (e) {}

    if (this.athletes.length === 0) {
      this.athletes = [];
    }
  }

  loadSessions() {
    try {
      this.sessions = JSON.parse(localStorage.getItem('sessions')) || [];
    } catch (e) {
      this.sessions = [];
    }
  }

  updateAthleteSessionCounts() {
    if (!this.athletes.length || !this.sessions.length) return;

    // Calculate counts from sessions
    const counts = {};
    this.sessions.forEach((session) => {
      // 1. From session.athletes array
      if (session.athletes && Array.isArray(session.athletes)) {
        session.athletes.forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }

      // 2. Fallback: Check series for athlete IDs not in the athletes array
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

    // Update athlete objects
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

    // Global stats: all shots from all athletes
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
      // Group by Date
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

    // Aggregated stats for current filtered sessions
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

    // Icon mapping
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
        <div class="flex justify-between items-end">
          <h2 class="text-sm font-bold text-light-blue-info uppercase tracking-widest">${t('series')}</h2>
          <span class="text-[10px] text-light-blue-info/50 font-bold">${sessionSeries.length} ${t('series')}</span>
        </div>
      </div>
      <div id="analytics-series-list" class="space-y-3 pb-20"></div>
    `;

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
    this.updateAnalysis(allShots, totalSeries, []); // passing empty series list for general overview
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
    if (this.title) this.title.textContent = athlete.name;
    if (this.backBtn) this.backBtn.classList.remove('hidden');
    this.renderSeriesList();
  }

  renderSeriesList() {
    if (!this.currentAthlete) return;
    let athleteSeries = [];
    this.sessions.forEach((session) => {
      if (session.series) {
        session.series.forEach((s) => {
          if (s.athleteId === this.currentAthlete.id) {
            athleteSeries.push({
              ...s,
              sessionDate: session.date,
              sessionLocation: session.location,
              sessionId: session.id,
              sessionType: session.type,
            });
          }
        });
      }
    });
    const totalSeriesCount = athleteSeries.length;
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
                <div class="flex justify-between items-end">
                    <h2 class="text-sm font-bold text-light-blue-info uppercase tracking-widest">${t('history')}</h2>
                    <span class="text-[10px] text-light-blue-info/50 font-bold">${athleteSeries.length} / ${totalSeriesCount} ${t('series')}</span>
                </div>
                ${this.renderSeriesFilters(athleteSeries, totalSeriesCount)}
            </div>
            <div id="analytics-series-list" class="space-y-3 pb-20"></div>
        `;
    this.attachSeriesFilterListeners();
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
  }

  renderTrendChart(series, isLarge = false) {
    if (!series || series.length === 0) {
      return `<div class="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">${t('no_trend_data') || 'Keine Daten für Trend'}</div>`;
    }

    // Group by day
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
