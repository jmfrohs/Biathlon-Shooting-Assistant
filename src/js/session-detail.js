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
 * Session Detail view logic
 */

let currentFilter = 'all';
let currentSession = null;
let sessionAthletes = [];
let allAthletes = []; // Cached for selection modal

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = parseInt(urlParams.get('id'));

  if (!sessionId) {
    window.location.href = 'index.html';
    return;
  }

  loadSessionDetail(sessionId);
  setupSettingsLogic(sessionId);
  setupTargetPreviewLogic();
});

function loadSessionDetail(sessionId) {
  let sessions = [];
  try {
    sessions = JSON.parse(localStorage.getItem('sessions')) || [];
  } catch (e) {
    console.error('Error parsing sessions:', e);
    sessions = [];
  }

  currentSession = sessions.find((s) => s.id === sessionId);

  if (!currentSession) {
    window.location.href = 'index.html';
    return;
  }

  // Update Header
  const titleEl = document.getElementById('sessionTitle');
  const subtitleEl = document.getElementById('sessionSubtitle');

  if (titleEl) titleEl.textContent = currentSession.name;
  if (subtitleEl) {
    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    const dateStr = new Date(currentSession.date).toLocaleDateString(
      lang === 'de' ? 'de-DE' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
    subtitleEl.textContent = `${dateStr} • ${currentSession.location}`;
  }

  // Load athletes
  try {
    allAthletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
  } catch (e) {
    console.error('Error parsing athletes:', e);
    allAthletes = [];
  }

  syncAthletes();
  setupFilters();
  renderAthletes();
}

function syncAthletes() {
  sessionAthletes = allAthletes.filter((a) => (currentSession.athletes || []).includes(a.id));
}

function setupFilters() {
  const filterContainer = document.getElementById('filterButtons');
  if (!filterContainer) return;

  const groups = new Set();
  sessionAthletes.forEach((a) => {
    if (a.ageGroup) groups.add(a.ageGroup);
  });
  const sortedGroups = Array.from(groups).sort();

  let html = `
        <button class="filter-btn px-6 py-2.5 bg-primary text-off-white text-sm font-bold rounded-full whitespace-nowrap active:opacity-80 transition-all" 
                data-filter="all">${t('filter_all')} (${sessionAthletes.length})</button>
    `;

  sortedGroups.forEach((group) => {
    const count = sessionAthletes.filter((a) => a.ageGroup === group).length;
    html += `
            <button class="filter-btn px-6 py-2.5 bg-card-dark text-off-white text-sm font-semibold rounded-full whitespace-nowrap border border-subtle active:bg-off-white/5 transition-all" 
                    data-filter="${group}">${group} (${count})</button>
        `;
  });

  filterContainer.innerHTML = html;

  filterContainer.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.onclick = () => {
      currentFilter = btn.getAttribute('data-filter');
      filterContainer.querySelectorAll('.filter-btn').forEach((b) => {
        b.classList.remove('bg-primary', 'font-bold');
        b.classList.add('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
      });
      btn.classList.remove('bg-card-dark', 'font-semibold', 'border', 'border-subtle');
      btn.classList.add('bg-primary', 'font-bold');
      renderAthletes();
    };
  });
}

function renderAthletes() {
  const list = document.getElementById('athletesList');
  if (!list) return;

  let filtered = sessionAthletes;
  if (currentFilter !== 'all') {
    filtered = sessionAthletes.filter((a) => a.ageGroup === currentFilter);
  }

  if (filtered.length === 0) {
    list.innerHTML = `<p class="text-light-blue-info/50 text-sm italic py-12 text-center">${t('no_athletes_found')}</p>`;
    return;
  }

  // Get all series for this session once
  const sessionSeries = currentSession.series || [];

  // Insert Neutral Option at the top
  const neutralInitials = '??';
  const neutralSeries = sessionSeries.filter((s) => s.athleteId === 0);
  const neutralHtml = `
        <div id="athlete-wrapper-0" class="athlete-card bg-card-dark border border-zinc-500/30 rounded-2xl p-4 transition-all opacity-80">
            <div class="flex items-center justify-between cursor-pointer" onclick="toggleAthleteExpansion(0)">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-zinc-500/10 flex items-center justify-center">
                        <span class="text-zinc-500 font-bold text-sm uppercase">${neutralInitials}</span>
                    </div>
                    <div>
                        <h3 class="font-bold text-zinc-400 text-base italic">${t('no_name_neutral')}</h3>
                        <p class="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">${t('no_assignment')}</p>
                    </div>
                </div>
                <span id="expand-icon-0" class="material-symbols-outlined text-zinc-500/30 transition-transform">expand_more</span>
            </div>
            
            <!-- Quick Actions Row -->
            <div class="grid grid-cols-2 gap-3 mt-4">
                <button onclick="window.location.href='shooting.html?athleteId=0&session=${currentSession.id}&type=zeroing'"
                        class="flex items-center justify-center gap-2 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl active:scale-[0.95] transition-all">
                    <span class="material-symbols-outlined text-[18px] text-yellow-500">add_circle</span>
                    <span class="text-[11px] font-black uppercase tracking-wider text-yellow-500">${t('zeroing')}</span>
                </button>
                <button onclick="window.location.href='shooting.html?athleteId=0&session=${currentSession.id}&type=series'"
                        class="flex items-center justify-center gap-2 py-2.5 bg-zinc-500/10 border border-zinc-500/20 rounded-xl active:scale-[0.95] transition-all">
                    <span class="material-symbols-outlined text-[18px] text-zinc-400">add_circle</span>
                    <span class="text-[11px] font-black uppercase tracking-wider text-zinc-400">${t('new_series')}</span>
                </button>
            </div>

            <!-- Expandable Series Section -->
            <div id="series-section-0" class="hidden mt-4 pt-4 border-t border-subtle/30 overflow-hidden">
                <div class="space-y-2">
                    ${renderSeriesList(neutralSeries, 0)}
                </div>
            </div>
        </div>
    `;

  list.innerHTML =
    neutralHtml +
    filtered
      .map((athlete) => {
        const initials = athlete.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const athleteSeries = sessionSeries.filter((s) => s.athleteId === athlete.id);

        return `
            <div id="athlete-wrapper-${athlete.id}" class="athlete-card bg-card-dark border border-subtle rounded-2xl p-4 transition-all">
                <div class="flex items-center justify-between cursor-pointer" onclick="toggleAthleteExpansion(${athlete.id})">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span class="text-primary font-bold text-sm uppercase">${initials}</span>
                        </div>
                        <div>
                            <h3 class="font-bold text-off-white text-base">${athlete.name}</h3>
                            <p class="text-[11px] font-bold text-light-blue-info uppercase tracking-wider">${athlete.ageGroup || t('no_group')}</p>
                        </div>
                    </div>
                    <span id="expand-icon-${athlete.id}" class="material-symbols-outlined text-light-blue-info/30 transition-transform">expand_more</span>
                </div>
                
                <!-- Quick Actions Row -->
                <div class="grid grid-cols-2 gap-3 mt-4">
                    <button onclick="window.location.href='shooting.html?athleteId=${athlete.id}&session=${currentSession.id}&type=zeroing'"
                            class="flex items-center justify-center gap-2 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl active:scale-[0.95] transition-all">
                        <span class="material-symbols-outlined text-[18px] text-yellow-500">add_circle</span>
                        <span class="text-[11px] font-black uppercase tracking-wider text-yellow-500">${t('zeroing')}</span>
                    </button>
                    <button onclick="window.location.href='shooting.html?athleteId=${athlete.id}&session=${currentSession.id}&type=series'"
                            class="flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/20 rounded-xl active:scale-[0.95] transition-all">
                        <span class="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                        <span class="text-[11px] font-black uppercase tracking-wider text-primary">${t('new_series')}</span>
                    </button>
                </div>

                <!-- Expandable Series Section -->
                <div id="series-section-${athlete.id}" class="hidden mt-4 pt-4 border-t border-subtle/30 overflow-hidden">
                    <div class="space-y-2">
                        ${renderSeriesList(athleteSeries, athlete.id)}
                    </div>
                </div>
            </div>
        `;
      })
      .join('');
}

function renderMiniTarget(shots, size = 64) {
  const shotCircles = (shots || [])
    .map((s, i) => {
      const color = s.hit ? '#32D74B' : '#FF453A';
      const r = 6;
      const sw = 1.5;
      const fontSize = 7;
      return `
            <g>
                <circle cx="${s.x}" cy="${s.y}" r="${r}" fill="${color}" stroke="white" stroke-width="${sw}" />
                <text x="${s.x}" y="${s.y + 0.5}" text-anchor="middle" dominant-baseline="central" fill="white" 
                      style="font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif;">${s.shot || i + 1}</text>
            </g>
        `;
    })
    .join('');

  const dims =
    size === 'full' ? 'width: 100%; height: 100%;' : `width: ${size}px; height: ${size}px;`;

  // Get Target SVG from constants
  const targetConstants = getTargetConstants();
  const baseSvg = targetConstants.svg;

  // Extract inner content to wrap with our specific sizing/classes
  // We remove the opening <svg ...> tag and the closing </svg> tag
  let innerContent = baseSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '');

  return `
        <svg viewBox="0 0 200 200" style="${dims}" class="rounded-full bg-white shadow-inner overflow-hidden flex-shrink-0">
            ${innerContent}
            ${shotCircles}
        </svg>
    `;
}

function renderWindFlag(wind = 0, size = 24) {
  const absVal = Math.min(Math.abs(wind), 10);
  const scaleX = wind < 0 ? -1 : 1;
  const rotate = 90 - absVal * 9;

  return `
        <svg viewBox="0 0 40 40" style="width: ${size}px; height: ${size}px; overflow: visible;" class="flex-shrink-0">
            <rect x="18" y="5" width="2" height="30" fill="#cbd5e1" rx="1" />
            <circle cx="19" cy="5" r="2" fill="#94a3b8" />
            <g style="transform-origin: 19px 14px; transform: scaleX(${scaleX}) rotate(${rotate}deg);">
                <path d="M19 8 L36 14 L19 20 Z" fill="#ef4444" />
                <path d="M19 8 L36 14 L19 11 Z" fill="rgba(0,0,0,0.15)" />
            </g>
        </svg>
    `;
}

function renderSeriesList(series, athleteId) {
  if (series.length === 0) {
    return `<p class="text-[10px] text-light-blue-info/40 text-center italic py-4">${t('no_series_recorded')}</p>`;
  }

  const sortedSeries = [...series].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return sortedSeries
    .map((s) => {
      const stats = s.stats || {
        hitCount: s.shots ? s.shots.filter((sh) => sh.hit).length : 0,
        totalShots: s.shots ? s.shots.length : 0,
        avgRing: 0,
      };
      const label = s.type === 'zeroing' ? t('zeroing') : t('series');

      // ... (Start arrow logic remains)
      // ... (Start arrow logic)
      // Determine Start Direction Arrow & Text
      let startArrow = '';
      let startLabel = '';
      let indicatorsArrowLeft = '';
      let indicatorsArrowRight = '';

      const athlete = sessionAthletes.find((a) => a.id === (s.athleteId || athleteId));
      if (athlete) {
        const isProne = (s.stance || 'Liegend') === 'Liegend';
        // Default to 'Left' if not set (matches new athlete form default)
        const pref = isProne ? athlete.proneStart || 'Left' : athlete.standingStart || 'Left';

        // Default to Right if not set, or handle 'Left'/'Right'
        if (pref === 'Left') {
          // Start Left -> Go Right
          startArrow = `<span class="material-symbols-outlined text-[10px] text-light-blue-info/60 align-middle ml-1" title="Start von Links">arrow_forward</span>`;
          startLabel = t('start_left');
          indicatorsArrowLeft = `<span class="material-symbols-outlined text-xl text-zinc-400">arrow_right_alt</span>`;
        } else if (pref === 'Right') {
          // Start Right -> Go Left
          startArrow = `<span class="material-symbols-outlined text-[10px] text-light-blue-info/60 align-middle ml-1" title="Start von Rechts">arrow_back</span>`;
          startLabel = t('start_right');
          indicatorsArrowRight = `<span class="material-symbols-outlined text-xl text-zinc-400">arrow_left_alt</span>`;
        }
      }

      // Hit indicators row
      const shotIndicators = Array.from({ length: 5 })
        .map((_, i) => {
          const shot = s.shots && s.shots[i];
          const statusColor = shot ? (shot.hit ? 'bg-neon-green' : 'bg-neon-red') : 'bg-zinc-800';
          return `<div class="w-2 h-2 rounded-full ${statusColor} shadow-sm"></div>`;
        })
        .join('');

      return `
            <div id="series-card-${s.id}" class="series-card-container">
                <div onclick="toggleSeriesDetail('${s.id}')"
                     class="group flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-subtle/20 active:scale-[0.99] transition-all cursor-pointer">
                    
                    <!-- Left: Mini Target (Larger) -->
                    <div class="shrink-0">
                        ${renderMiniTarget(s.shots, 64)}
                    </div>

                    <!-- Right: Content -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <p class="text-xs font-black text-off-white tracking-wide uppercase leading-none mb-1">${label}</p>
                                <p class="text-[10px] font-bold text-light-blue-info/60 uppercase tracking-tighter flex items-center gap-1">
                                    ${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${s.stance || 'Liegend'} ${startArrow}
                                </p>
                            </div>
                            <div class="flex items-center gap-3">
                                ${s.wind !== undefined ? renderWindFlag(s.wind, 40) : ''}
                                <div class="text-right flex flex-col items-end">
                                    <div class="flex items-center gap-1">
                                        <span class="text-lg font-black text-off-white leading-none">${stats.hitCount}</span><span class="text-xs text-zinc-500 font-bold">/5</span>
                                    </div>
                                    ${s.rangeTime || s.totalTime ? `<span class="text-xs font-black text-primary/90 font-mono tracking-tighter leading-none mt-0.5">${s.rangeTime || s.totalTime}</span>` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Hit Indicators Row -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 ml-1">
                                ${indicatorsArrowLeft}
                                ${shotIndicators}
                                ${indicatorsArrowRight}
                            </div>
                            <span id="series-expand-icon-${s.id}" class="material-symbols-outlined text-sm text-light-blue-info/30 group-hover:text-light-blue-info/60 transition-all ml-auto">expand_more</span>
                        </div>
                    </div>
                </div>

                <!-- Expanded Content (Hidden by default) -->
                <div id="series-detail-${s.id}" class="hidden mt-2 p-4 bg-white/[0.02] border border-subtle/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div class="flex flex-col sm:flex-row gap-6">
                        <!-- Clickable Larger Target (Now opens Modal) -->
                        <div class="shrink-0 cursor-pointer active:scale-95 transition-transform flex flex-col items-center" 
                             onclick="openTargetPreview('${s.id}', ${athleteId})">
                            ${renderMiniTarget(s.shots, 150)}
                            <p class="text-[9px] text-center text-light-blue-info/40 mt-2 uppercase font-bold text-primary tracking-widest">${t('large_view')}</p>
                        </div>

                        <!-- Stats & Shot List -->
                        <div class="flex-1 min-w-0 space-y-5">
                            ${startLabel ? `<div class="inline-block px-3 py-1.5 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-bold text-light-blue-info uppercase tracking-widest mb-1"><span class="text-primary mr-1">●</span>${startLabel}</div>` : ''}
                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-card-dark p-3 rounded-xl border border-subtle/10 flex flex-col items-center justify-center">
                                    <p class="text-[9px] text-zinc-500 uppercase font-black tracking-wider">${t('avg_ring')}</p>
                                    <p class="text-2xl font-black text-off-white leading-tight mt-1">${stats.avgRing || '0'}</p>
                                </div>
                                <div class="bg-card-dark p-3 rounded-xl border border-subtle/10 flex flex-col items-center justify-center">
                                    <p class="text-[9px] text-zinc-500 uppercase font-black tracking-wider">${t('total_time')}</p>
                                    <p class="text-xl font-black text-primary font-mono leading-tight mt-1">${s.rangeTime || s.totalTime || '--:--.-'}</p>
                                </div>
                            </div>

                            <!-- Detailed Shot List -->
                            <div class="space-y-2">
                                <p class="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-wider px-1">${t('shot_details')}</p>
                                ${s.shots
                                  .map((shot, idx) => {
                                    const split = s.splits
                                      ? s.splits[idx]
                                      : idx === 0
                                        ? t('start')
                                        : '';
                                    return `
                                        <div class="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-xl border border-subtle/10 hover:bg-white/[0.05] transition-colors">
                                            <div class="flex items-center gap-3">
                                                <span class="text-[10px] font-black text-light-blue-info/40 w-5">${idx + 1}</span>
                                                <div class="w-2.5 h-2.5 rounded-full ${shot.hit ? 'bg-neon-green' : 'bg-neon-red'} shadow-sm ring-1 ring-white/10"></div>
                                                <span class="text-sm font-bold text-off-white">Ring ${shot.ring}</span>
                                            </div>
                                            <span class="text-xs font-bold text-off-white/50 font-mono tracking-tight">${split}</span>
                                        </div>
                                    `;
                                  })
                                  .join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');
}

function toggleSeriesDetail(seriesId) {
  const detail = document.getElementById(`series-detail-${seriesId}`);
  const icon = document.getElementById(`series-expand-icon-${seriesId}`);
  const card = document.getElementById(`series-card-${seriesId}`);

  if (detail.classList.contains('hidden')) {
    detail.classList.remove('hidden');
    icon.textContent = 'expand_less';
    icon.classList.replace('text-light-blue-info/20', 'text-primary');
  } else {
    detail.classList.add('hidden');
    icon.textContent = 'expand_more';
    icon.classList.replace('text-primary', 'text-light-blue-info/20');
  }
}

function toggleAthleteExpansion(athleteId) {
  const section = document.getElementById(`series-section-${athleteId}`);
  const icon = document.getElementById(`expand-icon-${athleteId}`);
  const wrapper = document.getElementById(`athlete-wrapper-${athleteId}`);

  if (section.classList.contains('hidden')) {
    section.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
    wrapper.classList.add('border-primary/30', 'bg-white/[0.02]');
  } else {
    section.classList.add('hidden');
    icon.style.transform = 'rotate(0deg)';
    wrapper.classList.remove('border-primary/30', 'bg-white/[0.02]');
  }
}

// Settings Modal Logic
function setupSettingsLogic(sessionId) {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('openSettingsBtn');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const emailCheck = document.getElementById('emailReporting');

  if (openBtn)
    openBtn.onclick = () => {
      const settings = currentSession.settings || { email: false };
      emailCheck.checked = settings.email;
      updateMiniList();
      modal.classList.remove('hidden');
    };

  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

  emailCheck.onchange = (e) => {
    currentSession.settings = { ...currentSession.settings, email: e.target.checked };
    saveSession();
  };

  // Athlete Selection Sub-Modal
  const selModal = document.getElementById('athletesModal');
  document.getElementById('addMoreAthletesBtn').onclick = () => {
    selModal.classList.remove('hidden');
    renderSelectionList();
  };

  document.getElementById('closeSelectionBtn').onclick = () => selModal.classList.add('hidden');
  document.getElementById('confirmSelectionBtn').onclick = () => {
    saveSession();
    syncAthletes();
    setupFilters();
    renderAthletes();
    updateMiniList();
    selModal.classList.add('hidden');
  };

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

function updateMiniList() {
  const mini = document.getElementById('miniAthletesList');
  if (!mini) return;
  mini.innerHTML = sessionAthletes
    .map((a) => {
      const initials = a.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return `<div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">${initials}</div>`;
    })
    .join('');
}

function renderSelectionList() {
  const list = document.getElementById('athletesSelectList');
  const selectedIds = new Set(currentSession.athletes || []);

  list.innerHTML = allAthletes
    .map((a) => {
      const isSelected = selectedIds.has(a.id);
      const initials = a.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return `
            <div onclick="toggleParticipant(${a.id}, this)" class="p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-primary/10 border-primary' : 'bg-white/5 border-subtle'}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">${initials}</div>
                    <span class="font-bold text-sm">${a.name}</span>
                </div>
                <span class="material-symbols-outlined ${isSelected ? 'text-primary' : 'text-transparent'}">check_circle</span>
            </div>
        `;
    })
    .join('');
}

function toggleParticipant(id, el) {
  const selectedIds = new Set(currentSession.athletes || []);
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
    el.className =
      'p-4 rounded-xl border border-subtle bg-white/5 transition-all flex items-center justify-between cursor-pointer';
    el.querySelector('.material-symbols-outlined').className =
      'material-symbols-outlined text-transparent';
  } else {
    selectedIds.add(id);
    el.className =
      'p-4 rounded-xl border border-primary bg-primary/10 transition-all flex items-center justify-between cursor-pointer';
    el.querySelector('.material-symbols-outlined').className =
      'material-symbols-outlined text-primary';
  }
  currentSession.athletes = Array.from(selectedIds);
}

function saveSession() {
  let sessions = JSON.parse(localStorage.getItem('sessions')) || [];
  const idx = sessions.findIndex((s) => s.id === currentSession.id);
  if (idx !== -1) {
    sessions[idx] = currentSession;
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }
}

// Target Preview Modal Logic
function setupTargetPreviewLogic() {
  const modal = document.getElementById('targetPreviewModal');
  const closeBtn = document.getElementById('closeTargetPreviewBtn');

  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

  // Close on click outside
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  };
}

function openTargetPreview(seriesId, athleteId) {
  const modal = document.getElementById('targetPreviewModal');
  const container = document.getElementById('largeTargetContainer');
  const editBtn = document.getElementById('modalEditSeriesBtn');

  // Find the series
  const series = (currentSession.series || []).find((s) => s.id == seriesId);
  if (!series) return;

  // Render large target (responsive 'full')
  container.innerHTML = renderMiniTarget(series.shots, 'full');

  // Setup edit button
  editBtn.onclick = () => {
    window.location.href = `shooting.html?series=${seriesId}&session=${currentSession.id}&athleteId=${athleteId}`;
  };

  modal.classList.remove('hidden');
}
