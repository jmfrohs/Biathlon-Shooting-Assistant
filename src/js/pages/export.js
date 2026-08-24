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

class ExportPage {
  constructor() {
    this.exportType = 'pdf';
    this.sessions = [];
    this.athletes = [];
    this.selectedSessionIds = new Set();

    this.sessionsList = document.getElementById('sessions-list');
    this.emptyState = document.getElementById('export-empty');
    this.selectAllBtn = document.getElementById('btn-select-all');
    this.clearSelectionBtn = document.getElementById('btn-clear-selection');
    this.exportBtn = document.getElementById('btn-export');
    this.exportBtnText = document.getElementById('btn-export-text');
    this.footerExportLabel = document.getElementById('footer-export-label');
    this.selectionHint = document.getElementById('selection-hint');
    this.selectionCount = document.getElementById('footer-selection-count');
    this.sessionCountEl = document.getElementById('summary-session-count');
    this.athleteCountEl = document.getElementById('summary-athlete-count');
    this.seriesCountEl = document.getElementById('summary-series-count');
    this.exportTypeLabel = document.getElementById('selected-export-type');
    this.typeButtons = Array.from(document.querySelectorAll('.export-type-btn'));
    this.toast = document.getElementById('status-toast');
    this.toastText = document.getElementById('status-text');

    this.copy = this.getCopy();
    this.init();
  }

  getCopy() {
    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    const isDe = lang === 'de';

    return {
      exportType: isDe ? 'Export-Typ' : 'Export type',
      trainingUnits: isDe ? 'Trainingseinheiten' : 'Training units',
      selected: isDe ? 'ausgewählt' : 'selected',
      all: isDe ? 'Alle' : 'All',
      clear: isDe ? 'Leeren' : 'Clear',
      noUnits: isDe
        ? 'Noch keine Trainingseinheiten vorhanden.'
        : 'No training units available yet.',
      exportPdf: isDe ? 'PDF Export' : 'Export PDF',
      exportExcel: isDe ? 'Excel Export' : 'Export Excel',
      selectedPdf: 'PDF',
      selectedExcel: 'Excel',
      units: isDe ? 'Einheiten' : 'Units',
      athletes: isDe ? 'Athleten' : 'Athletes',
      series: isDe ? 'Serien' : 'Series',
      overview: isDe ? 'Gesamtübersicht' : 'Overall overview',
      sessions: isDe ? 'Einheitenübersicht' : 'Session overview',
      athleteOverview: isDe ? 'Athletenübersicht' : 'Athlete overview',
      athleteDetail: isDe ? 'Athlet' : 'Athlete',
      session: isDe ? 'Einheit' : 'Unit',
      date: isDe ? 'Datum' : 'Date',
      location: isDe ? 'Ort' : 'Location',
      type: isDe ? 'Typ' : 'Type',
      hits: isDe ? 'Treffer' : 'Hits',
      shots: isDe ? 'Schuesse' : 'Shots',
      hitRate: isDe ? 'Quote (%)' : 'Hit rate (%)',
      time: isDe ? 'Zeit' : 'Time',
      seriesLabel: isDe ? 'Serie' : 'Series',
      selectedUnits: isDe ? 'Ausgewählte Einheiten' : 'Selected units',
      exporting: isDe ? 'Export wird erstellt...' : 'Preparing export...',
      exportReady: isDe ? 'Exportieren' : 'Export',
      selectAll: isDe ? 'Alle' : 'All',
      clearSelection: isDe ? 'Leeren' : 'Clear',
      noSelection: isDe
        ? 'Bitte mindestens eine Trainingseinheit auswählen.'
        : 'Please select at least one training unit.',
      pdfFailed: isDe ? 'Fehler beim PDF-Export' : 'Error exporting PDF',
      excelFailed: isDe ? 'Fehler beim Excel-Export' : 'Error exporting Excel',
      noData: isDe ? 'Keine Trainingsdaten gefunden.' : 'No training data found.',
    };
  }

  async init() {
    this.bindEvents();
    await this.loadData();
    this.setExportType(this.exportType);
  }

  bindEvents() {
    this.typeButtons.forEach((button) => {
      button.addEventListener('click', () => this.setExportType(button.dataset.exportType));
    });

    this.selectAllBtn?.addEventListener('click', () => {
      this.selectedSessionIds = new Set(this.sessions.map((session) => String(session.id)));
      this.renderSessions();
      this.updateSummary();
    });

    this.clearSelectionBtn?.addEventListener('click', () => {
      this.selectedSessionIds = new Set();
      this.renderSessions();
      this.updateSummary();
    });

    this.exportBtn?.addEventListener('click', () => this.exportSelected());

    this.sessionsList?.addEventListener('change', (event) => {
      const target = event.target;
      if (!target || !target.matches('[data-session-checkbox]')) return;
      const sessionId = String(target.value);
      if (target.checked) {
        this.selectedSessionIds.add(sessionId);
      } else {
        this.selectedSessionIds.delete(sessionId);
      }
      this.renderSessions();
      this.updateSummary();
    });
  }

  async loadData() {
    let sessions = [];
    let athletes = [];

    try {
      [sessions, athletes] = await Promise.all([
        apiService.getSessions(),
        apiService.getAthletes(),
      ]);
    } catch (error) {
      sessions = this.getLocalCollection('sessions', 'b_sessions');
      athletes = this.getLocalCollection('athletes', 'b_athletes');
    }

    this.sessions = (Array.isArray(sessions) ? sessions : [])
      .slice()
      .sort((left, right) => this.compareSessions(right, left));
    this.athletes = Array.isArray(athletes) ? athletes : [];

    if (this.selectedSessionIds.size === 0) {
      this.selectedSessionIds = new Set(this.sessions.map((session) => String(session.id)));
    }

    this.renderSessions();
    this.updateSummary();
  }

  getLocalCollection(...keys) {
    try {
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (error) {
      console.warn('[Export] Failed to read local collection:', error.message);
    }

    return [];
  }

  compareSessions(left, right) {
    const leftDate = this.parseDate(left?.date)?.getTime() || 0;
    const rightDate = this.parseDate(right?.date)?.getTime() || 0;

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    const leftName = String(left?.name || '').toLowerCase();
    const rightName = String(right?.name || '').toLowerCase();
    if (leftName !== rightName) {
      return leftName.localeCompare(rightName);
    }

    return Number(left?.id || 0) - Number(right?.id || 0);
  }

  parseDate(value) {
    if (!value) return null;
    let normalized = value;

    if (typeof value === 'string' && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) {
      const [day, month, year] = value.split('.');
      normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  formatDate(value) {
    const parsed = this.parseDate(value);
    if (!parsed) return '-';
    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    return parsed.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTime(value) {
    const parsed = this.parseDate(value);
    if (!parsed) return '-';
    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    return parsed.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  setExportType(type) {
    this.exportType = type === 'excel' ? 'excel' : 'pdf';

    this.typeButtons.forEach((button) => {
      const isActive = button.dataset.exportType === this.exportType;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('bg-primary/10', isActive);
      button.classList.toggle('border-primary/30', isActive);
      button.classList.toggle('text-primary', isActive);
      button.classList.toggle('bg-card-dark', !isActive);
      button.classList.toggle('border-subtle', !isActive);
      button.classList.toggle('text-light-blue-info', !isActive);
    });

    if (this.exportTypeLabel) {
      this.exportTypeLabel.textContent =
        this.exportType === 'excel' ? this.copy.selectedExcel : this.copy.selectedPdf;
    }

    if (this.footerExportLabel) {
      this.footerExportLabel.textContent =
        this.exportType === 'excel' ? 'EXCEL EXPORT' : 'PDF EXPORT';
    }

    if (this.exportBtnText) {
      this.exportBtnText.textContent =
        this.exportType === 'excel' ? this.copy.exportExcel : this.copy.exportPdf;
    }
  }

  getSelectedSessions() {
    return this.sessions.filter((session) => this.selectedSessionIds.has(String(session.id)));
  }

  resolveAthlete(session, athleteId) {
    if (athleteId == null) return null;
    if (String(athleteId) === '0') {
      return { id: 0, name: 'Neutral', ageGroup: '-' };
    }

    const fromAthletes = this.athletes.find((athlete) => String(athlete.id) === String(athleteId));
    if (fromAthletes) return fromAthletes;

    if (Array.isArray(session.athleteData)) {
      const fromSession = session.athleteData.find(
        (athlete) => String(athlete.id) === String(athleteId)
      );
      if (fromSession) return fromSession;
    }

    return { id: athleteId, name: `Unknown #${athleteId}`, ageGroup: '-' };
  }

  getSessionAthletes(session) {
    const athleteMap = new Map();
    const sources = [];

    if (Array.isArray(session.athleteData)) {
      sources.push(...session.athleteData);
    }

    if (Array.isArray(session.athletes)) {
      session.athletes.forEach((athleteId) => {
        const athlete = this.resolveAthlete(session, athleteId);
        if (athlete) sources.push(athlete);
      });
    }

    (session.series || []).forEach((seriesEntry) => {
      const athlete = this.resolveAthlete(session, seriesEntry.athleteId);
      if (athlete) sources.push(athlete);
    });

    sources.forEach((athlete) => {
      if (!athlete || athlete.id == null) return;
      athleteMap.set(String(athlete.id), athlete);
    });

    return [...athleteMap.values()].sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''))
    );
  }

  getSeriesStats(seriesEntry) {
    const shots = Array.isArray(seriesEntry?.shots) ? seriesEntry.shots : [];
    const hits =
      seriesEntry?.stats?.hitCount ||
      shots.filter((shot) => shot && (shot.hit === true || shot.hit === 1)).length;
    const total = seriesEntry?.stats?.totalShots || shots.length;
    const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { hits, total, hitRate };
  }

  buildExportModel(sessions) {
    const athleteMap = new Map();
    const sessionRows = [];

    sessions.forEach((session) => {
      const sessionAthletes = this.getSessionAthletes(session);
      const seriesEntries = Array.isArray(session.series) ? session.series : [];
      const sessionTotals = seriesEntries.reduce(
        (acc, seriesEntry) => {
          const stats = this.getSeriesStats(seriesEntry);
          acc.hits += stats.hits;
          acc.total += stats.total;
          acc.seriesCount += 1;
          return acc;
        },
        { hits: 0, total: 0, seriesCount: 0 }
      );

      const hitRate =
        sessionTotals.total > 0 ? Math.round((sessionTotals.hits / sessionTotals.total) * 100) : 0;
      sessionRows.push({
        session,
        athletes: sessionAthletes,
        seriesCount: sessionTotals.seriesCount,
        hits: sessionTotals.hits,
        total: sessionTotals.total,
        hitRate,
      });

      seriesEntries.forEach((seriesEntry) => {
        const athlete = this.resolveAthlete(session, seriesEntry.athleteId);
        if (!athlete) return;

        const key = String(athlete.id);
        if (!athleteMap.has(key)) {
          athleteMap.set(key, {
            athlete,
            seriesEntries: [],
            totals: { hits: 0, total: 0, sessions: new Set() },
          });
        }

        const entryStats = this.getSeriesStats(seriesEntry);
        const bucket = athleteMap.get(key);
        bucket.seriesEntries.push({
          session,
          seriesEntry,
          stats: entryStats,
          index: bucket.seriesEntries.length + 1,
        });
        bucket.totals.hits += entryStats.hits;
        bucket.totals.total += entryStats.total;
        bucket.totals.sessions.add(String(session.id));
      });
    });

    const athleteEntries = [...athleteMap.values()]
      .map((entry) => ({
        ...entry,
        seriesEntries: entry.seriesEntries.sort((left, right) => {
          const leftTime = this.parseDate(left.seriesEntry?.timestamp)?.getTime() || 0;
          const rightTime = this.parseDate(right.seriesEntry?.timestamp)?.getTime() || 0;
          return leftTime - rightTime;
        }),
        totals: {
          hits: entry.totals.hits,
          total: entry.totals.total,
          sessions: [...entry.totals.sessions],
        },
      }))
      .sort((left, right) =>
        String(left.athlete?.name || '').localeCompare(String(right.athlete?.name || ''))
      );

    return { sessionRows, athleteEntries };
  }

  renderSessions() {
    if (!this.sessionsList) return;

    if (this.sessions.length === 0) {
      if (this.emptyState) this.emptyState.classList.remove('hidden');
      this.sessionsList.innerHTML = '';
      return;
    }

    if (this.emptyState) this.emptyState.classList.add('hidden');

    const groups = new Map();
    this.sessions.forEach((session) => {
      const parsedDate = this.parseDate(session.date);
      const groupKey = parsedDate ? parsedDate.toISOString().slice(0, 10) : 'unknown';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { date: parsedDate, sessions: [] });
      }
      groups.get(groupKey).sessions.push(session);
    });

    const sortedGroups = [...groups.values()].sort((left, right) => {
      const leftTime = left.date ? left.date.getTime() : 0;
      const rightTime = right.date ? right.date.getTime() : 0;
      return rightTime - leftTime;
    });

    this.sessionsList.innerHTML = sortedGroups
      .map((group) => {
        const dateLabel = group.date
          ? group.date.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'Unknown date';

        const cards = group.sessions.map((session) => this.renderSessionCard(session)).join('');

        return `
          <div class="space-y-2">
            <div class="px-1">
              <span class="text-[11px] font-black uppercase tracking-[0.2em] text-light-blue-info/70">${dateLabel}</span>
            </div>
            <div class="space-y-3">${cards}</div>
          </div>
        `;
      })
      .join('');

    this.updateSummary();
  }

  renderSessionCard(session) {
    const selected = this.selectedSessionIds.has(String(session.id));
    const athletes = this.getSessionAthletes(session);
    const seriesEntries = Array.isArray(session.series) ? session.series : [];
    const typeColors = {
      training: 'bg-primary/15 text-primary border-primary/30',
      competition: 'bg-neon-green/15 text-neon-green border-neon-green/30',
      test_competition: 'bg-neon-orange/15 text-neon-orange border-neon-orange/30',
      other: 'bg-neon-orange/15 text-neon-orange border-neon-orange/30',
      testing: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30',
    };
    const activeColor = typeColors[session.type] || typeColors.training;
    const isDe = (typeof getLanguage === 'function' ? getLanguage() : 'en') === 'de';

    const athleteLabel =
      athletes.length === 1 ? (isDe ? 'Athlet' : 'Athlete') : isDe ? 'Athleten' : 'Athletes';
    const seriesLabel =
      seriesEntries.length === 1 ? (isDe ? 'Serie' : 'Series') : isDe ? 'Serien' : 'Series';

    return `
      <label class="block bg-card-dark rounded-2xl p-4 border ${
        selected
          ? 'border-primary/80 bg-primary/10 shadow-md shadow-primary/5'
          : 'border-subtle/70 bg-card-dark/90 hover:border-white/20'
      } cursor-pointer active:scale-[0.98] transition-all">
          <input
            type="checkbox"
            class="sr-only"
            data-session-checkbox
            value="${session.id}"
            ${selected ? 'checked' : ''}
          />
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-1.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 border ${activeColor} text-[10px] font-bold uppercase rounded-md tracking-wider">
                  ${this.escapeHtml(this.getSessionTypeLabel(session.type))}
                </span>
                <h3 class="text-base font-bold text-off-white tracking-tight truncate">
                  ${this.escapeHtml(session.name || 'Session')}
                </h3>
              </div>
              <div class="flex items-center gap-3 text-xs font-medium text-light-blue-info/70 flex-wrap">
                ${
                  session.location
                    ? `<div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">location_on</span>
                        <span class="truncate">${this.escapeHtml(session.location)}</span>
                      </div>`
                    : ''
                }
                <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">groups</span>
                  <span>${athletes.length} ${athleteLabel}</span>
                </div>
                ${
                  seriesEntries.length
                    ? `<div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">reorder</span>
                        <span>${seriesEntries.length} ${seriesLabel}</span>
                      </div>`
                    : ''
                }
              </div>
            </div>
            <div class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all ${
              selected
                ? 'bg-primary text-white shadow-sm'
                : 'border-2 border-subtle/80 bg-off-white/5 text-transparent'
            }">
              <span class="material-symbols-outlined text-sm font-bold">check</span>
            </div>
          </div>
      </label>
    `;
  }

  updateSummary() {
    const selectedSessions = this.getSelectedSessions();
    const athleteIds = new Set();
    let seriesCount = 0;

    selectedSessions.forEach((session) => {
      this.getSessionAthletes(session).forEach((athlete) => athleteIds.add(String(athlete.id)));
      seriesCount += Array.isArray(session.series) ? session.series.length : 0;
    });

    if (this.sessionCountEl) this.sessionCountEl.textContent = String(selectedSessions.length);
    if (this.athleteCountEl) this.athleteCountEl.textContent = String(athleteIds.size);
    if (this.seriesCountEl) this.seriesCountEl.textContent = String(seriesCount);

    const count = selectedSessions.length;
    const isDe = (typeof getLanguage === 'function' ? getLanguage() : 'en') === 'de';
    const unitText = count === 1 ? (isDe ? 'Einheit' : 'unit') : isDe ? 'Einheiten' : 'units';
    const label = `${count} ${unitText} ${isDe ? 'ausgewählt' : 'selected'}`;

    if (this.selectionHint) this.selectionHint.textContent = label;
    if (this.selectionCount) this.selectionCount.textContent = label;

    const hasSelection = count > 0;
    if (this.exportBtn) {
      this.exportBtn.disabled = !hasSelection;
      this.exportBtn.classList.toggle('opacity-40', !hasSelection);
      this.exportBtn.classList.toggle('cursor-not-allowed', !hasSelection);
    }
  }

  exportSelected() {
    const selectedSessions = this.getSelectedSessions();
    if (selectedSessions.length === 0) {
      alert(this.copy.noSelection);
      return;
    }

    if (this.exportType === 'excel') {
      this.exportToExcel(selectedSessions);
      return;
    }

    this.exportToPdf(selectedSessions);
  }

  autoTable(doc, options) {
    const autoTableFn =
      doc.autoTable || (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.autoTable);
    if (typeof autoTableFn !== 'function') {
      throw new Error('PDF AutoTable plugin not loaded');
    }
    autoTableFn.call(doc, options);
  }

  exportToPdf(sessions) {
    try {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library not loaded');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const model = this.buildExportModel(sessions);
      const exportDate = new Date().toLocaleDateString();

      doc.setFontSize(20);
      doc.setTextColor(0, 122, 255);
      doc.text('Biathlon Shooting Assistant', 14, 18);

      doc.setFontSize(14);
      doc.setTextColor(20);
      doc.text(this.copy.overview, 14, 28);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Export date: ${exportDate}`, 14, 35);
      doc.text(
        `Units: ${model.sessionRows.length} | Athletes: ${model.athleteEntries.length}`,
        14,
        41
      );

      this.autoTable(doc, {
        head: [
          [
            this.copy.session,
            this.copy.date,
            this.copy.location,
            this.copy.type,
            this.copy.seriesLabel,
            this.copy.hits,
            this.copy.shots,
            this.copy.hitRate,
          ],
        ],
        body: model.sessionRows.map((row) => [
          row.session.name || '-',
          this.formatDate(row.session.date),
          row.session.location || '-',
          this.getSessionTypeLabel(row.session.type),
          String(row.seriesCount),
          String(row.hits),
          String(row.total),
          `${row.hitRate}%`,
        ]),
        startY: 48,
        headStyles: { fillColor: [0, 122, 255] },
      });

      const athleteOverviewY = (doc.lastAutoTable?.finalY || 48) + 8;
      this.autoTable(doc, {
        head: [
          [
            this.copy.athleteDetail,
            'Class',
            this.copy.session,
            this.copy.seriesLabel,
            this.copy.hits,
            this.copy.shots,
            this.copy.hitRate,
          ],
        ],
        body: model.athleteEntries.map((entry) => {
          const hitRate =
            entry.totals.total > 0 ? Math.round((entry.totals.hits / entry.totals.total) * 100) : 0;
          return [
            entry.athlete?.name || '-',
            entry.athlete?.ageGroup || '-',
            String(entry.totals.sessions.length),
            String(entry.seriesEntries.length),
            String(entry.totals.hits),
            String(entry.totals.total),
            `${hitRate}%`,
          ];
        }),
        startY: athleteOverviewY,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 50] },
      });

      model.athleteEntries.forEach((entry, index) => {
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(0, 122, 255);
        doc.text(entry.athlete?.name || 'Athlete', 14, 18);

        doc.setFontSize(10);
        doc.setTextColor(90);
        doc.text(
          `${entry.athlete?.ageGroup || '-'} | ${this.copy.selectedUnits}: ${entry.totals.sessions.length}`,
          14,
          26
        );

        this.autoTable(doc, {
          head: [
            [
              this.copy.session,
              this.copy.date,
              this.copy.location,
              this.copy.type,
              this.copy.seriesLabel,
              this.copy.hits,
              this.copy.shots,
              this.copy.hitRate,
              'Timestamp',
              this.copy.time,
            ],
          ],
          body: entry.seriesEntries.map((seriesRow) => {
            const stats = seriesRow.stats;
            return [
              seriesRow.session.name || '-',
              this.formatDate(seriesRow.session.date),
              seriesRow.session.location || '-',
              this.getSessionTypeLabel(seriesRow.session.type),
              String(seriesRow.index),
              String(stats.hits),
              String(stats.total),
              `${stats.hitRate}%`,
              this.formatDateTime(seriesRow.seriesEntry?.timestamp),
              seriesRow.seriesEntry?.rangeTime || seriesRow.seriesEntry?.totalTime || '-',
            ];
          }),
          startY: 32,
          theme: 'striped',
          headStyles: { fillColor: [0, 122, 255] },
          styles: { fontSize: 8 },
        });
      });

      doc.save(`Biathlon_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert(this.copy.pdfFailed);
    }
  }

  exportToExcel(sessions) {
    try {
      if (typeof XLSX === 'undefined') {
        alert('Excel library not loaded');
        return;
      }

      const model = this.buildExportModel(sessions);
      const workbook = XLSX.utils.book_new();
      const usedNames = new Set();
      const locale =
        typeof getLanguage === 'function' && getLanguage() === 'de' ? 'de-DE' : 'en-US';
      const summaryTitle = this.copy.overview;

      const summarySheet = XLSX.utils.aoa_to_sheet([
        ['Biathlon Shooting Assistant'],
        [summaryTitle],
        [`Export date: ${new Date().toLocaleDateString(locale)}`],
        [],
        [
          this.copy.session,
          this.copy.date,
          this.copy.location,
          this.copy.type,
          this.copy.seriesLabel,
          this.copy.hits,
          this.copy.shots,
          this.copy.hitRate,
        ],
        ...model.sessionRows.map((row) => [
          row.session.name || '-',
          this.formatDate(row.session.date),
          row.session.location || '-',
          this.getSessionTypeLabel(row.session.type),
          row.seriesCount,
          row.hits,
          row.total,
          `${row.hitRate}%`,
        ]),
        [],
        [
          this.copy.athleteDetail,
          'Class',
          this.copy.session,
          this.copy.seriesLabel,
          this.copy.hits,
          this.copy.shots,
          this.copy.hitRate,
        ],
        ...model.athleteEntries.map((entry) => {
          const hitRate =
            entry.totals.total > 0 ? Math.round((entry.totals.hits / entry.totals.total) * 100) : 0;
          return [
            entry.athlete?.name || '-',
            entry.athlete?.ageGroup || '-',
            entry.totals.sessions.length,
            entry.seriesEntries.length,
            entry.totals.hits,
            entry.totals.total,
            `${hitRate}%`,
          ];
        }),
      ]);
      summarySheet['!cols'] = [
        { wch: 24 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        this.makeSheetName('Summary', usedNames)
      );

      const sessionsSheet = XLSX.utils.aoa_to_sheet([
        ['Biathlon Shooting Assistant'],
        [this.copy.sessions],
        [],
        [
          this.copy.session,
          this.copy.date,
          this.copy.location,
          this.copy.type,
          this.copy.seriesLabel,
          this.copy.hits,
          this.copy.shots,
          this.copy.hitRate,
        ],
        ...model.sessionRows.map((row) => [
          row.session.name || '-',
          this.formatDate(row.session.date),
          row.session.location || '-',
          this.getSessionTypeLabel(row.session.type),
          row.seriesCount,
          row.hits,
          row.total,
          `${row.hitRate}%`,
        ]),
      ]);
      sessionsSheet['!cols'] = [
        { wch: 24 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, this.makeSheetName('Units', usedNames));

      const athleteOverviewSheet = XLSX.utils.aoa_to_sheet([
        ['Biathlon Shooting Assistant'],
        [this.copy.athleteOverview],
        [],
        [
          this.copy.athleteDetail,
          'Class',
          this.copy.session,
          this.copy.seriesLabel,
          this.copy.hits,
          this.copy.shots,
          this.copy.hitRate,
        ],
        ...model.athleteEntries.map((entry) => {
          const hitRate =
            entry.totals.total > 0 ? Math.round((entry.totals.hits / entry.totals.total) * 100) : 0;
          return [
            entry.athlete?.name || '-',
            entry.athlete?.ageGroup || '-',
            entry.totals.sessions.length,
            entry.seriesEntries.length,
            entry.totals.hits,
            entry.totals.total,
            `${hitRate}%`,
          ];
        }),
      ]);
      athleteOverviewSheet['!cols'] = [
        { wch: 24 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        athleteOverviewSheet,
        this.makeSheetName('Athletes', usedNames)
      );

      model.athleteEntries.forEach((entry) => {
        const athleteSheet = XLSX.utils.aoa_to_sheet([
          ['Biathlon Shooting Assistant'],
          [entry.athlete?.name || 'Athlete'],
          [
            `${entry.athlete?.ageGroup || '-'} | ${this.copy.selectedUnits}: ${entry.totals.sessions.length}`,
          ],
          [],
          [
            this.copy.session,
            this.copy.date,
            this.copy.location,
            this.copy.type,
            this.copy.seriesLabel,
            this.copy.hits,
            this.copy.shots,
            this.copy.hitRate,
            'Timestamp',
            this.copy.time,
          ],
          ...entry.seriesEntries.map((seriesRow) => {
            const stats = seriesRow.stats;
            return [
              seriesRow.session.name || '-',
              this.formatDate(seriesRow.session.date),
              seriesRow.session.location || '-',
              this.getSessionTypeLabel(seriesRow.session.type),
              String(seriesRow.index),
              String(stats.hits),
              String(stats.total),
              `${stats.hitRate}%`,
              this.formatDateTime(seriesRow.seriesEntry?.timestamp),
              seriesRow.seriesEntry?.rangeTime || seriesRow.seriesEntry?.totalTime || '-',
            ];
          }),
        ]);

        athleteSheet['!cols'] = [
          { wch: 24 },
          { wch: 16 },
          { wch: 18 },
          { wch: 16 },
          { wch: 10 },
          { wch: 10 },
          { wch: 10 },
          { wch: 12 },
          { wch: 22 },
          { wch: 12 },
        ];
        XLSX.utils.book_append_sheet(
          workbook,
          athleteSheet,
          this.makeSheetName(entry.athlete?.name || 'Athlete', usedNames)
        );
      });

      XLSX.writeFile(workbook, `Biathlon_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert(this.copy.excelFailed);
    }
  }

  makeSheetName(rawName, usedNames, fallback = 'Sheet') {
    const sanitized = String(rawName || fallback)
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
  }

  getSessionTypeLabel(type) {
    const normalizedType = (type || 'training').toLowerCase();
    if (normalizedType === 'competition')
      return typeof t === 'function' ? t('competition') : 'Wettkampf';
    if (normalizedType === 'test_competition')
      return typeof t === 'function' ? t('test_competition') : 'Testwettkampf';
    if (normalizedType === 'training') return typeof t === 'function' ? t('training') : 'Training';
    if (normalizedType === 'international_test')
      return typeof t === 'function' ? t('international_test') : 'Internationaler Schießtest';
    if (normalizedType === 'other') return typeof t === 'function' ? t('other') : 'Sonstige';
    if (normalizedType === 'testing') return typeof t === 'function' ? t('testing') : 'Test';
    return typeof t === 'function' ? t(type) : type;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.exportPage = new ExportPage();
});
