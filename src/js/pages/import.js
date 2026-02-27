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
 * Import Page Logic
 */

class ImportPage {
  constructor() {
    this.dropZone = document.getElementById('drop-zone');
    this.fileInput = document.getElementById('file-input');
    this.resultsSection = document.getElementById('import-results');
    this.emptyState = document.getElementById('import-empty');
    this.entriesList = document.getElementById('entries-list');
    this.confirmBtn = document.getElementById('btn-confirm-import');
    this.footer = document.getElementById('import-footer');
    this.matchCountLabel = document.getElementById('match-count');

    this.athletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
    this.extractedData = [];

    this.init();
  }

  init() {
    this.setupEventListeners();
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }
  }

  setupEventListeners() {
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('border-primary/50', 'bg-primary/5');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('border-primary/50', 'bg-primary/5');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('border-primary/50', 'bg-primary/5');
      if (e.dataTransfer.files.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.handleFile(e.target.files[0]);
      }
    });

    this.confirmBtn.addEventListener('click', () => this.confirmImport());
  }

  async handleFile(file) {
    this.showToast(t('processing_file') || 'Processing file...');
    const extension = file.name.split('.').pop().toLowerCase();

    try {
      if (extension === 'pdf') {
        await this.processPDF(file);
      } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
        await this.processExcel(file);
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showToast('Error: ' + error.message, true);
    }
  }

  async processPDF(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedarray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;
      const allRows = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const items = content.items.map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          height: item.height || 10,
        }));

        items.sort((a, b) => b.y - a.y || a.x - b.x);

        let pageRows = [];
        let currentRow = [];
        let lastY = null;

        items.forEach((item) => {
          const yDiff = lastY !== null ? Math.abs(item.y - lastY) : 0;
          const threshold = 3;

          if (lastY === null || yDiff < threshold) {
            currentRow.push(item);
          } else {
            if (currentRow.length) pageRows.push(currentRow);
            currentRow = [item];
          }
          lastY = item.y;
        });
        if (currentRow.length) pageRows.push(currentRow);

        pageRows.forEach((rowItems) => {
          rowItems.sort((a, b) => a.x - b.x);
          allRows.push(rowItems.map((it) => it.str));
        });
      }

      this.analyzeRows(allRows);
    };
    reader.readAsArrayBuffer(file);
  }

  async processExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      this.analyzeRows(json);
    };
    reader.readAsArrayBuffer(file);
  }

  analyzeRows(rows) {
    if (!rows || !Array.isArray(rows)) return;
    this.extractedData = [];
    this.extractedSession = {
      name: null,
      date: null,
      location: null,
      type: 'training',
      competitionCategory: null,
      competitionType: null,
    };

    const colMap = {
      name: -1,
      firstName: -1,
      lastName: -1,
      sf: [],
      sfTime: [],
      sfTimeGes: -1,
      sfGes: -1,
      hitsTotal: -1,
      bib: -1,
    };

    let headerRowIndex = -1;
    let nameRowIndex = -1;

    for (let i = 0; i < Math.min(rows.length, 80); i++) {
      const row = rows[i].map((c) => String(c).toLowerCase().trim());

      const sfCols = row.reduce((acc, cell, idx) => {
        if (cell.match(/^(sf|schi[eë](?:ß|ss)en|schie(?:ß|ss)en|s)\s*\d+$/)) acc.push(idx);
        return acc;
      }, []);

      if (sfCols.length >= 2 && headerRowIndex === -1) {
        headerRowIndex = i;
        colMap.sf = sfCols;
        row.forEach((cell, idx) => {
          if (cell.match(/^(sf|schie(?:ß|ss)en)[ _]?ges(amt)?$/)) colMap.sfGes = idx;
          if (cell === 'stnr' || cell === 'bib' || cell === 'startnr') colMap.bib = idx;
          if (cell === 'vorname') {
            colMap.firstName = idx;
            nameRowIndex = i;
          }

          if (cell === 'name' || cell === 'nachname') {
            colMap.lastName = idx;
            nameRowIndex = i;
          }

          if (cell.match(/^(sch\.?z\.?|schz|sz|schie(?:ß|ss)zeit|range\s*time|rt)[ _]?ges(amt)?$/))
            colMap.sfTimeGes = idx;
          if (cell.match(/^(sch\.?z\.?|schz|sz|schie(?:ß|ss)zeit|range\s*time|rt)\s*\.?\s*\d+$/))
            colMap.sfTime.push(idx);
        });
        console.log(
          'SF header found at row',
          i,
          '| SF cols:',
          sfCols,
          '| sfTime:',
          colMap.sfTime,
          '| sfTimeGes:',
          colMap.sfTimeGes,
          '| sfGes:',
          colMap.sfGes
        );
      }

      if (nameRowIndex === -1) {
        row.forEach((cell, idx) => {
          if (cell === 'vorname') {
            colMap.firstName = idx;
            nameRowIndex = i;
          }

          if (cell === 'name' || cell === 'nachname') {
            colMap.lastName = idx;
            nameRowIndex = i;
          }
        });
      }

      const rowText = rows[i].join(' ');
      const dateMatch = rowText.match(/(\d{1,2}\.\d{1,2}\.\d{4})|(\d{4}-\d{2}-\d{2})/);
      if (dateMatch && !this.extractedSession.date) this.extractedSession.date = dateMatch[0];
      if (
        (rowText.includes('Deutschlandpokal') ||
          rowText.includes('Protokoll') ||
          rowText.includes('Meisterschaft') ||
          rowText.includes('Cup') ||
          rowText.includes('Pokal')) &&
        !this.extractedSession.name
      ) {
        const parts = rowText.split(',').map((p) => p.trim());
        this.extractedSession.name = parts[0] || rowText.trim().substring(0, 80);
        if (parts[1] && !this.extractedSession.location) {
          const maybeLocation = parts[1].replace(/\d{1,2}\.\d{1,2}\.\d{4}/, '').trim();
          if (maybeLocation && maybeLocation.length > 1)
            this.extractedSession.location = maybeLocation;
        }

        if (!this.extractedSession.date) {
          const titleDateMatch = rowText.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
          if (titleDateMatch) this.extractedSession.date = titleDateMatch[0];
        }

        const competitionKeywords = [
          'pokal',
          'meisterschaft',
          'cup',
          'championship',
          'rennen',
          'wettkampf',
        ];
        const isCompetition = competitionKeywords.some((kw) => rowText.toLowerCase().includes(kw));
        if (isCompetition) this.extractedSession.type = 'competition';
      }

      if (!this.extractedSession.competitionType) {
        const disciplineMap = [
          { keywords: ['verfolgung', 'pursuit'], label: 'Verfolgung' },
          { keywords: ['sprint'], label: 'Sprint' },
          { keywords: ['einzel', 'individual'], label: 'Einzel' },
          { keywords: ['massenstart', 'mass start'], label: 'Massenstart' },
          { keywords: ['staffel', 'relay'], label: 'Staffel' },
          { keywords: ['super sprint'], label: 'Super Sprint' },
        ];
        const lower = rowText.toLowerCase();
        for (const discipline of disciplineMap) {
          if (discipline.keywords.some((kw) => lower.includes(kw))) {
            this.extractedSession.competitionType = discipline.label;
            break;
          }
        }
      }

      if (headerRowIndex !== -1 && nameRowIndex !== -1) break;
    }

    console.log(
      'ColMap:',
      JSON.stringify(colMap),
      '| headerRow:',
      headerRowIndex,
      '| nameRow:',
      nameRowIndex
    );

    const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
    console.log('Starting data extraction from row', startIndex);

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      let athleteName = '';
      let hits = 0;
      let total = 0;
      let found = false;
      let seriesMisses = [];
      let seriesTimes = [];

      if (headerRowIndex !== -1) {
        const last = colMap.lastName !== -1 ? String(row[colMap.lastName] || '').trim() : '';
        const first = colMap.firstName !== -1 ? String(row[colMap.firstName] || '').trim() : '';

        if (last && first) athleteName = `${last} ${first}`;
        else if (last) athleteName = last;

        if (colMap.sf.length > 0) {
          const candidateMisses = [];
          colMap.sf.forEach((idx) => {
            const val = String(row[idx] || '').trim();
            const num = parseInt(val);
            if (!isNaN(num) && num >= 0 && num <= 5) {
              candidateMisses.push(num);
            }
          });
          if (candidateMisses.length === colMap.sf.length) {
            seriesMisses = candidateMisses;
            const missesTotal = seriesMisses.reduce((sum, m) => sum + m, 0);
            total = seriesMisses.length * 5;
            hits = total - missesTotal;
            found = true;
          }
        }

        if (!found && colMap.sfGes !== -1) {
          const val = String(row[colMap.sfGes] || '').trim();
          const misses = parseInt(val);
          if (!isNaN(misses)) {
            total = 20;
            hits = total - misses;
            found = true;
          }
        }

        if (colMap.sfTime.length === colMap.sf.length && colMap.sfTime.length > 0) {
          const times = colMap.sfTime.map((idx) => String(row[idx] || '').trim());
          if (times.every((t) => t.match(/^\d{1,2}:\d{2}/))) seriesTimes = times;
        }

        if (seriesTimes.length === 0 && colMap.sf.length >= 2) {
          const timeRe = /^\d{1,2}:\d{2}([\.,]\d+)?$/;
          const usedIndices = new Set();
          const forbiddenIndices = new Set();
          if (colMap.sfGes !== -1) forbiddenIndices.add(colMap.sfGes);
          if (colMap.sfTimeGes !== -1) {
            for (let i = -2; i <= 2; i++) forbiddenIndices.add(colMap.sfTimeGes + i);
          }

          const isLikelySeriesTime = (tStr) => {
            const m = tStr.match(/^(\d{1,2}):(\d{2})/);
            if (!m) return false;
            const mins = parseInt(m[1]);
            const secs = parseInt(m[2]);
            return mins === 0 || (mins === 1 && secs < 30);
          };

          const candidateTimes = colMap.sf.map((sfIdx) => {
            for (let offset = 1; offset <= 4; offset++) {
              const aIdx = sfIdx + offset;
              const bIdx = sfIdx - offset;

              const isForbidden = (idx) => forbiddenIndices.has(idx) || idx === colMap.sfGes;

              if (!isForbidden(aIdx)) {
                const av = String(row[aIdx] || '').trim();
                if (timeRe.test(av) && isLikelySeriesTime(av) && !usedIndices.has(aIdx)) {
                  usedIndices.add(aIdx);
                  return av;
                }
              }

              if (!isForbidden(bIdx)) {
                const bv = String(row[bIdx] || '').trim();
                if (timeRe.test(bv) && isLikelySeriesTime(bv) && !usedIndices.has(bIdx)) {
                  usedIndices.add(bIdx);
                  return bv;
                }
              }
            }
            return '';
          });
          if (candidateTimes.some((t) => t)) seriesTimes = candidateTimes;
        }
      }

      if (colMap.sf.length >= 2 && seriesMisses.length === 0) {
        const candidates = colMap.sf
          .map((idx) => parseInt(String(row[idx] || '').trim()))
          .filter((n) => !isNaN(n) && n >= 0 && n <= 5);
        if (candidates.length === colMap.sf.length) {
          seriesMisses = candidates;
          found = true;
        }
      }

      const rowText = row.join(' ');
      const expectedN = colMap.sf.length > 0 ? colMap.sf.length : 4;

      if (seriesMisses.length === 0) {
        const partPat = '([0-5])';
        const sep = '\\s+';
        const sfParts = Array(expectedN).fill(partPat).join(sep);

        const withGesRe = new RegExp(`\\b${sfParts}${sep}(\\d{1,2})\\b`, 'g');
        let gm;
        while ((gm = withGesRe.exec(rowText)) !== null) {
          const vals = [];
          for (let g = 1; g <= expectedN; g++) vals.push(parseInt(gm[g]));
          const gesVal = parseInt(gm[expectedN + 1]);
          if (vals.reduce((s, v) => s + v, 0) === gesVal && gesVal <= expectedN * 5) {
            seriesMisses = vals;
            found = true;
            break;
          }
        }

        if (seriesMisses.length === 0) {
          const noGesRe = new RegExp(`\\b${sfParts}\\b`);
          const m = rowText.match(noGesRe);
          if (m) {
            seriesMisses = [];
            for (let g = 1; g <= expectedN; g++) seriesMisses.push(parseInt(m[g]));
            found = true;
          }
        }
      }

      if (seriesMisses.length > 0) {
        const missesTotal = seriesMisses.reduce((s, v) => s + v, 0);
        total = seriesMisses.length * 5;
        hits = total - missesTotal;
      }

      if (!athleteName) {
        const name = this.detectNameInText(rowText, seriesMisses.join(' '));
        if (name) athleteName = name;
      }

      if (!found || !athleteName) {
        const patternRes = this.extractPerformanceFromText(rowText);
        if (patternRes.length > 0) {
          const res = patternRes[0];
          if (!found) {
            hits = res.hits;
            total = res.total;
            found = true;
          }

          if (!athleteName) {
            const name = this.detectNameInText(rowText, res.matchStr);
            if (name) athleteName = name;
          }
        }
      }

      if (found && athleteName && athleteName.length > 5) {
        athleteName = athleteName
          .replace(/\b(20|19)\d{2}\b/g, '')
          .replace(/\b[A-Z]{1,2}\b/g, '')
          .replace(/Jugend|AK\s*\d+|Junioren|S1\d+|[0-9]{1,3}\.?\s*$/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (athleteName.length < 4) continue;

        const existing = this.athletes.find(
          (a) =>
            athleteName.toLowerCase().includes(a.name.toLowerCase()) ||
            a.name.toLowerCase().includes(athleteName.toLowerCase())
        );

        this.extractedData.push({
          athleteId: existing ? existing.id : null,
          athleteName: existing ? existing.name : athleteName,
          hits: hits,
          total: total,
          seriesMisses: seriesMisses,
          seriesTimes: seriesTimes,
          isNew: !existing,
          timestamp: Date.now(),
        });
      }
    }

    this.extractedData = this.extractedData.filter(
      (v, i, a) => a.findIndex((t) => t.athleteName === v.athleteName) === i
    );

    this.renderResults();
  }

  detectNameInText(text, matchStr) {
    const parts = text.split(matchStr);
    const before = parts[0].trim();

    const words = before.split(/\s+/).filter((w) => w.length > 1);

    const cleanedWords = words.filter((w) => {
      if (w.match(/^\d{1,3}$/)) return false;
      if (w.match(/^(20|19)\d{2}$/)) return false;
      if (w.match(/^[A-Z]{1,2}$/)) return false;
      return true;
    });

    const potentialName = cleanedWords
      .slice(-5)
      .filter((w) => w.match(/^[A-Z\u00C0-\u00DF]/))
      .join(' ');

    if (potentialName.split(' ').length >= 2 && potentialName.length > 5) {
      return potentialName;
    }
    return null;
  }

  extractPerformanceFromText(text) {
    const results = [];

    const hitRegex = /(\d+)\s*[\/\\]\s*(\d+)/g;
    let match;
    while ((match = hitRegex.exec(text)) !== null) {
      results.push({
        hits: parseInt(match[1]),
        total: parseInt(match[2]),
        matchStr: match[0],
        index: match.index,
      });
    }

    const seqRegex = /\b([0-5])\s+([0-5])\s+([0-5])\s+([0-5])\b/g;
    while ((match = seqRegex.exec(text)) !== null) {
      const misses =
        parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3]) + parseInt(match[4]);
      results.push({ hits: 20 - misses, total: 20, matchStr: match[0], index: match.index });
    }
    return results;
  }

  findAthleteInRow(row) {
    if (!Array.isArray(row)) return null;
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const match = this.findAthleteInLine(String(cell));
      if (match) return match;
    }
    return null;
  }

  analyzeText(text) {
    console.log('Falling back to global text analysis');
    const results = this.extractPerformanceFromText(text);

    results.forEach((res) => {
      const lookBack = text.substring(Math.max(0, res.index - 200), res.index);
      const nameCandidate = this.detectNameInText(lookBack, res.matchStr);

      if (nameCandidate) {
        this.extractedData.push({
          athleteId: null,
          athleteName: nameCandidate,
          hits: res.hits,
          total: res.total,
          isNew: true,
          timestamp: Date.now(),
        });
      }
    });

    this.renderResults();
  }

  /**
   * Smarter athlete matching in a line
   */
  findAthleteInLine(line) {
    const lowerLine = line.toLowerCase();

    for (const athlete of this.athletes) {
      const name = athlete.name.toLowerCase();
      if (lowerLine.includes(name)) return athlete;

      if (athlete.firstName && athlete.lastName) {
        const reverseName = `${athlete.lastName.toLowerCase()}, ${athlete.firstName.toLowerCase()}`;
        const reverseNameShort = `${athlete.lastName.toLowerCase()} ${athlete.firstName.toLowerCase()}`;
        if (lowerLine.includes(reverseName) || lowerLine.includes(reverseNameShort)) return athlete;
      }
    }
    return null;
  }

  renderResults() {
    this.entriesList.innerHTML = '';

    if (this.extractedData.length > 0) {
      this.resultsSection.classList.remove('hidden');
      this.emptyState.classList.add('hidden');
      this.footer.classList.remove('hidden');
      this.matchCountLabel.textContent = `${this.extractedData.length} Matches Found`;

      if (this.extractedSession.name || this.extractedSession.date) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'p-3 bg-primary/5 border border-primary/10 rounded-xl mb-4 text-xs';
        infoDiv.innerHTML = `
                    <div class="flex items-center gap-2 text-primary font-bold">
                        <span class="material-symbols-outlined text-sm">info</span>
                        <span>Detected Session Info</span>
                    </div>
                    <div class="mt-1 text-light-blue-info">
                        ${this.extractedSession.name ? `Name: ${this.extractedSession.name}` : ''}
                        ${this.extractedSession.date ? `<br>Date: ${this.extractedSession.date}` : ''}
                    </div>
                `;
        this.entriesList.appendChild(infoDiv);
      }

      this.extractedData.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className =
          'bg-card-dark border border-subtle rounded-2xl p-4 flex justify-between items-center';
        item.innerHTML = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <p class="font-bold text-off-white">${entry.athleteName}</p>
                            ${entry.isNew ? '<span class="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-500 rounded-md font-bold uppercase tracking-tighter">New</span>' : ''}
                        </div>
                        <p class="text-xs text-light-blue-info">${entry.isNew ? 'Create as new athlete' : 'Existing athlete matched'}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg">
                            <span class="text-sm font-black text-primary">${entry.hits} / ${entry.total}</span>
                        </div>
                        <button onclick="importPage.removeEntry(${index})" class="text-light-blue-info/40 hover:text-red-500 transition-colors">
                            <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                `;
        this.entriesList.appendChild(item);
      });
    } else {
      this.resultsSection.classList.add('hidden');
      this.emptyState.classList.remove('hidden');
      this.footer.classList.add('hidden');
      this.showToast('No performance data found in document', true);
    }
  }

  removeEntry(index) {
    this.extractedData.splice(index, 1);
    this.renderResults();
  }

  confirmImport() {
    if (this.extractedData.length === 0) return;

    let athletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
    const sessions = JSON.parse(localStorage.getItem('sessions')) || [];
    let targetSession = null;
    let newAthletesCreated = 0;

    this.extractedData.forEach((entry) => {
      if (entry.isNew) {
        const names = entry.athleteName.split(/\s+/);
        const firstName = names[0] || entry.athleteName;
        const lastName = names.slice(1).join(' ') || '';

        const newAthlete = {
          id: Date.now() + Math.random(),
          name: entry.athleteName,
          firstName: firstName,
          lastName: lastName,
          dob: '',
          ageGroup: 'Unknown',
          squad: 'Imported',
          timestamp: Date.now(),
        };

        athletes.push(newAthlete);
        entry.athleteId = newAthlete.id;
        entry.isNew = false;
        newAthletesCreated++;
      }
    });

    if (newAthletesCreated > 0) {
      localStorage.setItem('b_athletes', JSON.stringify(athletes));
      this.athletes = athletes;
    }

    let sessionDate = this.extractedSession.date;
    if (sessionDate && sessionDate.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const parts = sessionDate.split('.');
      sessionDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    targetSession = {
      id: Date.now(),
      name: this.extractedSession.name || 'Import ' + new Date().toLocaleDateString(),
      date: sessionDate || new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: this.extractedSession.location || 'Imported',
      type: this.extractedSession.type || 'training',
      competitionCategory: this.extractedSession.competitionCategory || null,
      competitionType: this.extractedSession.competitionType || null,
      athletes: [],
      series: [],
    };
    sessions.push(targetSession);

    this.extractedData.forEach((entry) => {
      if (!targetSession.athletes.includes(entry.athleteId)) {
        targetSession.athletes.push(entry.athleteId);
      }

      const stances = ['Liegend', 'Stehend', 'Liegend', 'Stehend'];

      if (entry.seriesMisses && entry.seriesMisses.length > 0) {
        console.log(
          'Creating',
          entry.seriesMisses.length,
          'series for',
          entry.athleteName,
          '| misses:',
          entry.seriesMisses
        );
        entry.seriesMisses.forEach((misses, seriesIdx) => {
          const shotsInSeries = 5;
          const hitsInSeries = shotsInSeries - misses;
          const shots = [];
          for (let i = 0; i < shotsInSeries; i++) {
            const isHit = i < hitsInSeries;
            const stance = stances[seriesIdx % stances.length];
            const coords = this.generateRandomShotCoordinates(isHit, stance);
            shots.push({
              id: Date.now() + Math.random(),
              shot: i + 1,
              hit: isHit,
              ring: isHit ? 10 : 0,
              x: coords.x,
              y: coords.y,
              timestamp: Date.now(),
            });
          }
          targetSession.series.push({
            id: Date.now() + Math.random(),
            athleteId: entry.athleteId,
            type: 'series',
            stance: stances[seriesIdx % stances.length],
            shots: shots,
            rangeTime:
              entry.seriesTimes && entry.seriesTimes[seriesIdx]
                ? entry.seriesTimes[seriesIdx]
                : undefined,
            timestamp: Date.now() + seriesIdx,
          });
        });
      } else {
        const shots = [];
        for (let i = 0; i < entry.total; i++) {
          const isHit = i < entry.hits;
          const coords = this.generateRandomShotCoordinates(isHit, 'Liegend');
          shots.push({
            id: Date.now() + Math.random(),
            shot: i + 1,
            hit: isHit,
            ring: isHit ? 10 : 0,
            x: coords.x,
            y: coords.y,
            timestamp: Date.now(),
          });
        }
        targetSession.series.push({
          id: Date.now() + Math.random(),
          athleteId: entry.athleteId,
          type: 'series',
          stance: 'Liegend',
          shots: shots,
          timestamp: Date.now(),
        });
      }
    });

    localStorage.setItem('sessions', JSON.stringify(sessions));

    this.showToast('Import successful!', false);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  }

  showToast(message, isError = false) {
    const toast = document.getElementById('status-toast');
    const text = document.getElementById('status-text');
    text.textContent = message;

    toast.className = `fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 border text-sm font-semibold rounded-full shadow-2xl transition-all z-50 ${
      isError ? 'bg-red-500/90 border-red-400' : 'bg-zinc-900/90 border-white/10'
    }`;

    toast.classList.remove('opacity-0', 'pointer-events-none');

    setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3000);
  }

  /**
   * Generates randomized coordinates for shots to avoid overlapping in the center.
   * Accuracy is improved by considering the Biathlon stance (Liegend/Stehend).
   */
  generateRandomShotCoordinates(isHit, stance = 'Liegend') {
    const center = 100;
    const isProne = stance === 'Liegend';
    let minRadius, maxRadius;

    if (isHit) {
      minRadius = 0;
      maxRadius = isProne ? 25 : 65;
    } else {
      minRadius = isProne ? 35 : 75;
      maxRadius = 95;
    }

    const radius = Math.random() * (maxRadius - minRadius - 2) + minRadius + 1;
    const angle = Math.random() * Math.PI * 2;

    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }
}

const importPage = new ImportPage();
window.importPage = importPage;
