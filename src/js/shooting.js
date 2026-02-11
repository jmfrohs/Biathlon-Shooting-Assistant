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
 * Shooting Page Logic
 * Aligned with shooting.html design
 */
class ShootingPage {
  constructor() {
    this.svg = document.getElementById('biathlon-target');
    this.shotsGroup = document.getElementById('shotsGroup');
    this.ghostGroup = document.getElementById('ghostShotsGroup');
    this.typeLabel = document.getElementById('shooting-type-label');
    this.athletePill = document.getElementById('athlete-name-pill');
    this.clickDisplay = document.getElementById('click-display');
    this.params = new URLSearchParams(window.location.search);
    this.sessionId = parseInt(this.params.get('session'));
    this.athleteId = parseInt(this.params.get('athleteId'));
    this.seriesId = parseInt(this.params.get('series'));
    this.type = this.params.get('type') || 'series';
    this.session = null;
    this.athlete = null;
    this.series = null;
    this.shots = [];
    this.clicksX = 0;
    this.clicksY = 0;
    this.stance = 'Liegend';
    this.showGhost = false;
    this.clickRatio = 100 / 26;
    this.avgX = 100;
    this.avgY = 100;
    this.isGrouped = false;
    this.wind = 0;
    this.startTime = null;
    this.timerInterval = null;
    this.voiceInput = null;
    this.init();
  }

init() {
    this.loadData();
    this.setupEventListeners();
    this.setupGlobalHandlers();
    this.setupVoiceInput();
    this.renderTarget();
    this.renderAll();
  }

renderTarget() {
    const targetConstants = getTargetConstants();
    const baseSvg = targetConstants.svg;
    const contentMatch = baseSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    if (contentMatch && contentMatch[1]) {
      const groupsHtml =
        '<g id="ghostShotsGroup" pointer-events="none"></g><g id="shotsGroup"></g>';
      this.svg.innerHTML = contentMatch[1] + groupsHtml;
      this.shotsGroup = document.getElementById('shotsGroup');
      this.ghostGroup = document.getElementById('ghostShotsGroup');
    }
  }

loadData() {
    const sessions = JSON.parse(localStorage.getItem('sessions')) || [];
    this.session = sessions.find((s) => s.id === this.sessionId);
    this.allAthletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
    this.athlete =
      this.athleteId === 0
        ? { id: 0, name: 'Neutral' }
        : this.allAthletes.find((a) => a.id === this.athleteId);
    if (!this.session) {
      console.error('Session missing');
    }

if (this.seriesId) {
      this.series = (this.session.series || []).find((s) => s.id === this.seriesId);
      if (this.series) {
        this.shots = this.series.shots || [];
        this.stance = this.series.stance || 'Liegend';
        this.clicksX = this.series.clicksX || 0;
        this.clicksY = this.series.clicksY || 0;
        this.avgX = 100 + this.clicksX * this.clickRatio;
        this.avgY = 100 - this.clicksY * this.clickRatio;
      }
    } else {
      const athleteSeries = (this.session.series || []).filter(
        (s) => s.athleteId === this.athleteId
      );
      if (athleteSeries.length > 0) {
        const lastSeries = athleteSeries[athleteSeries.length - 1];
        this.clicksX = lastSeries.clicksX || 0;
        this.clicksY = lastSeries.clicksY || 0;
        this.avgX = 100 + this.clicksX * this.clickRatio;
        this.avgY = 100 - this.clicksY * this.clickRatio;
      }
    }

if (this.session && this.session.settings && this.session.settings.wind !== undefined) {
      this.wind = this.session.settings.wind;
    }

if (this.typeLabel) {
      const isZeroing = this.type === 'zeroing';
      this.typeLabel.textContent = isZeroing ? t('zeroing') : t('new_series');
      const container = this.typeLabel.parentElement;
      if (isZeroing) {
        this.typeLabel.classList.replace('text-off-white/90', 'text-yellow-500');
        container.classList.replace('border-subtle', 'border-yellow-500/30');
        container.classList.add('bg-yellow-500/10');
      } else {
        this.typeLabel.classList.replace('text-yellow-500', 'text-off-white/90');
        container.classList.replace('border-yellow-500/30', 'border-subtle');
        container.classList.remove('bg-yellow-500/10');
      }
    }

if (this.athletePill) {
      this.athletePill.textContent = this.athlete ? this.athlete.name : 'Unknown';
      const pillContainer = this.athletePill.parentElement;
      if (this.athleteId === 0) {
        this.athletePill.classList.replace('text-primary', 'text-zinc-400');
        pillContainer.classList.replace('bg-primary/10', 'bg-zinc-500/10');
        pillContainer.classList.replace('border-primary/20', 'border-zinc-500/20');
      } else {
        this.athletePill.classList.replace('text-zinc-400', 'text-primary');
        pillContainer.classList.replace('bg-zinc-500/10', 'bg-primary/10');
        pillContainer.classList.replace('border-zinc-500/20', 'border-primary/20');
      }
    }
  }

setupEventListeners() {
    if (this.svg) {
      this.svg.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    }
    document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    document.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) undoBtn.onclick = () => this.undoLastShot();
    const ghostBtn = document.getElementById('btn-toggle-ghost');
    if (ghostBtn) ghostBtn.onclick = () => this.toggleGhost();
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) saveBtn.onclick = () => this.save();
    const groupBtn = document.getElementById('btn-group-shots');
    if (groupBtn) groupBtn.onclick = () => this.toggleGrouping();
    const windBtn = document.getElementById('btn-wind');
    if (windBtn) windBtn.onclick = () => this.openWindModal();
    const windSlider = document.getElementById('wind-slider');
    if (windSlider) {
      windSlider.oninput = (e) => this.handleWindSliderInput(e.target.value);
    }
    const cancelWind = document.getElementById('btn-wind-cancel');
    if (cancelWind) cancelWind.onclick = () => this.closeWindModal();
    const resetWind = document.getElementById('btn-wind-reset');
    if (resetWind) resetWind.onclick = () => this.resetWind();
    const applyWind = document.getElementById('btn-wind-apply');
    if (applyWind) applyWind.onclick = () => this.applyWind();
    const micBtn = document.getElementById('btn-mic');
    if (micBtn) micBtn.onclick = () => this.toggleVoice();
  }

setupGlobalHandlers() {
    window.setStance = (stance) => this.setStance(stance);
    window.adjustCorrectionUp = () => this.adjustClicks(0, 1);
    window.adjustCorrectionDown = () => this.adjustClicks(0, -1);
    window.adjustCorrectionLeft = () => this.adjustClicks(-1, 0);
    window.adjustCorrectionRight = () => this.adjustClicks(1, 0);
    window.switchAthlete = (dir) => this.switchAthlete(dir);
    window.goBack = () => this.goBack();
  }

handlePointerDown(e) {
    const shotId = e.target.closest('.shot-marker')?.dataset.id;
    if (shotId) {
      this.isDragging = true;
      this.draggedShotId = parseInt(shotId);
      e.stopPropagation();
      return;
    }
    this.handleTargetClick(e);
  }

handlePointerMove(e) {
    if (!this.isDragging || !this.draggedShotId) return;
    const pt = this.getSVGCoords(e);
    const shot = this.shots.find((s) => s.id === this.draggedShotId);
    if (shot) {
      shot.x = pt.x;
      shot.y = pt.y;
      this.renderShots();
    }
  }

handlePointerUp(e) {
    if (this.isDragging && this.draggedShotId) {
      const shot = this.shots.find((s) => s.id === this.draggedShotId);
      if (shot) {
        const dist = Math.sqrt(Math.pow(shot.x - 100, 2) + Math.pow(shot.y - 100, 2));
        shot.ring = this.getRingFromDistance(dist);
        shot.direction = this.getDirectionFromCoords(shot.x, shot.y);
        shot.hit = this.isValidShot(shot.ring);
        shot.hit = this.isValidShot(shot.ring);
        const dirKey = `dir_${shot.direction}`;
        const dirText = t(dirKey);
        const msg = t('shot_moved')
          .replace('{n}', shot.shot)
          .replace('{r}', shot.ring)
          .replace('{d}', dirText);
        this.status(msg);
      }
    }
    this.isDragging = false;
    this.draggedShotId = null;
  }

getSVGCoords(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

handleTargetClick(event) {
    if (this.shots.length >= 5) {
      this.status(t('series_finished'));
      return;
    }
    const pt = this.getSVGCoords(event);
    const cx = pt.x;
    const cy = pt.y;
    const centerX = 100;
    const centerY = 100;
    const distance = Math.sqrt(Math.pow(cx - centerX, 2) + Math.pow(cy - centerY, 2));
    const ringNumber = this.getRingFromDistance(distance);
    const direction = this.getDirectionFromCoords(cx, cy);
    this.addHit(ringNumber, direction, cx, cy);
  }

getRingFromDistance(dist) {
    if (dist <= 10) return 10;
    if (dist > 100) return 0;
    return Math.floor(11 - dist / 10);
  }

getCoordsFromRingDirection(ring, direction) {
    const centerX = 100;
    const centerY = 100;
    let distance;
    if (ring === 0) {
      distance = 170;
    } else if (ring === 10) {
      distance = 5;
    } else {
      distance = (10 - ring) * 10 + 5;
    }
    let angle = 0;
    const dir = (direction || 'zentrum').toLowerCase().trim();
    if (dir.includes('zentrum') || dir.includes('center') || dir.includes('mitte')) {
      distance = 3;
    } else if (
      dir.includes('rechts hoch') ||
      (dir.includes('right') && (dir.includes('up') || dir.includes('top')))
    ) {
      angle = -45;
    } else if (
      dir.includes('hoch') ||
      dir.includes('oben') ||
      dir.includes('up') ||
      dir.includes('top')
    ) {
      angle = -90;
    } else if (
      dir.includes('links hoch') ||
      (dir.includes('left') && (dir.includes('up') || dir.includes('top')))
    ) {
      angle = -135;
    } else if (dir.includes('links') || dir.includes('left')) {
      angle = 180;
    } else if (
      dir.includes('links unten') ||
      (dir.includes('left') && (dir.includes('down') || dir.includes('bottom')))
    ) {
      angle = 135;
    } else if (
      dir.includes('unten') ||
      dir.includes('tief') ||
      dir.includes('down') ||
      dir.includes('bottom')
    ) {
      angle = 90;
    } else if (
      dir.includes('rechts unten') ||
      (dir.includes('right') && (dir.includes('down') || dir.includes('bottom')))
    ) {
      angle = 45;
    } else if (dir.includes('rechts') || dir.includes('right')) {
      angle = 0;
    } else if (dir.includes('außen') || dir.includes('miss')) {
      distance = 170;
    }
    const angleRad = (angle * Math.PI) / 180;
    const x = centerX + distance * Math.cos(angleRad);
    const y = centerY + distance * Math.sin(angleRad);
    return { x, y };
  }

setStance(stance) {
    this.stance = stance;
    const proneBtn = document.getElementById('btn-stance-prone');
    const standingBtn = document.getElementById('btn-stance-standing');
    const proneImg = document.getElementById('img-prone');
    const standingImg = document.getElementById('img-standing');
    if (stance === 'Liegend') {
      proneBtn?.classList.add('bg-white', 'border-2', 'border-primary', 'shadow-md');
      proneBtn?.classList.remove('bg-zinc-200/50', 'border', 'border-subtle');
      if (proneImg) {
        proneImg.classList.add('opacity-100');
        proneImg.classList.remove('opacity-40');
      }
      standingBtn?.classList.add('bg-zinc-200/50', 'border', 'border-subtle');
      standingBtn?.classList.remove('bg-white', 'border-2', 'border-primary', 'shadow-md');
      if (standingImg) {
        standingImg.classList.add('opacity-40');
        standingImg.classList.remove('opacity-100');
      }
    } else {
      standingBtn?.classList.add('bg-white', 'border-2', 'border-primary', 'shadow-md');
      standingBtn?.classList.remove('bg-zinc-200/50', 'border', 'border-subtle');
      if (standingImg) {
        standingImg.classList.add('opacity-100');
        standingImg.classList.remove('opacity-40');
      }
      proneBtn?.classList.add('bg-zinc-200/50', 'border', 'border-subtle');
      proneBtn?.classList.remove('bg-white', 'border-2', 'border-primary', 'shadow-md');
      if (proneImg) {
        proneImg.classList.add('opacity-40');
        proneImg.classList.remove('opacity-100');
      }
    }
    this.renderShots();
  }

updateClickDisplay() {
    if (!this.clickDisplay) {
      console.error('Click display element not found!');
      return;
    }
    let vPart = '';
    if (this.clicksX !== 0 || this.clicksY !== 0) {
      let parts = [];
      if (this.clicksX !== 0)
        parts.push(
          `${Math.abs(this.clicksX)}${this.clicksX > 0 ? t('right_short') : t('left_short')}`
        );
      if (this.clicksY !== 0)
        parts.push(
          `${Math.abs(this.clicksY)}${this.clicksY > 0 ? t('up_short') : t('down_short')}`
        );
      vPart = parts.join(' ');
    } else {
      vPart = '0';
    }
    console.log(`Updating click display: shots=${this.shots.length}, manual=${vPart}`);
    if (this.shots.length > 0) {
      const validShots = this.getFilteredShots();
      const realAvgX = validShots.reduce((sum, s) => sum + s.x, 0) / (validShots.length || 1);
      const realAvgY = validShots.reduce((sum, s) => sum + s.y, 0) / (validShots.length || 1);
      const corrH = Math.round((100 - realAvgX) / this.clickRatio);
      const corrV = Math.round((100 - realAvgY) / this.clickRatio);
      let kLabel = '';
      let kParts = [];
      if (corrH !== 0)
        kParts.push(`${Math.abs(corrH)}${corrH > 0 ? t('right_short') : t('left_short')}`);
      if (corrV !== 0)
        kParts.push(`${Math.abs(corrV)}${corrV > 0 ? t('up_short') : t('down_short')}`);
      kLabel = kParts.length > 0 ? kParts.join(' ') : 'OK';
      this.clickDisplay.innerHTML = `
                <div class="flex flex-col items-center justify-center">
                    <span class="text-sm font-black text-primary leading-tight">${kLabel}</span>
                    <div class="w-10 h-[2px] bg-zinc-700/80 my-1 rounded-full"></div>
                    <span class="text-xs font-bold text-off-white leading-tight">${vPart}</span>
                </div>`;
    } else {
      this.clickDisplay.innerHTML = `
                <div class="flex flex-col items-center justify-center">
                    <span class="text-lg font-black text-off-white leading-none">${vPart}</span>
                    <span class="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">${t('clicks')}</span>
                </div>`;
    }
  }

undoLastShot() {
    if (this.shots.length > 0) {
      this.shots.pop();
      if (this.shots.length === 0) {
        this.stopTimer();
        this.startTime = null;
      }
      this.resetSavedState();
      this.updateShotStats();
      this.renderAll();
    }
  }

switchAthlete(dir) {
    if (!this.session) return;
    const validSessionAthletes = (this.session.athletes || []).filter((id) =>
      this.allAthletes.some((a) => a.id === id)
    );
    const navList = [0, ...validSessionAthletes.filter((id) => id !== 0)];
    if (navList.length <= 1) return;
    let currentIndex = navList.indexOf(this.athleteId);
    if (currentIndex === -1) currentIndex = 0;
    let nextIndex = currentIndex + dir;
    if (nextIndex < 0) nextIndex = navList.length - 1;
    if (nextIndex >= navList.length) nextIndex = 0;
    const nextAthleteId = navList[nextIndex];
    window.location.href = `shooting.html?session=${this.sessionId}&athleteId=${nextAthleteId}&type=${this.type}`;
  }

goBack() {
    window.location.href = `session-detail.html?id=${this.sessionId}`;
  }

getDirectionFromCoords(x, y) {
    const centerX = 100;
    const centerY = 100;
    const dx = x - centerX;
    const dy = y - centerY;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg > 22.5 && angleDeg <= 67.5) return 'right_bottom';
    else if (angleDeg > 67.5 && angleDeg <= 112.5) return 'bottom';
    else if (angleDeg > 112.5 && angleDeg <= 157.5) return 'left_bottom';
    else if (angleDeg > 157.5 || angleDeg <= -157.5) return 'left';
    else if (angleDeg > -157.5 && angleDeg <= -112.5) return 'left_top';
    else if (angleDeg > -112.5 && angleDeg <= -67.5) return 'top';
    else if (angleDeg > -67.5 && angleDeg <= -22.5) return 'right_top';
    else if (angleDeg > -22.5 && angleDeg <= 22.5) return 'right';
    return 'center';
  }

addHit(ringNumber, direction, cx, cy) {
    const isValid = this.isValidShot(ringNumber);
    const isHit = ringNumber >= 1 && isValid;
    if (cx === undefined || cy === undefined) {
      const coords = this.getCoordsFromRingDirection(ringNumber, direction);
      cx = coords.x;
      cy = coords.y;
    }

if (this.shots.length === 0) {
      this.startTime = Date.now();
      this.startTimer();
    }
    const shot = {
      id: Date.now(),
      shot: this.shots.length + 1,
      ring: ringNumber,
      direction: direction,
      x: cx,
      y: cy,
      hit: isHit,
      timestamp: Date.now(),
    };
    this.shots.push(shot);
    this.updateShotStats();
    this.renderAll();
  }

isValidShot(ring) {
    if (this.stance === 'Liegend') return ring >= 8;
    return ring >= 3;
  }

status(msg) {
    const sm =
      document.getElementById('status-message') || document.getElementById('biathlon-status');
    if (sm) {
      sm.textContent = msg;
      if (!sm.classList.contains('font-bold')) {
        sm.classList.remove('text-neon-green');
        sm.classList.add('text-zinc-500');
      }
    } else console.log(msg);
  }

renderShots() {
    if (!this.shotsGroup) return;
    this.shotsGroup.innerHTML = '';
    this.shots.forEach((s) => {
      const color = s.hit ? '#32D74B' : '#FF453A';
      let renderX = s.x;
      let renderY = s.y;
      if (this.isGrouped) {
        const pullFactor = 0.5;
        const noise = () => (Math.random() - 0.5) * 4;
        renderX = s.x + (100 - s.x) * pullFactor + noise();
        renderY = s.y + (100 - s.y) * pullFactor + noise();
      }
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'shot-marker cursor-move');
      g.setAttribute('data-id', s.id);
      g.style.transition = 'all 0.4s ease-in-out';
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hitArea.setAttribute('cx', renderX);
      hitArea.setAttribute('cy', renderY);
      hitArea.setAttribute('r', '4');
      hitArea.setAttribute('fill', 'transparent');
      g.appendChild(hitArea);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', renderX);
      circle.setAttribute('cy', renderY);
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', '#FFFFFF');
      circle.setAttribute('stroke-width', '1.5');
      circle.setAttribute('pointer-events', 'none');
      g.appendChild(circle);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', renderX);
      text.setAttribute('y', renderY + 0.5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '7');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('pointer-events', 'none');
      text.textContent = s.shot;
      g.appendChild(text);
      this.shotsGroup.appendChild(g);
    });
  }

renderAll() {
    this.renderShots();
    this.renderGhostShots();
    this.setStance(this.stance);
    this.updateClickDisplay();
    this.updateCorrectionDisplay();
    this.updateFooterWindFlag();
  }

adjustClicks(dirX, dirY) {
    if (!this.showGhost) this.toggleGhost();
    this.clicksX += dirX;
    this.clicksY += dirY;
    this.avgX = 100 + this.clicksX * this.clickRatio;
    this.avgY = 100 - this.clicksY * this.clickRatio;
    this.resetSavedState();
    this.updateClickDisplay();
    this.renderAll();
  }

toggleGhost() {
    this.showGhost = !this.showGhost;
    const btn = document.getElementById('btn-toggle-ghost');
    if (this.showGhost) {
      btn?.classList.replace('text-zinc-500', 'text-primary');
      btn?.classList.add('bg-primary/20', 'border-primary/30');
      if (this.avgX === undefined) this.avgX = 100;
      if (this.avgY === undefined) this.avgY = 100;
    } else {
      btn?.classList.replace('text-primary', 'text-zinc-500');
      btn?.classList.remove('bg-primary/20', 'border-primary/30');
    }
    this.renderAll();
    this.renderAll();
    this.status(this.showGhost ? t('analysis_mode') : t('normal_mode'));
  }

toggleGrouping() {
    if (this.shots.length === 0) return;
    this.isGrouped = !this.isGrouped;
    const btn = document.getElementById('btn-group-shots');
    if (this.isGrouped) {
      btn?.classList.replace('text-zinc-400', 'text-blue-400');
      btn?.classList.add('bg-blue-400/10', 'border-blue-400/30');
    } else {
      btn?.classList.replace('text-blue-400', 'text-zinc-400');
      btn?.classList.remove('bg-blue-400/10', 'border-blue-400/30');
    }
    this.renderAll();
    this.renderAll();
    this.status(this.isGrouped ? t('shots_grouped') : t('normal_view'));
  }

openWindModal() {
    const modal = document.getElementById('wind-modal');
    const content = document.getElementById('wind-modal-content');
    const slider = document.getElementById('wind-slider');
    if (modal && content && slider) {
      slider.value = this.wind;
      this.handleWindSliderInput(this.wind);
      modal.classList.remove('opacity-0', 'pointer-events-none');
      content.classList.remove('scale-95');
    }
  }

closeWindModal() {
    const modal = document.getElementById('wind-modal');
    const content = document.getElementById('wind-modal-content');
    if (modal && content) {
      modal.classList.add('opacity-0', 'pointer-events-none');
      content.classList.add('scale-95');
    }
  }

handleWindSliderInput(value) {
    const val = parseInt(value);
    const display = document.getElementById('wind-strength-display');
    if (display) {
      let label = Math.abs(val).toString();
      if (val > 0) label += ` ${t('right_short')}`;
      if (val < 0) label += ` ${t('left_short')}`;
      display.textContent = label;
    }
    this.updateWindFlag(val);
  }

updateWindFlag(val) {
    const flag = document.getElementById('modal-flag-red');
    if (!flag) return;
    const absVal = Math.min(Math.abs(val), 10);
    const scaleX = val < 0 ? -1 : 1;
    const rotate = 90 - absVal * 9;
    flag.style.transform = `scaleX(${scaleX}) rotate(${rotate}deg)`;
  }

resetWind() {
    const slider = document.getElementById('wind-slider');
    if (slider) {
      slider.value = 0;
      this.handleWindSliderInput(0);
    }
  }

applyWind() {
    const slider = document.getElementById('wind-slider');
    if (slider) {
      this.wind = parseInt(slider.value);
      const sessions = JSON.parse(localStorage.getItem('sessions')) || [];
      const sessionIdx = sessions.findIndex((s) => s.id === this.sessionId);
      if (sessionIdx !== -1) {
        if (!sessions[sessionIdx].settings) sessions[sessionIdx].settings = {};
        sessions[sessionIdx].settings.wind = this.wind;
        localStorage.setItem('sessions', JSON.stringify(sessions));
      }
      this.updateFooterWindFlag();
      this.closeWindModal();
      const windDir = this.wind > 0 ? t('right_short') : t('left_short');
      const windLabel = this.wind !== 0 ? `${Math.abs(this.wind)} ${windDir}` : t('none');
      this.status(`${t('wind_adjusted')}: ${windLabel}`);
    }
  }

updateFooterWindFlag() {
    const btnWind = document.getElementById('btn-wind');
    if (!btnWind) return;
    const flag = btnWind.querySelector('.flag-element');
    if (!flag) return;
    const absVal = Math.min(Math.abs(this.wind), 10);
    const scaleX = this.wind < 0 ? -1 : 1;
    const rotate = 90 - absVal * 9;
    flag.style.transform = `scaleX(${scaleX}) rotate(${rotate}deg)`;
  }

getFilteredShots() {
    const OUTLIER_THRESHOLD = 30;
    let validShots = [...this.shots];
    let iteration = 0;
    const MAX_ITERATIONS = 3;
    while (iteration < MAX_ITERATIONS) {
      if (validShots.length === 0) break;
      const sumX = validShots.reduce((sum, shot) => sum + shot.x, 0);
      const sumY = validShots.reduce((sum, shot) => sum + shot.y, 0);
      const tempAvgX = sumX / validShots.length;
      const tempAvgY = sumY / validShots.length;
      const beforeCount = validShots.length;
      validShots = validShots.filter((shot) => {
        const distance = Math.sqrt(Math.pow(shot.x - tempAvgX, 2) + Math.pow(shot.y - tempAvgY, 2));
        return distance <= OUTLIER_THRESHOLD;
      });
      if (validShots.length === beforeCount) break;
      iteration++;
    }
    return validShots;
  }

renderGhostShots() {
    if (!this.ghostGroup) return;
    this.ghostGroup.innerHTML = '';
    if (!this.showGhost || this.shots.length === 0) return;
    const validShots = this.getFilteredShots();
    if (validShots.length === 0) return;
    const realAvgX = validShots.reduce((sum, s) => sum + s.x, 0) / validShots.length;
    const realAvgY = validShots.reduce((sum, s) => sum + s.y, 0) / validShots.length;
    const shiftX = this.avgX - 100;
    const shiftY = this.avgY - 100;
    validShots.forEach((s) => {
      const corrected_x = s.x - (realAvgX - 100) + shiftX;
      const corrected_y = s.y - (realAvgY - 100) + shiftY;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'correction-mark');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', corrected_x);
      circle.setAttribute('cy', corrected_y);
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', '#007AFF');
      circle.setAttribute('fill-opacity', '0.7');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '1');
      circle.setAttribute('pointer-events', 'none');
      g.appendChild(circle);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', corrected_x);
      text.setAttribute('y', corrected_y + 0.5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '6');
      text.setAttribute('font-weight', '900');
      text.setAttribute('pointer-events', 'none');
      text.textContent = s.shot;
      g.appendChild(text);
      this.ghostGroup.appendChild(g);
    });
  }

updateCorrectionDisplay() {
    const textEl = document.getElementById('correction-text');
    if (!textEl) return;
    const validShots = this.getFilteredShots();
    if (validShots.length === 0) {
      textEl.textContent = '';
      return;
    }
    const realAvgX = validShots.reduce((sum, s) => sum + s.x, 0) / validShots.length;
    const realAvgY = validShots.reduce((sum, s) => sum + s.y, 0) / validShots.length;
    const corrH = Math.round((100 - realAvgX) / this.clickRatio);
    const corrV = Math.round((100 - realAvgY) / this.clickRatio);
    let parts = [];
    let kPart = t('correction');
    let kSub = [];
    if (corrH !== 0)
      kSub.push(`${Math.abs(corrH)} ${corrH > 0 ? t('right_short') : t('left_short')}`);
    if (corrV !== 0) kSub.push(`${Math.abs(corrV)} ${corrV > 0 ? t('up_short') : t('down_short')}`);
    kPart += kSub.length > 0 ? kSub.join(' • ') : 'OK';
    textEl.textContent = kPart;
    this.status(kPart);
  }

save() {
    if (this.shots.length === 0) {
      this.status(t('no_shots_save'));
      return;
    }
    const sessions = JSON.parse(localStorage.getItem('sessions')) || [];
    const sessionIdx = sessions.findIndex((s) => s.id === this.sessionId);
    if (sessionIdx === -1) {
      this.status(t('session_not_found'));
      return;
    }
    const hitCount = this.shots.filter((s) => s.hit).length;
    const totalRings = this.shots.reduce((sum, s) => sum + s.ring, 0);
    const avgRing = Math.round((totalRings / (this.shots.length || 1)) * 10) / 10;
    let offset = 0;
    if (this.athlete) {
      const useDefaults = this.athlete.hasOwnProperty('useDefaultTimes')
        ? this.athlete.useDefaultTimes
        : true;
      if (useDefaults) {
        const defProne = parseInt(localStorage.getItem('b_default_time_prone') || '20');
        const defStanding = parseInt(localStorage.getItem('b_default_time_standing') || '15');
        offset = this.stance === 'Liegend' ? defProne : defStanding;
      } else {
        offset =
          this.stance === 'Liegend'
            ? this.athlete.proneTimeAdd || 0
            : this.athlete.standingTimeAdd || 0;
      }
    } else {
      const defProne = parseInt(localStorage.getItem('b_default_time_prone') || '20');
      const defStanding = parseInt(localStorage.getItem('b_default_time_standing') || '15');
      offset = this.stance === 'Liegend' ? defProne : defStanding;
    }
    const rawDurationMs = this.startTime
      ? this.shots[this.shots.length - 1].timestamp - this.startTime
      : 0;
    const adjustedDurationMs = rawDurationMs + offset * 1000;
    const newSeries = {
      id: this.seriesId || Date.now(),
      athleteId: this.athleteId,
      athleteName: this.athlete ? this.athlete.name : 'Unknown',
      type: this.type,
      stance: this.stance,
      clicksX: this.clicksX,
      clicksY: this.clicksY,
      wind: this.wind,
      shots: this.shots,
      totalTime: this.startTime ? this.formatTime(rawDurationMs) : '00:00.0',
      rangeTime: this.formatTime(adjustedDurationMs),
      timeOffset: offset,
      splits: this.shots.map((s, i) => {
        if (i === 0) return 'Start';
        const diff = s.timestamp - this.shots[i - 1].timestamp;
        return `+${(diff / 1000).toFixed(1)}s`;
      }),
      stats: {
        hitCount,
        totalShots: this.shots.length,
        totalRings,
        avgRing,
      },
      timestamp: new Date().toISOString(),
    };
    if (!sessions[sessionIdx].series) sessions[sessionIdx].series = [];
    if (this.seriesId) {
      const sIdx = sessions[sessionIdx].series.findIndex((s) => s.id === this.seriesId);
      if (sIdx !== -1) {
        sessions[sessionIdx].series[sIdx] = newSeries;
      } else {
        sessions[sessionIdx].series.push(newSeries);
      }
      this.series = newSeries;
      this.seriesId = newSeries.id;
    } else {
      sessions[sessionIdx].series.push(newSeries);
      this.series = newSeries;
      this.seriesId = newSeries.id;
    }
    localStorage.setItem('sessions', JSON.stringify(sessions));
    this.showSuccessToast();
    if (this.typeLabel) {
      const container = this.typeLabel.parentElement;
      container.classList.remove('bg-yellow-500/10', 'bg-zinc-500/10');
      container.classList.add('bg-neon-green/20', 'border-neon-green/40');
      this.typeLabel.classList.add('text-neon-green');
      this.typeLabel.classList.remove('text-yellow-500', 'text-off-white/90');
    }
    const sm =
      document.getElementById('status-message') || document.getElementById('biathlon-status');
    if (sm) {
      sm.classList.add('text-neon-green', 'font-bold');
      sm.textContent = 'Serie erfolgreich gespeichert!';
    }
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
      const icon = saveBtn.querySelector('span');
      if (icon) icon.textContent = 'check_circle';
      saveBtn.classList.remove('bg-blue-500', 'shadow-blue-500/30');
      saveBtn.classList.add('bg-neon-green', 'shadow-neon-green/30');
    }
    this.shots = [];
    this.stopTimer();
    this.startTime = null;
    this.updateShotStats();
    this.renderAll();
  }

resetSavedState() {
    if (this.typeLabel) {
      const container = this.typeLabel.parentElement;
      const isZeroing = this.type === 'zeroing';
      this.typeLabel.classList.remove('text-neon-green');
      container.classList.remove('bg-neon-green/20', 'border-neon-green/40');
      if (isZeroing) {
        this.typeLabel.classList.add('text-yellow-500');
        container.classList.add('bg-yellow-500/10', 'border-yellow-500/30');
      } else {
        this.typeLabel.classList.add('text-off-white/90');
        container.classList.add('border-subtle');
      }
    }
    const sm =
      document.getElementById('status-message') || document.getElementById('biathlon-status');
    if (sm) {
      sm.classList.remove('text-neon-green', 'font-bold');
      sm.classList.add('text-zinc-500');
    }
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
      const icon = saveBtn.querySelector('span');
      if (icon) icon.textContent = 'save';
      saveBtn.classList.remove('bg-neon-green', 'shadow-neon-green/30');
      saveBtn.classList.add('bg-blue-500', 'shadow-blue-500/30');
    }

if (this.shots.length === 0) {
      this.stopTimer();
      this.startTime = null;
      this.updateShotStats();
    }
  }

showSuccessToast() {
    const toast = document.getElementById('success-toast');
    if (!toast) return;
    toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-[-20px]');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-[-20px]');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 2000);
  }

startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.startTime) {
        const totalDisplay = document.getElementById('total-time-display');
        if (totalDisplay) {
          const diff = Date.now() - this.startTime;
          totalDisplay.textContent = this.formatTime(diff);
        }
      }
    }, 100);
  }

stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const dec = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${dec}`;
  }

updateShotStats() {
    const container = document.getElementById('shot-stats-container');
    const countDisplay = document.getElementById('shot-count-display');
    const splitsList = document.getElementById('splits-list');
    const totalDisplay = document.getElementById('total-time-display');
    if (!container) return;
    if (this.shots.length === 0) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    countDisplay.textContent = `${this.shots.length}/5`;
    if (this.shots.length >= 5) {
      this.stopTimer();
      const total = this.shots[this.shots.length - 1].timestamp - this.startTime;
      totalDisplay.textContent = this.formatTime(total);
    } else if (this.startTime && !this.timerInterval) {
      this.startTimer();
    }
  }

setupVoiceInput() {
    if (typeof VoiceShotInput === 'undefined') {
      console.warn('VoiceShotInput not available');
      const micBtn = document.getElementById('btn-mic');
      if (micBtn) {
        micBtn.style.opacity = '0.3';
        micBtn.style.pointerEvents = 'none';
      }
      return;
    }
    this.voiceInput = new VoiceShotInput();
    if (!this.voiceInput.isSupported()) {
      console.warn('Speech recognition not supported');
      const micBtn = document.getElementById('btn-mic');
      if (micBtn) {
        micBtn.style.opacity = '0.3';
        micBtn.style.pointerEvents = 'none';
      }
      return;
    }
    this.voiceInput.onShotDetected = (ring, direction) => {
      if (this.shots.length >= 5) {
        this.status(t('series_finished'));
        return;
      }
      this.addHit(ring, direction);
    };
    this.voiceInput.onCommandDetected = (command, param) => {
      if (command === 'miss') {
        if (this.shots.length >= 5) {
          this.status(t('series_finished'));
          return;
        }
        this.addHit(0, 'außen', 170, 100);
        return;
      }

if (command === 'undo') {
        this.undoLastShot();
        return;
      }

if (command === 'stance_prone') {
        this.setStance('Liegend');
        this.status(appLang === 'de' ? 'Haltung: Liegend' : 'Stance: Prone');
        return;
      }

if (command === 'stance_standing') {
        this.setStance('Stehend');
        this.status(appLang === 'de' ? 'Haltung: Stehend' : 'Stance: Standing');
        return;
      }
      const appLang = localStorage.getItem('b_language') || 'de';
      const count = param || 1;
      if (command === 'adjust_up') {
        for (let i = 0; i < count; i++) this.adjustClicks(0, 1);
        this.status(`${count}x ${appLang === 'de' ? 'Hoch' : 'Up'}`);
        return;
      }

if (command === 'adjust_down') {
        for (let i = 0; i < count; i++) this.adjustClicks(0, -1);
        this.status(`${count}x ${appLang === 'de' ? 'Runter' : 'Down'}`);
        return;
      }

if (command === 'adjust_left') {
        for (let i = 0; i < count; i++) this.adjustClicks(-1, 0);
        this.status(`${count}x ${appLang === 'de' ? 'Links' : 'Left'}`);
        return;
      }

if (command === 'adjust_right') {
        for (let i = 0; i < count; i++) this.adjustClicks(1, 0);
        this.status(`${count}x ${appLang === 'de' ? 'Rechts' : 'Right'}`);
        return;
      }

if (command === 'reset_clicks') {
        this.clicksX = 0;
        this.clicksY = 0;
        this.avgX = 100;
        this.avgY = 100;
        this.updateClickDisplay();
        this.renderAll();
        this.status(appLang === 'de' ? 'Klicks zurückgesetzt' : 'Clicks reset');
        return;
      }

if (command === 'ghost_on') {
        if (!this.showGhost) this.toggleGhost();
        return;
      }

if (command === 'ghost_off') {
        if (this.showGhost) this.toggleGhost();
        return;
      }

if (command === 'ghost_toggle') {
        this.toggleGhost();
        return;
      }

if (command === 'toggle_grouping') {
        this.toggleGrouping();
        return;
      }

if (command === 'set_wind') {
        this.wind = param;
        this.updateWindDisplay();
        this.status(`Wind: ${param}`);
        return;
      }

if (command === 'open_wind') {
        this.openWindModal();
        return;
      }

if (command === 'save') {
        this.save();
        return;
      }

if (command === 'next_athlete') {
        this.switchAthlete(1);
        return;
      }

if (command === 'prev_athlete') {
        this.switchAthlete(-1);
        return;
      }

if (command === 'go_back') {
        this.goBack();
        return;
      }
    };
    this.voiceInput.onStatusChange = (status, error) => {
      const micBtn = document.getElementById('btn-mic');
      if (!micBtn) return;
      if (status === 'recording') {
        micBtn.classList.add('text-neon-cyan');
        micBtn.classList.remove('text-zinc-400');
        micBtn.style.position = 'relative';
        if (!document.getElementById('mic-pulse')) {
          const pulse = document.createElement('div');
          pulse.id = 'mic-pulse';
          pulse.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 100%;
                        height: 100%;
                        border: 2px solid #ff3b30;
                        border-radius: 50%;
                        transform: translate(-50%, -50%);
                        animation: micPulse 1.5s ease-in-out infinite;
                        pointer-events: none;
                    `;
          micBtn.appendChild(pulse);
          if (!document.getElementById('mic-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'mic-pulse-style';
            style.textContent = `
                            @keyframes micPulse {
                                0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                                50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.4; }
                                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                            }
                        `;
            document.head.appendChild(style);
          }
        }
        this.status(t('voice_recording'));
      } else {
        micBtn.classList.remove('text-neon-cyan');
        micBtn.classList.add('text-zinc-400');
        const pulse = document.getElementById('mic-pulse');
        if (pulse) pulse.remove();
        if (status === 'stopped') {
          this.status(t('voice_stopped'));
        } else if (status === 'error') {
          console.error('Voice error:', error);
        }
      }
    };
  }

toggleVoice() {
    if (!this.voiceInput || !this.voiceInput.isSupported()) {
      this.status(t('voice_not_supported'));
      return;
    }
    this.voiceInput.toggle();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  window.shootingApp = new ShootingPage();
});