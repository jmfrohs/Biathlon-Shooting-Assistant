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
 * New Session Page logic
 */

class NewSessionPage {
  constructor() {
    this.selectedAthletes = [];
    this.athletes = [];
    this.filteredAthletes = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.dragState = null;
    this.init();
  }

  async init() {
    await this.loadAthletes();
    this.checkRole();
    this.setupEventListeners();
    this.setDefaultDateTime();
    this.loadSessionHistory();
    this.renderSelectedAthletes();
  }

  checkRole() {
    const role = localStorage.getItem('b_user_role');
    if (role === 'athlete') {
      const personalAthleteId = parseInt(localStorage.getItem('b_personal_athlete_id'));
      if (personalAthleteId) {
        if (!this.selectedAthletes.includes(personalAthleteId)) {
          this.selectedAthletes.push(personalAthleteId);
        }
        const athleteSection =
          document.getElementById('toggleAthletesBtn')?.parentElement?.parentElement;
        if (athleteSection) {
          athleteSection.classList.add('hidden');
        }
      }
    }
  }

  async loadAthletes() {
    try {
      this.athletes = (await apiService.getAthletes()) || [];
    } catch (e) {
      this.athletes = [];
    }
    this.filteredAthletes = [...this.athletes];
    this.setupFilters();
  }

  setDefaultDateTime() {
    const dateInput = document.getElementById('sessionDate');
    const timeInput = document.getElementById('sessionTime');

    // Check for query parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const paramDate = urlParams.get('date');
    const paramTime = urlParams.get('time');
    const paramStartTime = urlParams.get('startTime');
    const paramEndTime = urlParams.get('endTime');

    if (paramDate && dateInput) {
      dateInput.value = paramDate;
    } else if (dateInput) {
      const now = new Date();
      dateInput.value = now.toISOString().split('T')[0];
    }

    if (paramStartTime && timeInput) {
      timeInput.value = paramStartTime;
    } else if (paramTime && timeInput) {
      timeInput.value = paramTime;
    } else if (timeInput) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      timeInput.value = `${hours}:${minutes}`;
    }

    // If endTime is provided, store it for later use (e.g., calculating duration)
    if (paramEndTime) {
      window.__sessionEndTime = paramEndTime;
    }
  }

  setupEventListeners() {
    // Setup back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.onclick = () => this.handleBackNavigation();
    }

    const toggleBtn = document.getElementById('toggleAthletesBtn');
    const closeBtn = document.getElementById('closeAthletesModal');
    const athletesModal = document.getElementById('athletesModal');
    const confirmBtn = document.getElementById('confirmAthletesBtn');
    if (toggleBtn)
      toggleBtn.onclick = () => {
        athletesModal.classList.remove('hidden');
        this.renderAthletesSelectList();
      };
    if (closeBtn)
      closeBtn.onclick = () => {
        athletesModal.classList.add('hidden');
      };
    if (confirmBtn)
      confirmBtn.onclick = () => {
        athletesModal.classList.add('hidden');
        this.renderSelectedAthletes();
      };
    const searchInput = document.getElementById('athleteSearch');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.filterAthletes();
      };
    }

    const athletesSelectList = document.getElementById('athletesSelectList');
    if (athletesSelectList) {
      athletesSelectList.addEventListener('pointerdown', (e) => this.startAthleteDrag(e));
      document.addEventListener('pointermove', (e) => this.handleAthleteDragMove(e));
      document.addEventListener('pointerup', (e) => this.endAthleteDrag(e));
      document.addEventListener('pointercancel', (e) => this.endAthleteDrag(e));
    }

    const createBtn = document.getElementById('createSessionBtn');
    if (createBtn) createBtn.onclick = () => this.handleCreateSession();
    const sessionTypeSelect = document.getElementById('sessionType');
    const compTypeSelect = document.getElementById('competitionType');
    if (sessionTypeSelect) {
      sessionTypeSelect.addEventListener('change', () => this.updateSessionTypeFields());
    }
    if (compTypeSelect) {
      compTypeSelect.addEventListener('change', () => this.updateSessionTypeFields());
    }
    this.updateSessionTypeFields();

    const nameInput = document.getElementById('sessionName');
    const locInput = document.getElementById('sessionLocation');
    if (nameInput) {
      nameInput.oninput = (e) => {
        document.getElementById('nameCount').textContent = e.target.value.length;
      };
    }

    if (locInput) {
      locInput.oninput = (e) => {
        document.getElementById('locationCount').textContent = e.target.value.length;
      };
    }

    window.toggleConditions = () => {
      const content = document.getElementById('conditions-content');
      const chevron = document.getElementById('conditions-chevron');
      if (content && chevron) {
        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
          content.classList.remove('hidden');
          chevron.style.transform = 'rotate(180deg)';
          chevron.classList.add('text-neon-cyan');
        } else {
          content.classList.add('hidden');
          chevron.style.transform = 'rotate(0deg)';
          chevron.classList.remove('text-neon-cyan');
        }
      }
    };

    window.toggleSessionNote = () => {
      const content = document.getElementById('session-note-content');
      const chevron = document.getElementById('session-note-chevron');
      if (content && chevron) {
        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
          content.classList.remove('hidden');
          chevron.style.transform = 'rotate(180deg)';
          chevron.classList.add('text-neon-cyan');
        } else {
          content.classList.add('hidden');
          chevron.style.transform = 'rotate(0deg)';
          chevron.classList.remove('text-neon-cyan');
        }
      }
    };
  }

  setupFilters() {
    const filterContainer = document.getElementById('athleteFilters');
    if (!filterContainer) return;
    const groups = ['all', ...new Set(this.athletes.map((a) => a.ageGroup).filter(Boolean))];
    filterContainer.innerHTML = groups
      .map(
        (group) => `
      <button class="athlete-filter-btn px-4 py-2 ${this.currentFilter === group ? 'bg-primary text-white' : 'bg-off-white/5 text-light-blue-info'} text-xs font-bold rounded-full whitespace-nowrap border border-subtle transition-all"
              data-filter="${group}">
        ${group === 'all' ? t('filter_all') : group}
      </button>
    `
      )
      .join('');
    filterContainer.querySelectorAll('.athlete-filter-btn').forEach((btn) => {
      btn.onclick = () => {
        this.currentFilter = btn.dataset.filter;
        this.setupFilters();
        this.filterAthletes();
      };
    });
  }

  applySuggestion(value) {
    const searchInput = document.getElementById('athleteSearch');
    if (searchInput) {
      searchInput.value = value;
      this.searchTerm = value.toLowerCase();
      this.filterAthletes();
    }
  }

  filterAthletes() {
    this.filteredAthletes = this.athletes.filter((athlete) => {
      const matchesFilter = this.currentFilter === 'all' || athlete.ageGroup === this.currentFilter;
      const matchesSearch = athlete.name.toLowerCase().includes(this.searchTerm);
      return matchesFilter && matchesSearch;
    });
    this.renderAthletesSelectList();
  }

  renderAthletesSelectList() {
    const list = document.getElementById('athletesSelectList');
    if (!list) return;
    if (this.filteredAthletes.length === 0) {
      let suggestionsHtml = '';
      if (this.searchTerm) {
        const candidates = this.athletes.map((a) => a.name).filter(Boolean);
        const suggestions = getBestSuggestions(this.searchTerm, candidates);
        if (suggestions.length > 0) {
          suggestionsHtml = `
            <div class="mt-4 flex flex-col items-center gap-2">
              <span class="text-xs text-light-blue-info/50 font-medium">${t('did_you_mean')}</span>
              <div class="flex flex-wrap gap-2 justify-center">
                ${suggestions
                  .map(
                    (s) => `
                  <button onclick="newSessionPage.applySuggestion('${s.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-primary/10 hover:bg-primary/25 border border-primary/20 hover:border-primary/40 text-xs text-primary font-medium rounded-full transition-all duration-200 cursor-pointer">
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
      list.innerHTML = `
        <div class="py-8 text-center">
          <p class="text-light-blue-info/50 italic">${t('no_athletes_found')}</p>
          ${suggestionsHtml}
        </div>
      `;
      return;
    }
    const selectedAthletes = this.getSelectedAthletes();
    const selectedIds = new Set(this.selectedAthletes);
    const selectedHtml = selectedAthletes
      .map((athlete) => this.renderAthleteSelectItem(athlete, true))
      .join('');
    const unselectedHtml = this.filteredAthletes
      .filter((athlete) => !selectedIds.has(athlete.id))
      .map((athlete) => this.renderAthleteSelectItem(athlete, false))
      .join('');

    list.innerHTML = selectedHtml + unselectedHtml;
  }

  toggleAthleteSelection(id) {
    const existingIndex = this.selectedAthletes.indexOf(id);
    if (existingIndex !== -1) {
      this.selectedAthletes.splice(existingIndex, 1);
    } else {
      this.selectedAthletes.push(id);
    }
    this.renderAthletesSelectList();
    this.updateSelectionCounts();
    this.renderSelectedAthletes();
  }

  updateSelectionCounts() {
    const countEl = document.getElementById('selectedAthleteCount');
    if (countEl) countEl.textContent = this.selectedAthletes.length;
  }

  getSelectedAthletes() {
    return this.selectedAthletes
      .map((athleteId) => this.athletes.find((athlete) => athlete.id === athleteId))
      .filter(Boolean);
  }

  renderSelectedAthletes() {
    const list = document.getElementById('selectedAthletesList');
    if (!list) return;
    const selected = this.getSelectedAthletes();
    if (selected.length === 0) {
      list.innerHTML = `<p class="text-sm text-light-blue-info/50 italic px-2">${t('no_athletes_selected')}</p>`;
      return;
    }
    list.innerHTML = selected
      .map(
        (athlete) => `
      <div class="flex items-center gap-3 p-3 bg-off-white/5 border border-subtle rounded-xl">
        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-primary font-bold text-[10px] uppercase">${this.getInitials(athlete.name)}</span>
        </div>
        <span class="text-sm font-medium text-off-white flex-1 min-w-0 truncate">${athlete.name}</span>
      </div>
    `
      )
      .join('');
  }

  startAthleteDrag(event) {
    const handle = event.target.closest('[data-drag-handle]');
    if (!handle) return;

    const card = handle.closest('[data-selected-athlete]');
    const list = document.getElementById('athletesSelectList');
    if (!card || !list) return;

    event.preventDefault();
    this.dragState = {
      pointerId: event.pointerId,
      draggedId: parseInt(card.dataset.selectedAthlete, 10),
      card,
      list,
      placeholderCard: card,
    };

    card.classList.add('opacity-70', 'scale-[0.99]');
  }

  handleAthleteDragMove(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

    const { card, list } = this.dragState;
    const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
    const targetCard = elementUnderPointer?.closest?.('[data-selected-athlete]');

    if (!targetCard || targetCard === card || !list.contains(targetCard)) return;

    const targetRect = targetCard.getBoundingClientRect();
    const shouldInsertBefore = event.clientY < targetRect.top + targetRect.height / 2;

    if (shouldInsertBefore) {
      list.insertBefore(card, targetCard);
    } else {
      list.insertBefore(card, targetCard.nextSibling);
    }
  }

  endAthleteDrag(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

    const { card } = this.dragState;
    card.classList.remove('opacity-70', 'scale-[0.99]');
    this.dragState = null;
    this.syncSelectedAthleteOrderFromDom();
    this.renderSelectedAthletes();
    this.renderAthletesSelectList();
  }

  syncSelectedAthleteOrderFromDom() {
    const cards = document.querySelectorAll('#athletesSelectList [data-selected-athlete]');
    const orderedIds = Array.from(cards)
      .map((card) => parseInt(card.dataset.selectedAthlete, 10))
      .filter((id) => !Number.isNaN(id));

    if (orderedIds.length > 0) {
      this.selectedAthletes = orderedIds;
    }
  }

  renderAthleteSelectItem(athlete, isSelected) {
    const initials = this.getInitials(athlete.name);
    const dragHandle = isSelected
      ? `
        <button type="button"
                class="drag-handle w-10 h-10 flex items-center justify-center rounded-xl bg-primary/15 text-primary touch-none active:cursor-grabbing shrink-0"
                data-drag-handle="true"
                aria-label="${t('drag_to_reorder') || 'Drag to reorder'}">
          <span class="material-symbols-outlined text-[20px]">drag_indicator</span>
        </button>
      `
      : '';

    return `
      <div class="athlete-select-item p-4 bg-off-white/5 border ${isSelected ? 'border-primary bg-primary/10' : 'border-subtle'} rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer" data-selected-athlete="${isSelected ? athlete.id : ''}" onclick="newSessionPage.toggleAthleteSelection(${athlete.id})">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          ${dragHandle}
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-primary font-bold text-xs uppercase">${initials}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-off-white text-sm truncate">${athlete.name}</p>
            <p class="text-[11px] text-light-blue-info">${athlete.ageGroup || t('no_group')}</p>
          </div>
        </div>
        <span class="material-symbols-outlined ${isSelected ? 'text-primary' : 'text-light-blue-info/30'}">
          ${isSelected ? 'check_circle' : 'radio_button_unchecked'}
        </span>
      </div>
    `;
  }

  getInitials(name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2);
  }

  handleBackNavigation() {
    // Check if we came from calendar (has date parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const hasCalendarParams = urlParams.has('date');

    if (hasCalendarParams) {
      // Go back to calendar
      window.location.href = 'calendar.html';
    } else {
      // Go back to index
      window.location.href = 'index.html';
    }
  }

  loadSessionHistory() {
    const nameHistory = JSON.parse(localStorage.getItem('sessionNameHistory')) || [];
    const locationHistory = JSON.parse(localStorage.getItem('sessionLocationHistory')) || [];

    this.renderHistoryChips('sessionNameHistory', nameHistory);
    this.renderHistoryChips('sessionLocationHistory', locationHistory);
  }

  renderHistoryChips(containerId, items) {
    const mainContainer = document.getElementById(containerId);
    const chipsContainer = document.getElementById(
      containerId === 'sessionNameHistory' ? 'sessionNameChips' : 'sessionLocationChips'
    );

    if (!mainContainer || !chipsContainer) return;

    if (items.length === 0) {
      mainContainer.classList.add('hidden');
      return;
    }

    mainContainer.classList.remove('hidden');
    chipsContainer.innerHTML = '';

    items.forEach((item) => {
      const chip = document.createElement('div');
      chip.className =
        'px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-light-blue-info hover:border-primary/50 cursor-pointer active:scale-95 transition-all flex items-center gap-1';

      chip.innerHTML = `<span class="material-symbols-outlined text-xs">history</span> ${item}`;

      chip.onclick = () => {
        const inputId = containerId === 'sessionNameHistory' ? 'sessionName' : 'sessionLocation';
        const input = document.getElementById(inputId);
        if (input) {
          input.value = item;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };

      chipsContainer.appendChild(chip);
    });
  }

  updateSessionHistory(name, location) {
    let nameHistory = JSON.parse(localStorage.getItem('sessionNameHistory')) || [];
    if (name && !nameHistory.includes(name)) {
      nameHistory.unshift(name);
      nameHistory = nameHistory.slice(0, 10);
      localStorage.setItem('sessionNameHistory', JSON.stringify(nameHistory));
      this.renderHistoryChips('sessionNameHistory', nameHistory);
    }

    let locationHistory = JSON.parse(localStorage.getItem('sessionLocationHistory')) || [];
    if (location && !locationHistory.includes(location)) {
      locationHistory.unshift(location);
      locationHistory = locationHistory.slice(0, 10);
      localStorage.setItem('sessionLocationHistory', JSON.stringify(locationHistory));
      this.renderHistoryChips('sessionLocationHistory', locationHistory);
    }
  }

  renderTrainingTemplates() {
    const select = document.getElementById('trainingTemplate');
    if (!select) return;

    const templates = trainingTemplateManager.getAll();
    select.innerHTML = '<option disabled selected value="" data-i18n="select_template"></option>';

    templates.forEach((template) => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = `${template.name} (${template.positions.map((p) => (p === 'Liegend' ? 'L' : 'S')).join(' ')})`;
      select.appendChild(option);
    });

    if (typeof translateApp === 'function') {
      translateApp();
    }
  }

  updateSessionTypeFields() {
    const sessionTypeSelect = document.getElementById('sessionType');
    const compTypeSelect = document.getElementById('competitionType');
    const compFields = document.getElementById('competitionFields');
    const categoryField = document.getElementById('competitionCategoryField');
    const trainingFields = document.getElementById('trainingTemplateFields');
    if (!sessionTypeSelect) return;

    const type = sessionTypeSelect.value;
    const isCompetition = type === 'competition';
    const isTestCompetition = type === 'test_competition';
    const isCompetitionLike = isCompetition || isTestCompetition;

    if (compFields) {
      compFields.classList.toggle('hidden', !isCompetitionLike);
    }

    if (categoryField) {
      categoryField.classList.toggle('hidden', !isCompetition);
    }

    if (compTypeSelect) {
      const otherRaceTypeOption = compTypeSelect.querySelector('option[value="other"]');
      if (otherRaceTypeOption) {
        const allowOtherRaceType = isTestCompetition;
        otherRaceTypeOption.hidden = !allowOtherRaceType;
        otherRaceTypeOption.disabled = !allowOtherRaceType;
        if (!allowOtherRaceType && compTypeSelect.value === 'other') {
          compTypeSelect.value = '';
        }
      }
    }

    const showTemplateInlineWithCompetition =
      isTestCompetition && compTypeSelect && compTypeSelect.value === 'other';

    const usesTemplate =
      type === 'training' ||
      type === 'other' ||
      type === 'testing' ||
      showTemplateInlineWithCompetition;

    if (trainingFields) {
      trainingFields.classList.toggle('hidden', !usesTemplate);
    }
    if (usesTemplate) {
      this.renderTrainingTemplates();
    }
  }

  async handleCreateSession() {
    const name = document.getElementById('sessionName').value.trim();
    const location = document.getElementById('sessionLocation').value.trim();
    const note = document.getElementById('sessionNote')?.value.trim() || null;
    const type = document.getElementById('sessionType').value;
    const date = document.getElementById('sessionDate').value;
    const time = document.getElementById('sessionTime').value;
    const compCategory = document.getElementById('competitionCategory').value;
    const compType = document.getElementById('competitionType').value;
    const templateId = document.getElementById('trainingTemplate').value;
    const isCompetitionLike = type === 'competition' || type === 'test_competition';
    const isTestCompetitionOther = type === 'test_competition' && compType === 'other';
    const usesTemplateSeries =
      type === 'training' || type === 'other' || type === 'testing' || isTestCompetitionOther;
    if (!name || !location || !type || !date) {
      alert(t('fill_all_details'));
      return;
    }

    if (type === 'competition' && (!compCategory || !compType)) {
      alert(t('select_category_type'));
      return;
    }

    if (type === 'test_competition' && !compType) {
      alert('Bitte Renntyp auswählen.');
      return;
    }

    if (isTestCompetitionOther && !templateId) {
      alert(t('no_template_selected'));
      return;
    }

    if (this.selectedAthletes.length === 0) {
      const role = localStorage.getItem('b_user_role');
      if (role === 'athlete') {
        const personalAthleteId = parseInt(localStorage.getItem('b_personal_athlete_id'));
        if (personalAthleteId) {
          if (!this.selectedAthletes.includes(personalAthleteId)) {
            this.selectedAthletes.push(personalAthleteId);
          }
        } else {
          alert('Kein Sportler-Profil gefunden. Bitte neu anmelden.');
          return;
        }
      } else {
        alert(t('select_one_athlete'));
        return;
      }
    }

    const sequenceMap = {
      Sprint: ['Liegend', 'Stehend'],
      Relay: ['Liegend', 'Stehend'],
      Individual: ['Liegend', 'Stehend', 'Liegend', 'Stehend'],
      'Mass Start': ['Liegend', 'Liegend', 'Stehend', 'Stehend'],
      Pursuit: ['Liegend', 'Liegend', 'Stehend', 'Stehend'],
      'Single Mixed Relay': ['Liegend', 'Stehend', 'Liegend', 'Stehend'],
      'Mixed Relay': ['Liegend', 'Stehend'],
    };

    const generatedSeries = [];
    if (isCompetitionLike && compType !== 'other' && sequenceMap[compType]) {
      const sequence = sequenceMap[compType];
      this.selectedAthletes.forEach((athleteId) => {
        const athlete = this.athletes.find((a) => a.id === athleteId);
        sequence.forEach((stance, index) => {
          generatedSeries.push({
            id: Date.now() + Math.floor(Math.random() * 1000000),
            athleteId: athleteId,
            athleteName: athlete ? athlete.name : 'Unknown',
            type: 'series',
            stance: stance,
            clicksX: 0,
            clicksY: 0,
            shots: [],
            timestamp: new Date().toISOString(),
            isPlaceholder: true,
          });
        });
      });
    } else if (type === 'international_test') {
      this.selectedAthletes.forEach((athleteId) => {
        const athlete = this.athletes.find((a) => a.id === athleteId);
        const athleteName = athlete ? athlete.name : 'Unknown';

        // 1. Präzision 10/10 (1 Liegend, 1 Stehend, je 10 Schuss)
        const p1Stances = ['Liegend', 'Stehend'];
        p1Stances.forEach((stance, idx) => {
          generatedSeries.push({
            id: Date.now() + Math.floor(Math.random() * 1000000) + idx,
            athleteId: athleteId,
            athleteName: athleteName,
            type: 'series',
            stance: stance,
            clicksX: 0,
            clicksY: 0,
            shots: [],
            shotsPerSeries: 10,
            scoringType: 'rings',
            istPart: 1,
            timestamp: new Date().toISOString(),
            isPlaceholder: true,
          });
        });

        // 2. LLSS BiaSerie (L, L, S, S, je 5 Schuss)
        const p2Stances = ['Liegend', 'Liegend', 'Stehend', 'Stehend'];
        p2Stances.forEach((stance, idx) => {
          generatedSeries.push({
            id: Date.now() + Math.floor(Math.random() * 1000000) + 10 + idx,
            athleteId: athleteId,
            athleteName: athleteName,
            type: 'series',
            stance: stance,
            clicksX: 0,
            clicksY: 0,
            shots: [],
            shotsPerSeries: 5,
            scoringType: 'hits',
            istPart: 2,
            timestamp: new Date().toISOString(),
            isPlaceholder: true,
          });
        });

        // 3. 5/5 x 1 Treffer (5 L, 5 S, je 1 Schuss)
        const p3Stances = [
          'Liegend',
          'Liegend',
          'Liegend',
          'Liegend',
          'Liegend',
          'Stehend',
          'Stehend',
          'Stehend',
          'Stehend',
          'Stehend',
        ];
        p3Stances.forEach((stance, idx) => {
          generatedSeries.push({
            id: Date.now() + Math.floor(Math.random() * 1000000) + 20 + idx,
            athleteId: athleteId,
            athleteName: athleteName,
            type: 'series',
            stance: stance,
            clicksX: 0,
            clicksY: 0,
            shots: [],
            shotsPerSeries: 1,
            scoringType: 'hits',
            istPart: 3,
            timestamp: new Date().toISOString(),
            isPlaceholder: true,
          });
        });
      });
    } else if (usesTemplateSeries) {
      if (templateId) {
        const template = trainingTemplateManager.getById(templateId);
        if (template) {
          this.selectedAthletes.forEach((athleteId) => {
            const athlete = this.athletes.find((a) => a.id === athleteId);
            template.positions.forEach((stance, index) => {
              generatedSeries.push({
                id: Date.now() + Math.floor(Math.random() * 1000000),
                athleteId: athleteId,
                athleteName: athlete ? athlete.name : 'Unknown',
                type: 'series',
                stance: stance,
                clicksX: 0,
                clicksY: 0,
                shots: [],
                shotsPerSeries: template.shotsPerSeries || 5,
                timestamp: new Date().toISOString(),
                isPlaceholder: true,
              });
            });
          });
        }
      }
    }

    const session = {
      name,
      location,
      type,
      date,
      time,
      competitionCategory: type === 'competition' ? compCategory : null,
      competitionType: isCompetitionLike ? compType : null,
      weather: {
        temp: document.getElementById('tempInput')?.value || null,
        sky: document.getElementById('skyInput')?.value || null,
        precipitation: document.getElementById('precipitationInput')?.value || null,
        humidity: document.getElementById('humidityInput')?.value || null,
        windStrength: document.getElementById('windStrengthInput')?.value || null,
        windDirection: document.getElementById('windDirectionInput')?.value || null,
      },
      track: {
        snowType: document.getElementById('snowTypeInput')?.value || null,
        surfaceMoisture: document.getElementById('surfaceMoistureInput')?.value || null,
        trackHardness: document.getElementById('trackHardnessInput')?.value || null,
        snowGrain: document.getElementById('snowGrainInput')?.value || null,
        trackQuality: document.getElementById('trackQualityInput')?.value || null,
        trackPreparation: document.getElementById('trackPreparationInput')?.value || null,
      },
      note,
      athletes: [...this.selectedAthletes],
      series: generatedSeries,
      istTimes:
        type === 'international_test'
          ? this.selectedAthletes.reduce((acc, id) => {
              acc[id] = { llssTime: 0, singleProneTime: 0, singleStandingTime: 0 };
              return acc;
            }, {})
          : null,
    };

    const createBtn = document.getElementById('createSessionBtn');
    if (createBtn) {
      createBtn.disabled = true;
      createBtn.textContent = '...';
    }
    try {
      const result = await apiService.createSession(session);

      this.updateSessionHistory(name, location);

      const autoShare = localStorage.getItem('b_auto_share_enabled') === 'true';
      if (autoShare && typeof apiService.shareSession === 'function') {
        try {
          await apiService.shareSession(result.id);
        } catch (shareErr) {
          console.warn('Failed to auto-share session:', shareErr);
        }
      }

      // Check if we came from calendar
      const urlParams = new URLSearchParams(window.location.search);
      const hasCalendarParams = urlParams.has('date');

      if (hasCalendarParams) {
        // Go back to calendar instead of session-detail
        window.location.href = 'calendar.html';
      } else {
        // Go to session-detail as usual
        window.location.href = `session-detail.html?id=${result.id}`;
      }
    } catch (e) {
      alert('Fehler beim Erstellen der Session.');
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.textContent = 'Erstellen';
      }
    }
  }
}

let newSessionPage;
document.addEventListener('DOMContentLoaded', () => {
  newSessionPage = new NewSessionPage();
});
