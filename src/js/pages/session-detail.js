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

let currentSession = null;
let sessionAthletes = [];
let allAthletes = [];
let sessionDetailPoll = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = parseInt(urlParams.get('id'));
  if (!sessionId) {
    window.location.href = 'index.html';
    return;
  }

  await loadSessionDetail(sessionId);
  setupSettingsLogic(sessionId);
  setupTargetPreviewLogic();
  sessionDetailPoll = setInterval(() => loadSessionDetail(sessionId), 10000);
});

async function loadSessionDetail(sessionId) {
  try {
    const [session, athletes] = await Promise.all([
      apiService.getSession(sessionId),
      apiService.getAthletes(),
    ]);
    if (!session) {
      window.location.href = 'index.html';
      return;
    }
    currentSession = session;
    const localSettings = JSON.parse(
      localStorage.getItem('b_session_settings_' + sessionId) || 'null'
    );
    if (localSettings) currentSession.settings = localSettings;
    allAthletes = athletes || [];
  } catch (e) {
    if (!currentSession) {
      window.location.href = 'index.html';
      return;
    }
  }

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

  syncAthletes();
  renderAthletes();
}

function syncAthletes() {
  const ids = currentSession.athletes || [];
  const map = new Map();
  if (currentSession.athleteData) {
    currentSession.athleteData.forEach((a) => map.set(a.id, a));
  }
  allAthletes.forEach((a) => {
    if (ids.includes(a.id)) {
      map.set(a.id, a);
    }
  });

  sessionAthletes = ids
    .map((id) => map.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderAthletes() {
  const list = document.getElementById('athletesList');
  if (!list) return;
  const filtered = sessionAthletes;

  if (filtered.length === 0) {
    list.innerHTML = `<p class="text-light-blue-info/50 text-sm italic py-12 text-center">${t('no_athletes_found')}</p>`;
    return;
  }

  const sessionSeries = currentSession.series || [];
  const neutralInitials = '??';
  const neutralSeries = sessionSeries.filter((s) => s.id !== undefined && s.athleteId === 0);
  const role = localStorage.getItem('b_user_role');
  const isAthlete = role === 'athlete';

  let neutralHtml = '';
  if (!isAthlete) {
    neutralHtml = `
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
  }
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

        if (isAthlete) {
          return `
            <div id="athlete-wrapper-${athlete.id}" class="athlete-card bg-transparent rounded-2xl p-0 transition-all">
                <!-- Quick Actions Row -->
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <button onclick="window.location.href='shooting.html?athleteId=${athlete.id}&session=${currentSession.id}&type=zeroing'"
                            class="flex items-center justify-center gap-2 py-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl active:scale-[0.95] transition-all shadow-lg shadow-yellow-500/5">
                        <span class="material-symbols-outlined text-[22px] text-yellow-500">add_circle</span>
                        <span class="text-sm font-black uppercase tracking-wider text-yellow-500">${t('zeroing')}</span>
                    </button>
                    <button onclick="window.location.href='shooting.html?athleteId=${athlete.id}&session=${currentSession.id}&type=series'"
                            class="flex items-center justify-center gap-2 py-4 bg-primary/10 border border-primary/20 rounded-2xl active:scale-[0.95] transition-all shadow-lg shadow-primary/5">
                        <span class="material-symbols-outlined text-[22px] text-primary">add_circle</span>
                        <span class="text-sm font-black uppercase tracking-wider text-primary">${t('new_series')}</span>
                    </button>
                </div>

                <div id="series-section-${athlete.id}" class="mt-4 space-y-3">
                    ${renderSeriesList(athleteSeries, athlete.id)}
                </div>
            </div>
          `;
        }

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

  setupSwipeListeners();
}

function renderMiniTarget(shots, size = 64) {
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

      return `
            <g>
                <circle cx="${s.x}" cy="${s.y}" r="${r}" fill="${color}" stroke="white" stroke-width="${sw}" />
                <text x="${s.x}" y="${s.y + (shotSize / 6) * 0.5}" text-anchor="middle" dominant-baseline="central" fill="${labelColor}"
                      style="font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif;">${labelText}</text>
            </g>
        `;
    })
    .join('');
  const dims =
    size === 'full' ? 'width: 100%; height: 100%;' : `width: ${size}px; height: ${size}px;`;
  const targetConstants = getTargetConstants();
  const baseSvg = targetConstants.svg;
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

  const sortedSeries = [...series].sort((a, b) => {
    if (a.isPlaceholder && b.isPlaceholder) return 0;
    if (a.isPlaceholder) return 1;
    if (b.isPlaceholder) return -1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return sortedSeries
    .map((s) => {
      const isPlaceholder = s.isPlaceholder || (s.shots && s.shots.length === 0);
      const stats = s.stats || {
        hitCount: s.shots ? s.shots.filter((sh) => sh.hit).length : 0,
        totalShots: s.shots ? s.shots.length : 0,
        avgRing: 0,
      };
      const label = s.type === 'zeroing' ? t('zeroing') : t('series');

      const cardId = `series-card-${s.id}`;
      const deleteAction = `handleSeriesDelete(${s.id})`;

      if (isPlaceholder) {
        return `
            <div class="series-item-wrapper mb-2">
                <div id="${cardId}" class="series-card-swipe-container relative overflow-hidden rounded-2xl group border border-subtle/10">
                    <!-- Delete Action (Behind - Left) -->
                    <div class="absolute inset-[1px] w-24 bg-red-600 flex items-center justify-center cursor-pointer active:brightness-90 transition-all rounded-l-2xl z-0 shadow-inner" 
                         onclick="${deleteAction}">
                        <div class="flex flex-col items-center gap-1 text-white pr-4">
                            <span class="material-symbols-outlined text-2xl">delete</span>
                            <span class="text-[10px] font-bold uppercase tracking-tighter">Löschen</span>
                        </div>
                    </div>

                    <!-- Main Card (Front) -->
                    <div class="series-card-front relative z-10 p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer flex items-center gap-4"
                         style="background-color: var(--color-card);"
                         onclick="window.location.href='shooting.html?series=${s.id}&session=${currentSession.id}&athleteId=${athleteId}&type=${s.type}&stance=${s.stance}'"
                         data-id="${s.id}">
                        
                        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                            <span class="material-symbols-outlined text-primary text-3xl">add</span>
                        </div>

                        <div class="flex-1 min-w-0">
                            <p class="text-[10px] font-black text-primary tracking-widest uppercase leading-none mb-1">${t('next_series')}</p>
                            <h4 class="text-sm font-bold text-off-white">${s.stance || 'Liegend'}</h4>
                            <p class="text-[9px] text-light-blue-info/60 uppercase font-bold tracking-tighter mt-1">${t('ready_for_shots')}</p>
                        </div>

                        <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <span class="material-symbols-outlined text-white">add_circle</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
      }

      let startArrow = '';
      let startLabel = '';
      let indicatorsArrowLeft = '';
      let indicatorsArrowRight = '';
      const athlete = sessionAthletes.find((a) => a.id === (s.athleteId || athleteId));
      if (athlete) {
        const isProne = (s.stance || 'Liegend') === 'Liegend';
        const pref = isProne ? athlete.proneStart || 'Left' : athlete.standingStart || 'Left';
        if (pref === 'Left') {
          startArrow = `<span class="material-symbols-outlined text-[10px] text-light-blue-info/60 align-middle ml-1" title="Start von Links">arrow_forward</span>`;
          startLabel = t('start_left');
          indicatorsArrowLeft = `<span class="material-symbols-outlined text-xl text-zinc-400">arrow_right_alt</span>`;
        } else if (pref === 'Right') {
          startArrow = `<span class="material-symbols-outlined text-[10px] text-light-blue-info/60 align-middle ml-1" title="Start von Rechts">arrow_back</span>`;
          startLabel = t('start_right');
          indicatorsArrowRight = `<span class="material-symbols-outlined text-xl text-zinc-400">arrow_left_alt</span>`;
        }
      }

      const shotIndicators = Array.from({ length: 5 })
        .map((_, i) => {
          const shot = s.shots && s.shots[i];
          const statusColor = shot ? (shot.hit ? 'bg-neon-green' : 'bg-neon-red') : 'bg-zinc-800';
          return `<div class="w-2 h-2 rounded-full ${statusColor} shadow-sm"></div>`;
        })
        .join('');
      const isZeroing = s.type === 'zeroing';
      const bgClass = isZeroing
        ? 'bg-yellow-500/10 border-yellow-500/20'
        : 'bg-white/[0.03] border-subtle/20';

      return `
            <div class="series-item-wrapper mb-2">
                <div id="${cardId}" class="series-card-swipe-container relative overflow-hidden rounded-2xl group border border-subtle/10 bg-transparent">
                    <!-- Delete Action (Behind - Left) -->
                    <!-- Using inset-[1px] to stay inside the container's border -->
                    <div class="absolute inset-[1px] w-24 bg-red-600 flex items-center justify-center cursor-pointer active:brightness-90 transition-all rounded-l-2xl z-0 shadow-inner" 
                         onclick="${deleteAction}">
                        <div class="flex flex-col items-center gap-1 text-white pr-4">
                            <span class="material-symbols-outlined text-2xl">delete</span>
                            <span class="text-[10px] font-bold uppercase tracking-tighter">Löschen</span>
                        </div>
                    </div>

                    <!-- Main Card (Front) - Using var(--color-card) for full opacity in both themes -->
                    <div class="series-card-front relative z-10 p-4 ${bgClass} rounded-[19px] transition-all cursor-pointer flex items-center gap-4"
                         style="background-color: var(--color-card);"
                         onclick="toggleSeriesDetail('${s.id}')"
                         data-id="${s.id}">

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
                </div>

                <!-- Expanded Content (Now OUTSIDE swipe container) -->
                <div id="series-detail-${s.id}" class="hidden mt-2 p-4 bg-white/[0.02] border border-subtle/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 mx-1">
                    <div class="flex flex-col sm:flex-row gap-6">
                        <!-- Clickable Larger Target -->
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

function setupSwipeListeners() {
  const containers = document.querySelectorAll('.series-card-swipe-container');
  containers.forEach((container) => {
    const front = container.querySelector('.series-card-front');
    if (!front) return;

    let startX = 0;
    let currentTranslate = 0;
    let isSwiping = false;
    const deleteBtnWidth = 96;

    front.addEventListener(
      'touchstart',
      (e) => {
        startX = e.touches[0].clientX;
        front.style.transition = 'none';
        isSwiping = true;
      },
      { passive: true }
    );

    front.addEventListener(
      'touchmove',
      (e) => {
        if (!isSwiping) return;
        const x = e.touches[0].clientX;
        const diff = x - startX;

        if (diff > 0) {
          currentTranslate = Math.min(diff, deleteBtnWidth + 20);
          front.style.transform = `translateX(${currentTranslate}px)`;
        }
      },
      { passive: true }
    );

    front.addEventListener('touchend', () => {
      isSwiping = false;
      front.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

      if (currentTranslate > deleteBtnWidth / 2) {
        currentTranslate = deleteBtnWidth;
      } else {
        currentTranslate = 0;
      }
      front.style.transform = `translateX(${currentTranslate}px)`;
    });
  });
}

function handleSeriesDelete(seriesId) {
  if (!confirm(t('confirm_delete_series') || 'Deseja realmente excluir esta série?')) return;

  if (currentSession && currentSession.series) {
    currentSession.series = currentSession.series.filter((s) => s.id != seriesId);
    saveSession();
    renderAthletes();
  }
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

function setupSettingsLogic(sessionId) {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('openSettingsBtn');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const autoSaveSegment = document.getElementById('autoSaveSegment');

  const AUTO_SAVE_STYLES = {
    'false': ['bg-rose-500/20', 'text-rose-400', 'shadow-sm'],
    'null':  ['bg-white/10',    'text-zinc-300', 'shadow-sm'],
    'true':  ['bg-neon-green/20', 'text-neon-green', 'shadow-sm'],
  };

  function setAutoSaveSegment(value) {
    if (!autoSaveSegment) return;
    const strVal = value === true ? 'true' : value === false ? 'false' : 'null';
    autoSaveSegment.querySelectorAll('.auto-save-seg-btn').forEach((btn) => {
      const active = btn.dataset.value === strVal;
      const activeClasses = AUTO_SAVE_STYLES[btn.dataset.value] || [];
      if (active) {
        btn.classList.remove('text-zinc-500');
        activeClasses.forEach((c) => btn.classList.add(c));
      } else {
        activeClasses.forEach((c) => btn.classList.remove(c));
        btn.classList.add('text-zinc-500');
      }
    });
  }

  if (autoSaveSegment) {
    autoSaveSegment.querySelectorAll('.auto-save-seg-btn').forEach((btn) => {
      btn.onclick = () => {
        const rawVal = btn.dataset.value;
        const val = rawVal === 'true' ? true : rawVal === 'false' ? false : null;
        if (!currentSession.settings) currentSession.settings = {};
        currentSession.settings.autoSave = val;
        setAutoSaveSegment(val);
        saveSession();
      };
    });
  }

  if (openBtn)
    openBtn.onclick = () => {
      const settings = currentSession.settings || {};
      const autoSaveVal =
        settings.autoSave === true ? true : settings.autoSave === false ? false : null;
      setAutoSaveSegment(autoSaveVal);
      renderSharingState();
      sdInitEmailReporting();
      modal.classList.remove('hidden');
    };
  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

  const emailToggle = document.getElementById('sd-emailReporting');
  if (emailToggle) {
    emailToggle.onchange = () => {
      if (!currentSession.settings) currentSession.settings = {};
      currentSession.settings.email = emailToggle.checked;
      saveSession();
      sdRenderRecipients(emailToggle.checked);
    };
  }

  const sdNewRecipientInput = document.getElementById('sd-new-recipient');
  if (sdNewRecipientInput) {
    sdNewRecipientInput.onkeydown = (e) => { if (e.key === 'Enter') sdAddRecipient(); };
  }

  const pdfBtn = document.getElementById('exportPdfBtn');
  const excelBtn = document.getElementById('exportExcelBtn');

  if (pdfBtn) pdfBtn.onclick = () => exportSessionToPDF();
  if (excelBtn) excelBtn.onclick = () => exportSessionToExcel();

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
  document.getElementById('deleteSessionBtn').onclick = async () => {
    if (confirm(t('delete_session_confirm'))) {
      try {
        await apiService.deleteSession(sessionId);
      } catch (e) {
        alert('Fehler beim Löschen.');
        return;
      }
      window.location.href = 'index.html';
    }
  };
  setupSharingControls(sessionId);
}

let sharingTimer = null;

function sdInitEmailReporting() {
  const toggle = document.getElementById('sd-emailReporting');
  if (!toggle) return;
  const enabled = !!(currentSession?.settings?.email);
  toggle.checked = enabled;
  sdRenderRecipients(enabled);
}

function sdRenderRecipients(enabled) {
  const wrap = document.getElementById('sd-email-recipients-wrap');
  if (!wrap) return;
  if (!enabled) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  const list = document.getElementById('sd-recipient-list');
  const fallback = document.getElementById('sd-recipient-fallback');
  const perSession = currentSession?.settings?.selectedRecipients || [];

  if (perSession.length > 0) {
    if (fallback) fallback.classList.add('hidden');
    list.innerHTML = perSession.map((e, i) => `
      <div class="bg-card-dark border border-subtle rounded-2xl p-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary text-base">mail</span>
          <span class="text-xs text-off-white">${e}</span>
        </div>
        <button onclick="sdRemoveRecipient(${i})" class="p-1 text-red-500/50 hover:text-red-500">
          <span class="material-symbols-outlined text-base">remove_circle</span>
        </button>
      </div>`).join('');
  } else {
    let globals = [];
    try { globals = JSON.parse(localStorage.getItem('trainerEmails') || '[]'); } catch { globals = []; }
    if (globals.length === 0) {
      list.innerHTML = '';
      if (fallback) fallback.classList.remove('hidden');
    } else {
      if (fallback) fallback.classList.add('hidden');
      list.innerHTML = globals.map((e) => `
        <div class="bg-card-dark border border-subtle rounded-2xl p-3 flex items-center justify-between opacity-60">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-light-blue-info/50 text-base">mail</span>
            <span class="text-xs text-off-white/70">${e}</span>
          </div>
          <span class="text-[9px] uppercase tracking-widest text-light-blue-info/40 font-bold">Global</span>
        </div>`).join('');
    }
  }
}

function sdAddRecipient() {
  const input = document.getElementById('sd-new-recipient');
  const email = (input?.value || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return;
  if (!currentSession.settings) currentSession.settings = {};
  if (!Array.isArray(currentSession.settings.selectedRecipients)) currentSession.settings.selectedRecipients = [];
  if (!currentSession.settings.selectedRecipients.includes(email)) {
    currentSession.settings.selectedRecipients.push(email);
    saveSession();
  }
  if (input) input.value = '';
  sdRenderRecipients(true);
}

function sdRemoveRecipient(index) {
  if (!currentSession?.settings?.selectedRecipients) return;
  currentSession.settings.selectedRecipients.splice(index, 1);
  saveSession();
  sdRenderRecipients(true);
}

function renderSharingState() {
  const badge = document.getElementById('shareCodeBadge');
  const label = document.getElementById('shareStatusLabel');
  const expiryLabel = document.getElementById('shareExpiryLabel');
  const expiryTime = document.getElementById('shareExpiryTime');
  const btnIcon = document.querySelector('#btn-toggle-share span');

  if (!badge || !label) return;

  if (sharingTimer) {
    clearInterval(sharingTimer);
    sharingTimer = null;
  }

  if (currentSession.shareCode) {
    badge.textContent = currentSession.shareCode;
    badge.classList.remove('hidden');
    label.textContent = t('sharing_active') || 'Teilen aktiv';
    if (btnIcon) btnIcon.textContent = 'link_off';

    if (currentSession.shareExpiresAt) {
      expiryLabel.classList.remove('hidden');
      updateExpiryTimer();
      sharingTimer = setInterval(updateExpiryTimer, 1000);
    } else {
      expiryLabel.classList.add('hidden');
    }
  } else {
    badge.classList.add('hidden');
    label.textContent = t('sharing_inactive') || '2h Code generieren';
    expiryLabel.classList.add('hidden');
    if (btnIcon) btnIcon.textContent = 'share';
  }

  function updateExpiryTimer() {
    const now = new Date().getTime();
    const expiry = new Date(currentSession.shareExpiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      clearInterval(sharingTimer);
      sharingTimer = null;
      currentSession.shareCode = null;
      currentSession.shareExpiresAt = null;
      renderSharingState();
      return;
    }

    const minutes = Math.floor(diff / 1000 / 60);
    const seconds = Math.floor((diff / 1000) % 60);
    expiryTime.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
}

function setupSharingControls(sessionId) {
  const btn = document.getElementById('btn-toggle-share');
  if (!btn) return;

  btn.onclick = async () => {
    try {
      if (currentSession.shareCode) {
        if (!confirm(t('confirm_stop_sharing') || 'Teilen beenden?')) return;
        await apiService.unshareSession(sessionId);
        currentSession.shareCode = null;
        currentSession.shareExpiresAt = null;
      } else {
        const res = await apiService.shareSession(sessionId);
        currentSession.shareCode = res.shareCode;
        currentSession.shareExpiresAt = res.shareExpiresAt;
      }

      renderSharingState();
    } catch (err) {
      console.error('Sharing error:', err);
      alert('Fehler beim Ändern des Share-Status.');
    }
  };
}

function updateMiniList() {
  const mini = document.getElementById('miniAthletesList');
  if (!mini) return;
  if (sessionAthletes.length === 0) {
    mini.innerHTML = `<span class="text-[11px] text-zinc-500 italic">${t('no_athletes') || '–'}</span>`;
    return;
  }
  mini.innerHTML = sessionAthletes
    .map((a) => {
      const initials = a.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return `<div class="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full pl-1 pr-2.5 py-0.5">
        <div class="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-black text-primary">${initials}</div>
        <span class="text-[11px] font-semibold text-primary/90 whitespace-nowrap">${a.name.split(' ')[0]}</span>
      </div>`;
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

async function saveSession() {
  if (currentSession.settings) {
    localStorage.setItem(
      'b_session_settings_' + currentSession.id,
      JSON.stringify(currentSession.settings)
    );
  }
  try {
    await apiService.updateSession(currentSession.id, currentSession);
  } catch (e) {
    console.error('Fehler beim Speichern:', e);
  }
}

function setupTargetPreviewLogic() {
  const modal = document.getElementById('targetPreviewModal');
  const closeBtn = document.getElementById('closeTargetPreviewBtn');
  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  };
}

function openTargetPreview(seriesId, athleteId) {
  const modal = document.getElementById('targetPreviewModal');
  const container = document.getElementById('largeTargetContainer');
  const editBtn = document.getElementById('modalEditSeriesBtn');
  const series = (currentSession.series || []).find((s) => s.id == seriesId);
  if (!series) return;
  container.innerHTML = renderMiniTarget(series.shots, 'full');
  editBtn.onclick = () => {
    window.location.href = `shooting.html?series=${seriesId}&session=${currentSession.id}&athleteId=${athleteId}`;
  };
  modal.classList.remove('hidden');
}

/**
 * EXPORT LOGIC
 */

function exportSessionToPDF() {
  if (!currentSession) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const lang = typeof getLanguage === 'function' ? getLanguage() : 'de';

  let maxSeriesCount = 0;
  sessionAthletes.forEach((athlete) => {
    const count = (currentSession.series || []).filter((s) => s.athleteId == athlete.id).length;
    if (count > maxSeriesCount) maxSeriesCount = count;
  });

  const seriesCols = Array.from({ length: maxSeriesCount }, (_, i) => `SF ${i + 1}`);

  const head = [
    [t('name') || 'Name', t('age_group_short') || 'Klasse', t('hits') || 'Treffer', ...seriesCols],
  ];

  const body = sessionAthletes.map((athlete) => {
    const atomSeries = (currentSession.series || [])
      .filter((s) => s.athleteId == athlete.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const hitCount = atomSeries.reduce((sum, s) => sum + (s.stats?.hitCount || 0), 0);
    const totalShots = atomSeries.reduce((sum, s) => sum + (s.stats?.totalShots || 0), 0);
    const hitRate = totalShots > 0 ? `${Math.round((hitCount / totalShots) * 100)}%` : '-';

    const seriesData = Array.from({ length: maxSeriesCount }, (_, i) => {
      const s = atomSeries[i];
      if (!s) return '-';
      const hits = s.stats ? ` (${s.stats.hitCount}/${s.stats.totalShots})` : '';
      return (s.rangeTime || '-') + hits;
    });

    return [
      athlete.name,
      athlete.ageGroup || '-',
      `${hitCount}/${totalShots} (${hitRate})`,
      ...seriesData,
    ];
  });

  const autoTableFn = doc.autoTable || jsPDF.autoTable;

  if (typeof autoTableFn !== 'function') {
    alert('Export Error: PDF AutoTable plugin not loaded correctly.');
    return;
  }

  doc.setFontSize(20);
  doc.setTextColor(0, 122, 255);
  doc.text(currentSession.name, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date(currentSession.date).toLocaleDateString(
    lang === 'de' ? 'de-DE' : 'en-US'
  );
  doc.text(`${dateStr} | ${currentSession.location} | ${currentSession.type}`, 14, 30);

  autoTableFn.call(doc, {
    head: head,
    body: body,
    startY: 40,
    theme: 'striped',
    headStyles: { fillColor: [0, 122, 255], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { top: 40 },
  });

  const fileName = `Session_${currentSession.name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(fileName);
}

function exportSessionToExcel() {
  if (!currentSession) return;

  let maxSeriesCount = 0;
  sessionAthletes.forEach((athlete) => {
    const count = (currentSession.series || []).filter((s) => s.athleteId == athlete.id).length;
    if (count > maxSeriesCount) maxSeriesCount = count;
  });

  const data = sessionAthletes.map((athlete) => {
    const atomSeries = (currentSession.series || [])
      .filter((s) => s.athleteId == athlete.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const hitCount = atomSeries.reduce((sum, s) => sum + (s.stats?.hitCount || 0), 0);
    const totalShots = atomSeries.reduce((sum, s) => sum + (s.stats?.totalShots || 0), 0);
    const hitRate = totalShots > 0 ? Math.round((hitCount / totalShots) * 100) : 0;

    const row = {
      [t('name') || 'Name']: athlete.name,
      [t('age_group') || 'Altersklasse']: athlete.ageGroup || '-',
      [t('hits') || 'Treffer']: hitCount,
      [t('total') || 'Gesamt']: totalShots,
      [t('hit_rate') || 'Quote (%)']: hitRate,
    };

    for (let i = 0; i < maxSeriesCount; i++) {
      const s = atomSeries[i];
      row[`SF ${i + 1} Zeit`] = s?.rangeTime || '-';
      row[`SF ${i + 1} Treffer`] = s?.stats ? `${s.stats.hitCount}/${s.stats.totalShots}` : '-';
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

  const wscols = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

  for (let i = 0; i < maxSeriesCount; i++) {
    wscols.push({ wch: 12 });
    wscols.push({ wch: 10 });
  }

  worksheet['!cols'] = wscols;

  const fileName = `Session_${currentSession.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
