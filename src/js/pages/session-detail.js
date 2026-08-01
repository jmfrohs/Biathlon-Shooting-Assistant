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
let weatherEditSnapshot = null;

const WEATHER_TRACK_FIELD_CONFIG = [
  { field: 'temp', inputId: 'tempInput', group: 'weather' },
  { field: 'sky', inputId: 'skyInput', group: 'weather' },
  { field: 'precipitation', inputId: 'precipitationInput', group: 'weather' },
  { field: 'humidity', inputId: 'humidityInput', group: 'weather' },
  { field: 'windStrength', inputId: 'windStrengthInput', group: 'weather' },
  { field: 'windDirection', inputId: 'windDirectionInput', group: 'weather' },
  { field: 'snowType', inputId: 'snowTypeInput', group: 'track' },
  { field: 'surfaceMoisture', inputId: 'surfaceMoistureInput', group: 'track' },
  { field: 'trackHardness', inputId: 'trackHardnessInput', group: 'track' },
  { field: 'snowGrain', inputId: 'snowGrainInput', group: 'track' },
  { field: 'trackPreparation', inputId: 'trackPreparationInput', group: 'track' },
];

function calculateISTPoints(athleteId, session) {
  const series = session.series || [];
  const athleteSeries = series.filter((s) => s.athleteId === athleteId);
  const times = (session.istTimes && session.istTimes[athleteId]) || {
    llssTime: 0,
    singleProneTime: 0,
    singleStandingTime: 0,
  };

  // 1. Präzision 10/10
  const part1 = athleteSeries.filter((s) => s.istPart === 1);
  const pronePart1 = part1.find((s) => s.stance === 'Liegend');
  const standingPart1 = part1.find((s) => s.stance === 'Stehend');

  const proneRings = pronePart1 ? pronePart1.shots.reduce((sum, s) => sum + (s.ring || 0), 0) : 0;
  const standingRings = standingPart1
    ? standingPart1.shots.reduce((sum, s) => sum + (s.ring || 0), 0)
    : 0;
  const part1Total = proneRings + standingRings;

  // 2. LLSS BiaSerie
  const part2 = athleteSeries.filter((s) => s.istPart === 2);
  const part2Hits = part2.reduce((sum, s) => sum + s.shots.filter((sh) => sh.hit).length, 0);
  const llssTime = times.llssTime || 0;
  const part2Total = llssTime > 0 ? Math.max(0, 80 - llssTime + part2Hits * 10) : 0;

  // 3. 5/5 x 1 Treffer
  const part3 = athleteSeries.filter((s) => s.istPart === 3);
  const pronePart3 = part3.filter((s) => s.stance === 'Liegend');
  const standingPart3 = part3.filter((s) => s.stance === 'Stehend');

  const pronePart3Shots = pronePart3.reduce((sum, s) => sum + s.shots.length, 0);
  const standingPart3Shots = standingPart3.reduce((sum, s) => sum + s.shots.length, 0);

  const singleProneTime = times.singleProneTime || 0;
  const singleStandingTime = times.singleStandingTime || 0;

  const pointsC = singleProneTime > 0 ? Math.max(0, 160 - singleProneTime) : 0;
  const pointsD = singleStandingTime > 0 ? Math.max(0, 150 - singleStandingTime) : 0;
  const part3Total = pointsC + pointsD;

  const grandTotal = part1Total + part2Total + part3Total;

  return {
    proneRings,
    standingRings,
    part1Total,
    part2Hits,
    llssTime,
    part2Total,
    pronePart3Shots,
    standingPart3Shots,
    singleProneTime,
    singleStandingTime,
    pointsC,
    pointsD,
    part3Total,
    grandTotal,
  };
}

function renderISTBlock(athlete, athleteSeries) {
  const points = calculateISTPoints(athlete.id, currentSession);

  const part1 = athleteSeries.filter((s) => s.istPart === 1);
  const pronePart1 = part1.find((s) => s.stance === 'Liegend');
  const standingPart1 = part1.find((s) => s.stance === 'Stehend');

  const part2 = athleteSeries.filter((s) => s.istPart === 2);
  const part3 = athleteSeries.filter((s) => s.istPart === 3);
  const pronePart3 = part3.filter((s) => s.stance === 'Liegend');
  const standingPart3 = part3.filter((s) => s.stance === 'Stehend');

  const linkP1L = pronePart1
    ? `window.location.href='shooting.html?series=${pronePart1.id}&session=${currentSession.id}&athleteId=${athlete.id}&type=series'`
    : '';
  const linkP1S = standingPart1
    ? `window.location.href='shooting.html?series=${standingPart1.id}&session=${currentSession.id}&athleteId=${athlete.id}&type=series'`
    : '';

  const linkP2 =
    part2.length > 0
      ? `window.location.href='shooting.html?series=${part2[0].id}&session=${currentSession.id}&athleteId=${athlete.id}&type=series'`
      : '';

  const linkP3L =
    pronePart3.length > 0
      ? `window.location.href='shooting.html?series=${pronePart3[0].id}&session=${currentSession.id}&athleteId=${athlete.id}&type=series'`
      : '';
  const linkP3S =
    standingPart3.length > 0
      ? `window.location.href='shooting.html?series=${standingPart3[0].id}&session=${currentSession.id}&athleteId=${athlete.id}&type=series'`
      : '';

  return `
    <div class="bg-off-white/5 border border-subtle/50 rounded-2xl p-4 mb-4 space-y-4">
      <div class="flex items-center justify-between border-b border-subtle/20 pb-2">
        <span class="text-xs font-black uppercase tracking-wider text-neon-cyan">${t('international_test')}</span>
        <span class="text-sm font-black text-off-white bg-primary/20 px-2 py-0.5 rounded-full">${points.grandTotal} ${t('points') || 'Punkte'}</span>
      </div>
      <p class="text-[10px] text-light-blue-info/60 italic leading-tight">${t('ist_explanation')}</p>
      
      <div class="overflow-x-auto no-scrollbar">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-subtle/20 text-[9px] uppercase tracking-wider text-zinc-500 font-black">
              <th class="py-1.5">${t('exercise') || 'Übung'}</th>
              <th class="py-1.5 text-center">${t('time') || 'Zeit'}</th>
              <th class="py-1.5 text-center">${t('shots_abbr') || 'Schuss'}</th>
              <th class="py-1.5 text-right">${t('points') || 'Punkte'}</th>
              <th class="py-1.5 text-center w-8"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-subtle/10">
            <!-- Präzision Liegend -->
            <tr>
              <td class="py-2 font-medium text-off-white">Präzision L</td>
              <td class="py-2 text-center text-zinc-500">-</td>
              <td class="py-2 text-center font-semibold text-off-white">10</td>
              <td class="py-2 text-right font-bold text-neon-green">${points.proneRings}</td>
              <td class="py-2 text-center">
                <button onclick="${linkP1L}" class="text-primary hover:text-primary-hover active:scale-90 transition-all p-1" title="Erfassen">
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </td>
            </tr>
            <!-- Präzision Stehend -->
            <tr>
              <td class="py-2 font-medium text-off-white">Präzision S</td>
              <td class="py-2 text-center text-zinc-500">-</td>
              <td class="py-2 text-center font-semibold text-off-white">10</td>
              <td class="py-2 text-right font-bold text-neon-green">${points.standingRings}</td>
              <td class="py-2 text-center">
                <button onclick="${linkP1S}" class="text-primary hover:text-primary-hover active:scale-90 transition-all p-1" title="Erfassen">
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </td>
            </tr>
            <!-- LLSS BiaSerie -->
            <tr>
              <td class="py-2 font-medium text-off-white">LLSS BiaSerie</td>
              <td class="py-2 text-center">
                <input type="number" value="${points.llssTime || ''}" placeholder="Zeit (s)" 
                       onchange="window.updateISTTime(${athlete.id}, 'llssTime', this.value)" 
                       class="w-16 bg-off-white/5 border border-subtle/30 rounded px-1.5 py-0.5 text-center text-xs text-off-white focus:outline-none focus:border-primary" />
              </td>
              <td class="py-2 text-center font-semibold text-off-white">${points.part2Hits}/20</td>
              <td class="py-2 text-right font-bold text-neon-green">${points.part2Total}</td>
              <td class="py-2 text-center">
                <button onclick="${linkP2}" class="text-primary hover:text-primary-hover active:scale-90 transition-all p-1" title="Erfassen">
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </td>
            </tr>
            <!-- 5/5 x 1 Treffer L -->
            <tr>
              <td class="py-2 font-medium text-off-white">5x1 L (Punkte C)</td>
              <td class="py-2 text-center">
                <input type="number" value="${points.singleProneTime || ''}" placeholder="Zeit (s)" 
                       onchange="window.updateISTTime(${athlete.id}, 'singleProneTime', this.value)" 
                       class="w-16 bg-off-white/5 border border-subtle/30 rounded px-1.5 py-0.5 text-center text-xs text-off-white focus:outline-none focus:border-primary" />
              </td>
              <td class="py-2 text-center font-semibold text-off-white">${points.pronePart3Shots} ${t('shots_abbr') || 'Schuss'}</td>
              <td class="py-2 text-right font-bold text-neon-green">${points.pointsC}</td>
              <td class="py-2 text-center">
                <button onclick="${linkP3L}" class="text-primary hover:text-primary-hover active:scale-90 transition-all p-1" title="Erfassen">
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </td>
            </tr>
            <!-- 5/5 x 1 Treffer S -->
            <tr>
              <td class="py-2 font-medium text-off-white">5x1 S (Punkte D)</td>
              <td class="py-2 text-center">
                <input type="number" value="${points.singleStandingTime || ''}" placeholder="Zeit (s)" 
                       onchange="window.updateISTTime(${athlete.id}, 'singleStandingTime', this.value)" 
                       class="w-16 bg-off-white/5 border border-subtle/30 rounded px-1.5 py-0.5 text-center text-xs text-off-white focus:outline-none focus:border-primary" />
              </td>
              <td class="py-2 text-center font-semibold text-off-white">${points.standingPart3Shots} ${t('shots_abbr') || 'Schuss'}</td>
              <td class="py-2 text-right font-bold text-neon-green">${points.pointsD}</td>
              <td class="py-2 text-center">
                <button onclick="${linkP3S}" class="text-primary hover:text-primary-hover active:scale-90 transition-all p-1" title="Erfassen">
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function updateISTTime(athleteId, fieldName, value) {
  if (!currentSession) return;
  if (!currentSession.istTimes) currentSession.istTimes = {};
  if (!currentSession.istTimes[athleteId]) {
    currentSession.istTimes[athleteId] = { llssTime: 0, singleProneTime: 0, singleStandingTime: 0 };
  }
  currentSession.istTimes[athleteId][fieldName] = parseFloat(value) || 0;

  try {
    await apiService.updateSession(currentSession.id, currentSession);
    renderAthletes();
  } catch (err) {
    console.error('Error updating IST times:', err);
  }
}

window.updateISTTime = updateISTTime;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = parseInt(urlParams.get('id'));
  if (!sessionId) {
    window.location.href = 'index.html';
    return;
  }

  await loadSessionDetail(sessionId);
  setupSessionNotesLogic(sessionId);
  setupWeatherLogic(sessionId);
  setupSessionAnalysisButton(sessionId);
  setupSharingControls(sessionId);
  setupSettingsButton(sessionId);
  setupTargetPreviewLogic();
  sessionDetailPoll = setInterval(() => loadSessionDetail(sessionId), 10000);
});

async function loadSessionDetail(sessionId) {
  let session = null;
  let athletes = [];

  try {
    session = await apiService.getSession(sessionId);
    if (!session) {
      window.location.href = 'index.html';
      return;
    }

    try {
      athletes = await apiService.getAthletes();
    } catch (athletesError) {
      athletes = [];
    }

    currentSession = session;
    const localSettings = JSON.parse(
      localStorage.getItem('b_session_settings_' + sessionId) || 'null'
    );
    if (localSettings) currentSession.settings = localSettings;
    allAthletes =
      (Array.isArray(athletes) && athletes.length > 0
        ? athletes
        : Array.isArray(session.athleteData)
          ? session.athleteData
          : []) || [];
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
    subtitleEl.textContent = dateStr;
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

  sessionAthletes = ids.map((id) => map.get(id)).filter(Boolean);
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
          const istHtml =
            currentSession.type === 'international_test'
              ? renderISTBlock(athlete, athleteSeries)
              : '';
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
                    ${istHtml}
                    ${renderSeriesList(athleteSeries, athlete.id)}
                </div>
            </div>
          `;
        }

        const istHtml =
          currentSession.type === 'international_test'
            ? renderISTBlock(athlete, athleteSeries)
            : '';
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
                        ${istHtml}
                        ${renderSeriesList(athleteSeries, athlete.id)}
                    </div>
                </div>
            </div>
        `;
      })
      .join('');

  setupSwipeListeners();
  restoreAthleteExpansionState();
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
      const totalRings =
        stats.totalRings !== undefined
          ? stats.totalRings
          : s.shots
            ? s.shots.reduce((sum, shot) => sum + (shot.ring || 0), 0)
            : 0;
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
                            <h4 class="text-sm font-bold text-off-white">${s.stance || 'Liegend'} (${s.shotsPerSeries || 5} Schuss)</h4>
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

      const targetShotsCount = s.shotsPerSeries || 5;
      const shotIndicators = Array.from({ length: targetShotsCount })
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

                        <div class="shrink-0">
                            ${renderMiniTarget(s.shots, 64)}
                        </div>

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
                                            <span class="text-lg font-black text-off-white leading-none">${stats.hitCount}</span><span class="text-xs text-zinc-500 font-bold">/${targetShotsCount}</span>
                                        </div>
                                        ${s.rangeTime || s.totalTime ? `<span class="text-xs font-black text-primary/90 font-mono tracking-tighter leading-none mt-0.5">${s.rangeTime || s.totalTime}</span>` : ''}
                                    </div>
                                </div>
                            </div>

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
                                    <p class="text-[9px] text-zinc-500 uppercase font-black tracking-wider">${t('rings')}</p>
                                    <p class="text-2xl font-black text-off-white leading-tight mt-1">${totalRings}</p>
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

  const isHidden = section.classList.contains('hidden');

  if (isHidden) {
    section.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
    wrapper.classList.add('border-primary/30', 'bg-white/[0.02]');
  } else {
    section.classList.add('hidden');
    icon.style.transform = 'rotate(0deg)';
    wrapper.classList.remove('border-primary/30', 'bg-white/[0.02]');
  }

  const sessionId = currentSession?.id;
  if (sessionId) {
    const storageKey = `b_athlete_expanded_${sessionId}`;
    let expanded = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (isHidden) {
      if (!expanded.includes(athleteId)) expanded.push(athleteId);
    } else {
      expanded = expanded.filter((id) => id !== athleteId);
    }
    sessionStorage.setItem(storageKey, JSON.stringify(expanded));
  }
}

function restoreAthleteExpansionState() {
  const sessionId = currentSession?.id;
  if (!sessionId) return;

  const storageKey = `b_athlete_expanded_${sessionId}`;
  const expanded = JSON.parse(sessionStorage.getItem(storageKey) || '[]');

  expanded.forEach((athleteId) => {
    const section = document.getElementById(`series-section-${athleteId}`);
    const icon = document.getElementById(`expand-icon-${athleteId}`);
    const wrapper = document.getElementById(`athlete-wrapper-${athleteId}`);

    if (section && icon && wrapper) {
      section.classList.remove('hidden');
      icon.style.transform = 'rotate(180deg)';
      wrapper.classList.add('border-primary/30', 'bg-white/[0.02]');
    }
  });
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

function setupWeatherLogic(sessionId) {
  const openBtn = document.getElementById('openWeatherConditionsBtn');
  const modal = document.getElementById('weatherModal');
  const closeBtn = document.getElementById('closeWeatherBtn');

  if (openBtn) {
    openBtn.onclick = () => {
      renderWeatherConditions(sessionId);
      initializeWeatherEditState();
      modal.classList.remove('hidden');
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.add('hidden');
      window.cancelWeatherEdit();
    };
  }

  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        window.cancelWeatherEdit();
      }
    };
  }

  attachWeatherFieldListeners();
}

function normalizeWeatherInputValue(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function collectWeatherFormValues() {
  const weather = {};
  const track = {};
  const flat = {};

  WEATHER_TRACK_FIELD_CONFIG.forEach(({ field, inputId, group }) => {
    const input = document.getElementById(inputId);
    const normalizedValue = normalizeWeatherInputValue(input ? input.value : null);
    flat[field] = normalizedValue;
    if (group === 'weather') weather[field] = normalizedValue;
    else track[field] = normalizedValue;
  });

  return { weather, track, flat };
}

function setWeatherSaveButtonState(hasChanges) {
  const saveBtn = document.getElementById('saveWeatherBtn');
  if (!saveBtn) return;
  saveBtn.disabled = !hasChanges;
  saveBtn.classList.toggle('opacity-50', !hasChanges);
  saveBtn.classList.toggle('cursor-not-allowed', !hasChanges);
}

function updateWeatherDirtyIndicators(currentFlat) {
  const snapshot = weatherEditSnapshot || {};
  WEATHER_TRACK_FIELD_CONFIG.forEach(({ field }) => {
    const editModeEl = document.getElementById(`${field}EditMode`);
    if (!editModeEl) return;
    const isDirty = snapshot[field] !== currentFlat[field];
    editModeEl.classList.toggle('weather-dirty', isDirty);
  });
}

function updateWeatherEditUiState() {
  const currentValues = collectWeatherFormValues();
  const currentSerialized = JSON.stringify(currentValues.flat);
  const snapshotSerialized = JSON.stringify(weatherEditSnapshot || {});
  const hasChanges = currentSerialized !== snapshotSerialized;

  setWeatherSaveButtonState(hasChanges);
  updateWeatherDirtyIndicators(currentValues.flat);
}

function initializeWeatherEditState() {
  const currentValues = collectWeatherFormValues();
  weatherEditSnapshot = { ...currentValues.flat };
  setWeatherSaveButtonState(false);
  updateWeatherDirtyIndicators(currentValues.flat);
}

function attachWeatherFieldListeners() {
  WEATHER_TRACK_FIELD_CONFIG.forEach(({ inputId }) => {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.weatherListenerAttached === 'true') return;

    const handler = () => updateWeatherEditUiState();
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
    input.dataset.weatherListenerAttached = 'true';
  });
}

let activeEditingNoteId = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSessionNotesList() {
  if (!currentSession) return [];
  if (Array.isArray(currentSession.notes)) {
    return currentSession.notes;
  }
  if (typeof currentSession.note === 'string' && currentSession.note.trim() !== '') {
    return [
      {
        id: 'note_legacy',
        text: currentSession.note.trim(),
        timestamp: currentSession.createdAt || new Date().toISOString(),
      },
    ];
  }
  return [];
}

function renderSessionNotes() {
  const container = document.getElementById('sessionNotesList');
  if (!container) return;

  const notes = getSessionNotesList();

  if (notes.length === 0) {
    container.innerHTML = `
      <div class="bg-deep-charcoal/30 rounded-[24px] border border-subtle/50 p-6 text-center space-y-2">
        <span class="material-symbols-outlined text-light-blue-info/30 text-[36px]">notes</span>
        <p class="text-xs text-light-blue-info/60 italic" data-i18n="no_notes_yet">${t('no_notes_yet') || 'Noch keine Bemerkungen hinzugefügt'}</p>
      </div>
    `;
    return;
  }

  const lang = typeof getLanguage === 'function' ? getLanguage() : 'de';
  const locale = lang === 'de' ? 'de-DE' : 'en-US';

  container.innerHTML = notes
    .map((note) => {
      const isEditing = activeEditingNoteId === String(note.id);
      const dateStr = note.timestamp
        ? new Date(note.timestamp).toLocaleString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      const escapedText = escapeHtml(note.text || '');

      if (isEditing) {
        return `
          <div class="bg-deep-charcoal/70 rounded-[24px] border border-primary/50 p-4 space-y-3">
            <textarea
              id="editNoteInput_${note.id}"
              rows="4"
              class="w-full bg-off-white/10 border border-subtle rounded-xl px-4 py-3 text-off-white text-sm focus:outline-none focus:border-primary resize-y"
            >${escapedText}</textarea>
            <div class="flex justify-end gap-2">
              <button
                onclick="window.cancelEditNoteItem('${note.id}')"
                class="px-4 py-2 rounded-xl bg-white/5 border border-subtle text-xs text-off-white font-bold active:scale-95 transition-all"
                data-i18n="cancel"
              >${t('cancel') || 'Abbrechen'}</button>
              <button
                onclick="window.saveEditNoteItem('${note.id}')"
                class="px-4 py-2 rounded-xl bg-primary text-xs text-off-white font-bold active:scale-95 transition-all"
                data-i18n="save"
              >${t('save') || 'Speichern'}</button>
            </div>
          </div>
        `;
      }

      return `
        <div class="bg-deep-charcoal/50 rounded-[24px] border border-subtle p-4 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase tracking-[0.15em] text-light-blue-info/70">
              ${dateStr}
            </span>
            <div class="flex items-center gap-1">
              <button
                onclick="window.editSessionNoteItem('${note.id}')"
                class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-light-blue-info/70 hover:text-off-white transition-all active:scale-90"
                title="${t('edit') || 'Bearbeiten'}"
              >
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                onclick="window.deleteSessionNoteItem('${note.id}')"
                class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-light-blue-info/70 hover:text-red-400 transition-all active:scale-90"
                title="${t('delete') || 'Löschen'}"
              >
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
          <p class="text-sm text-off-white whitespace-pre-wrap leading-relaxed">${escapedText}</p>
        </div>
      `;
    })
    .join('');
}

function setupSessionNotesLogic(sessionId) {
  const openBtn = document.getElementById('openSessionNotesBtn');
  const modal = document.getElementById('sessionNotesModal');
  const closeBtn = document.getElementById('closeSessionNotesBtn');

  if (openBtn) {
    openBtn.onclick = () => {
      activeEditingNoteId = null;
      renderSessionNotes();
      modal.classList.remove('hidden');
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.add('hidden');
      activeEditingNoteId = null;
    };
  }

  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        activeEditingNoteId = null;
      }
    };
  }
}

function setupSessionAnalysisButton(sessionId) {
  const btn = document.getElementById('openSessionAnalysisBtn');
  if (!btn) return;

  btn.onclick = () => {
    window.location.href = `analytics.html?sessionId=${sessionId}`;
  };
}

function renderWeatherConditions(sessionId) {
  const weather = currentSession?.weather || {};
  const track = currentSession?.track || {};
  const noEntry = t('optional_no_entry');

  const getDisplayValue = (value, fallbackToRaw = false) => {
    if (value === null || value === undefined || value === '') {
      return noEntry;
    }

    const translated = t(value);
    if (translated && translated !== value) {
      return translated;
    }

    return fallbackToRaw ? String(value) : translated;
  };

  const tempDisplay = document.getElementById('tempDisplay');
  if (tempDisplay) {
    const temp = weather.temp;
    tempDisplay.textContent =
      temp !== null && temp !== undefined && temp !== '' ? `${temp}°C` : noEntry;
  }

  const skyDisplay = document.getElementById('skyDisplay');
  if (skyDisplay) {
    skyDisplay.textContent = getDisplayValue(weather.sky);
  }

  const precipitationDisplay = document.getElementById('precipitationDisplay');
  if (precipitationDisplay) {
    precipitationDisplay.textContent = getDisplayValue(weather.precipitation);
  }

  const humidityDisplay = document.getElementById('humidityDisplay');
  if (humidityDisplay) {
    humidityDisplay.textContent = getDisplayValue(weather.humidity);
  }

  const windStrengthDisplay = document.getElementById('windStrengthDisplay');
  if (windStrengthDisplay) {
    windStrengthDisplay.textContent = getDisplayValue(weather.windStrength);
  }

  const windDirectionDisplay = document.getElementById('windDirectionDisplay');
  if (windDirectionDisplay) {
    windDirectionDisplay.textContent = getDisplayValue(weather.windDirection, true);
  }

  const snowTypeDisplay = document.getElementById('snowTypeDisplay');
  if (snowTypeDisplay) {
    snowTypeDisplay.textContent = getDisplayValue(track.snowType);
  }

  const surfaceMoistureDisplay = document.getElementById('surfaceMoistureDisplay');
  if (surfaceMoistureDisplay) {
    surfaceMoistureDisplay.textContent = getDisplayValue(track.surfaceMoisture);
  }

  const trackHardnessDisplay = document.getElementById('trackHardnessDisplay');
  if (trackHardnessDisplay) {
    trackHardnessDisplay.textContent = getDisplayValue(track.trackHardness);
  }

  const snowGrainDisplay = document.getElementById('snowGrainDisplay');
  if (snowGrainDisplay) {
    snowGrainDisplay.textContent = getDisplayValue(track.snowGrain);
  }

  const trackPreparationDisplay = document.getElementById('trackPreparationDisplay');
  if (trackPreparationDisplay) {
    trackPreparationDisplay.textContent = getDisplayValue(track.trackPreparation);
  }

  // Befülle die Input-Felder mit aktuellen Werten
  const tempInput = document.getElementById('tempInput');
  if (tempInput) tempInput.value = weather.temp || '';

  const skyInput = document.getElementById('skyInput');
  if (skyInput) skyInput.value = weather.sky || '';

  const precipitationInput = document.getElementById('precipitationInput');
  if (precipitationInput) precipitationInput.value = weather.precipitation || '';

  const humidityInput = document.getElementById('humidityInput');
  if (humidityInput) humidityInput.value = weather.humidity || '';

  const windStrengthInput = document.getElementById('windStrengthInput');
  if (windStrengthInput) windStrengthInput.value = weather.windStrength || '';

  const windDirectionInput = document.getElementById('windDirectionInput');
  if (windDirectionInput) windDirectionInput.value = weather.windDirection || '';

  const snowTypeInput = document.getElementById('snowTypeInput');
  if (snowTypeInput) snowTypeInput.value = track.snowType || '';

  const surfaceMoistureInput = document.getElementById('surfaceMoistureInput');
  if (surfaceMoistureInput) surfaceMoistureInput.value = track.surfaceMoisture || '';

  const trackHardnessInput = document.getElementById('trackHardnessInput');
  if (trackHardnessInput) trackHardnessInput.value = track.trackHardness || '';

  const snowGrainInput = document.getElementById('snowGrainInput');
  if (snowGrainInput) snowGrainInput.value = track.snowGrain || '';

  const trackPreparationInput = document.getElementById('trackPreparationInput');
  if (trackPreparationInput) trackPreparationInput.value = track.trackPreparation || '';
}

window.addNewSessionNote = async function () {
  const input = document.getElementById('newSessionNoteInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const notes = getSessionNotesList();
  const newNote = {
    id: 'note_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    text: text,
    timestamp: new Date().toISOString(),
  };

  notes.push(newNote);
  currentSession.notes = notes;
  currentSession.note = notes.map((n) => n.text).join('\n\n') || null;

  try {
    await apiService.updateSession(currentSession.id, currentSession);
    if (input) input.value = '';
    renderSessionNotes();
  } catch (e) {
    console.error('Fehler beim Hinzufügen der Bemerkung:', e);
    alert(t('error_saving') || 'Fehler beim Speichern.');
  }
};

window.editSessionNoteItem = function (noteId) {
  activeEditingNoteId = String(noteId);
  renderSessionNotes();
  setTimeout(() => {
    const input = document.getElementById(`editNoteInput_${noteId}`);
    if (input) input.focus();
  }, 50);
};

window.cancelEditNoteItem = function (noteId) {
  activeEditingNoteId = null;
  renderSessionNotes();
};

window.saveEditNoteItem = async function (noteId) {
  const input = document.getElementById(`editNoteInput_${noteId}`);
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const notes = getSessionNotesList();
  const index = notes.findIndex((n) => String(n.id) === String(noteId));
  if (index !== -1) {
    notes[index].text = text;
    notes[index].updatedAt = new Date().toISOString();
  }

  currentSession.notes = notes;
  currentSession.note = notes.map((n) => n.text).join('\n\n') || null;

  try {
    await apiService.updateSession(currentSession.id, currentSession);
    activeEditingNoteId = null;
    renderSessionNotes();
  } catch (e) {
    console.error('Fehler beim Speichern der Bemerkung:', e);
    alert(t('error_saving') || 'Fehler beim Speichern.');
  }
};

window.deleteSessionNoteItem = async function (noteId) {
  const confirmMsg = t('confirm_delete_note') || 'Möchtest du diese Bemerkung wirklich löschen?';
  if (!confirm(confirmMsg)) return;

  let notes = getSessionNotesList();
  notes = notes.filter((n) => String(n.id) !== String(noteId));

  currentSession.notes = notes;
  currentSession.note = notes.map((n) => n.text).join('\n\n') || null;

  try {
    await apiService.updateSession(currentSession.id, currentSession);
    renderSessionNotes();
  } catch (e) {
    console.error('Fehler beim Löschen der Bemerkung:', e);
    alert(t('error_saving') || 'Fehler beim Speichern.');
  }
};

/**
 * Weather Edit Mode Functions
 */
window.editWeatherField = function (fieldName) {
  const fields = WEATHER_TRACK_FIELD_CONFIG.map(({ field }) => field);

  fields.forEach((field) => {
    document.getElementById(`${field}ViewMode`)?.classList.add('hidden');
    document.getElementById(`${field}EditMode`)?.classList.remove('hidden');
  });

  // Zeige Action-Buttons
  document.getElementById('weatherActionButtons').classList.remove('hidden');
  initializeWeatherEditState();

  // Fokus auf das betreffende Feld
  setTimeout(() => {
    const inputId = {
      temp: 'tempInput',
      sky: 'skyInput',
      precipitation: 'precipitationInput',
      humidity: 'humidityInput',
      windStrength: 'windStrengthInput',
      windDirection: 'windDirectionInput',
      snowType: 'snowTypeInput',
      surfaceMoisture: 'surfaceMoistureInput',
      trackHardness: 'trackHardnessInput',
      snowGrain: 'snowGrainInput',
      trackPreparation: 'trackPreparationInput',
    }[fieldName];
    const input = document.getElementById(inputId);
    if (input) input.focus();
  }, 100);
};

window.cancelWeatherEdit = function () {
  const fields = WEATHER_TRACK_FIELD_CONFIG.map(({ field }) => field);

  fields.forEach((field) => {
    document.getElementById(`${field}ViewMode`)?.classList.remove('hidden');
    document.getElementById(`${field}EditMode`)?.classList.add('hidden');
    document.getElementById(`${field}EditMode`)?.classList.remove('weather-dirty');
  });

  // Verstecke Action-Buttons
  document.getElementById('weatherActionButtons').classList.add('hidden');
  weatherEditSnapshot = null;
  setWeatherSaveButtonState(false);
};

window.saveWeatherChanges = async function () {
  try {
    const saveBtn = document.getElementById('saveWeatherBtn');
    const values = collectWeatherFormValues();
    const hasChanges = JSON.stringify(values.flat) !== JSON.stringify(weatherEditSnapshot || {});
    if (!hasChanges) {
      window.cancelWeatherEdit();
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add('opacity-70', 'cursor-not-allowed');
    }

    // Update currentSession
    if (!currentSession.weather) currentSession.weather = {};
    currentSession.weather = { ...currentSession.weather, ...values.weather };
    if (!currentSession.track) currentSession.track = {};
    currentSession.track = { ...currentSession.track, ...values.track };

    // Speichere auf Server
    await apiService.updateSession(currentSession.id, currentSession);

    // Aktualisiere die Anzeige
    renderWeatherConditions(currentSession.id);

    // Verlasse Edit-Modus
    window.cancelWeatherEdit();
  } catch (e) {
    console.error('Fehler beim Speichern der Wetterdaten:', e);
    alert('Fehler beim Speichern. Bitte versuche es erneut.');
  } finally {
    const saveBtn = document.getElementById('saveWeatherBtn');
    if (saveBtn) {
      saveBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
  }
};

function setupTargetPreviewLogic() {
  const modal = document.getElementById('targetPreviewModal');
  const closeBtn = document.getElementById('closeTargetPreviewBtn');
  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  };
}

function setupSettingsButton(sessionId) {
  const btn = document.getElementById('openSettingsBtn');
  if (!btn) return;
  btn.onclick = () => {
    window.location.href = `session-settings.html?id=${sessionId}`;
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

  const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  const dateStr = new Date(currentSession.date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getSeriesStats = (seriesEntry) => {
    const hits =
      seriesEntry?.stats?.hitCount ||
      (seriesEntry?.shots ? seriesEntry.shots.filter((shot) => shot.hit).length : 0);
    const total =
      seriesEntry?.stats?.totalShots || (seriesEntry?.shots ? seriesEntry.shots.length : 0);
    const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { hits, total, hitRate };
  };

  const makeUniqueSheetName = (rawName, usedNames, fallback = 'Sheet') => {
    const sanitized = (rawName || fallback)
      .toString()
      .replace(/[\\/?*\[\]:]/g, '_')
      .trim()
      .slice(0, 31);

    const base = sanitized || fallback;
    let candidate = base;
    let suffix = 2;
    while (usedNames.has(candidate)) {
      const suffixText = `_${suffix}`;
      candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }
    usedNames.add(candidate);
    return candidate;
  };

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set();
  const allSeries = currentSession.series || [];

  const summaryHeader = [
    t('name') || 'Name',
    t('age_group') || 'Altersklasse',
    'Serien',
    t('hits') || 'Treffer',
    t('total') || 'Gesamt',
    t('hit_rate') || 'Quote (%)',
    'Durchschnitt Serie (%)',
  ];

  const summaryRows = sessionAthletes.map((athlete) => {
    const athleteSeries = allSeries
      .filter((seriesEntry) => seriesEntry.athleteId == athlete.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const totals = athleteSeries.reduce(
      (acc, seriesEntry) => {
        const stats = getSeriesStats(seriesEntry);
        acc.hits += stats.hits;
        acc.total += stats.total;
        acc.hitRateSum += stats.hitRate;
        return acc;
      },
      { hits: 0, total: 0, hitRateSum: 0 }
    );

    const overallHitRate = totals.total > 0 ? Math.round((totals.hits / totals.total) * 100) : 0;
    const avgSeriesHitRate =
      athleteSeries.length > 0 ? Math.round(totals.hitRateSum / athleteSeries.length) : 0;

    return {
      athlete,
      athleteSeries,
      totals,
      overallHitRate,
      avgSeriesHitRate,
    };
  });

  const summaryData = [
    [currentSession.name || 'Session'],
    ['Datum', dateStr],
    ['Ort', currentSession.location || '-'],
    ['Typ', getTranslatedSessionType(currentSession.type)],
    [],
    summaryHeader,
    ...summaryRows.map((entry) => [
      entry.athlete.name,
      entry.athlete.ageGroup || '-',
      entry.athleteSeries.length,
      entry.totals.hits,
      entry.totals.total,
      entry.overallHitRate,
      entry.avgSeriesHitRate,
    ]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 24 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, makeUniqueSheetName('Summary', usedNames));

  summaryRows.forEach((entry) => {
    const athleteSheetData = [
      [`Athlet: ${entry.athlete.name}`],
      ['Session', currentSession.name || '-'],
      ['Datum', dateStr],
      ['Ort', currentSession.location || '-'],
      ['Typ', getTranslatedSessionType(currentSession.type)],
      ['Altersklasse', entry.athlete.ageGroup || '-'],
      ['Serien', entry.athleteSeries.length],
      ['Treffer gesamt', entry.totals.hits],
      ['Schuesse gesamt', entry.totals.total],
      ['Trefferquote gesamt (%)', entry.overallHitRate],
      ['Durchschnitt Serie (%)', entry.avgSeriesHitRate],
      [],
      ['Serie', 'Zeit', 'Treffer', 'Schuesse', 'Quote (%)', 'Typ', 'Zeitstempel'],
    ];

    if (entry.athleteSeries.length === 0) {
      athleteSheetData.push(['-', '-', 0, 0, 0, '-', '-']);
    } else {
      entry.athleteSeries.forEach((seriesEntry, index) => {
        const stats = getSeriesStats(seriesEntry);
        const timestamp = seriesEntry?.timestamp
          ? new Date(seriesEntry.timestamp).toLocaleString(locale)
          : '-';
        athleteSheetData.push([
          index + 1,
          seriesEntry?.rangeTime || seriesEntry?.totalTime || '-',
          stats.hits,
          stats.total,
          stats.hitRate,
          getTranslatedSeriesType(seriesEntry?.type),
          timestamp,
        ]);
      });
    }

    const athleteSheet = XLSX.utils.aoa_to_sheet(athleteSheetData);
    athleteSheet['!cols'] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 26 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      athleteSheet,
      makeUniqueSheetName(entry.athlete.name, usedNames, 'Athlete')
    );
  });

  const fileName = `Session_${currentSession.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

function getTranslatedSessionType(type) {
  const normalizedType = (type || 'training').toLowerCase();
  if (normalizedType === 'competition')
    return typeof t === 'function' ? t('competition') : 'Wettkampf';
  if (normalizedType === 'test_competition')
    return typeof t === 'function' ? t('test_competition') : 'Testwettkampf';
  if (normalizedType === 'training') return typeof t === 'function' ? t('training') : 'Training';
  if (normalizedType === 'other') return typeof t === 'function' ? t('other') : 'Sonstige';
  if (normalizedType === 'testing') return typeof t === 'function' ? t('testing') : 'Test';
  return typeof t === 'function' ? t(type) : type;
}

function getTranslatedSeriesType(type) {
  if (!type) return '-';
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'prone') return typeof t === 'function' ? t('prone') : 'Liegend';
  if (normalizedType === 'standing') return typeof t === 'function' ? t('standing') : 'Stehend';
  if (normalizedType === 'zeroing') return typeof t === 'function' ? t('zeroing') : 'Anschießen';
  return typeof t === 'function' ? t(type) : type;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateISTPoints,
    renderISTBlock,
    updateISTTime,
  };
}
