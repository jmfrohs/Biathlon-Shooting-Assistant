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
    this.selectedAthletes = new Set();
    this.athletes = [];
    this.filteredAthletes = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.init();
  }

init() {
    this.loadAthletes();
    this.setupEventListeners();
    this.setDefaultDateTime();
    this.renderSelectedAthletes();
  }

loadAthletes() {
    this.athletes = JSON.parse(localStorage.getItem('b_athletes')) || [];
    this.filteredAthletes = [...this.athletes];
    this.setupFilters();
  }

setDefaultDateTime() {
    const now = new Date();
    const dateInput = document.getElementById('sessionDate');
    const timeInput = document.getElementById('sessionTime');
    if (dateInput) dateInput.value = now.toISOString().split('T')[0];
    if (timeInput) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      timeInput.value = `${hours}:${minutes}`;
    }
  }

setupEventListeners() {
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
    const createBtn = document.getElementById('createSessionBtn');
    if (createBtn) createBtn.onclick = () => this.handleCreateSession();
    const sessionTypeSelect = document.getElementById('sessionType');
    const compFields = document.getElementById('competitionFields');
    if (sessionTypeSelect && compFields) {
      sessionTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'competition') {
          compFields.classList.remove('hidden');
        } else {
          compFields.classList.add('hidden');
        }
      });
    }
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
      list.innerHTML = `<div class="py-8 text-center text-light-blue-info/50 italic">${t('no_athletes_found')}</div>`;
      return;
    }
    list.innerHTML = this.filteredAthletes
      .map((athlete) => {
        const isSelected = this.selectedAthletes.has(athlete.id);
        const initials = this.getInitials(athlete.name);
        return `
        <div class="athlete-select-item p-4 bg-off-white/5 border ${isSelected ? 'border-primary bg-primary/10' : 'border-subtle'} rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
             onclick="newSessionPage.toggleAthleteSelection(${athlete.id})">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span class="text-primary font-bold text-xs uppercase">${initials}</span>
            </div>
            <div>
              <p class="font-bold text-off-white text-sm">${athlete.name}</p>
              <p class="text-[11px] text-light-blue-info">${athlete.ageGroup || t('no_group')}</p>
            </div>
          </div>
          <span class="material-symbols-outlined ${isSelected ? 'text-primary' : 'text-light-blue-info/30'}">
            ${isSelected ? 'check_circle' : 'radio_button_unchecked'}
          </span>
        </div>
      `;
      })
      .join('');
  }

toggleAthleteSelection(id) {
    if (this.selectedAthletes.has(id)) {
      this.selectedAthletes.delete(id);
    } else {
      this.selectedAthletes.add(id);
    }
    this.renderAthletesSelectList();
    this.updateSelectionCounts();
  }

updateSelectionCounts() {
    const countEl = document.getElementById('selectedAthleteCount');
    if (countEl) countEl.textContent = this.selectedAthletes.size;
  }

renderSelectedAthletes() {
    const list = document.getElementById('selectedAthletesList');
    if (!list) return;
    const selected = this.athletes.filter((a) => this.selectedAthletes.has(a.id));
    if (selected.length === 0) {
      list.innerHTML = `<p class="text-sm text-light-blue-info/50 italic px-2">${t('no_athletes_selected')}</p>`;
      return;
    }
    list.innerHTML = selected
      .map(
        (athlete) => `
      <div class="flex items-center gap-3 p-3 bg-off-white/5 border border-subtle rounded-xl">
        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-primary font-bold text-[10px] uppercase">${this.getInitials(athlete.name)}</span>
        </div>
        <span class="text-sm font-medium text-off-white">${athlete.name}</span>
      </div>
    `
      )
      .join('');
  }

getInitials(name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2);
  }

handleCreateSession() {
    const name = document.getElementById('sessionName').value.trim();
    const location = document.getElementById('sessionLocation').value.trim();
    const type = document.getElementById('sessionType').value;
    const date = document.getElementById('sessionDate').value;
    const time = document.getElementById('sessionTime').value;
    const compCategory = document.getElementById('competitionCategory').value;
    const compType = document.getElementById('competitionType').value;
    if (!name || !location || !type || !date) {
      alert(t('fill_all_details'));
      return;
    }

if (type === 'competition' && (!compCategory || !compType)) {
      alert(t('select_category_type'));
      return;
    }

if (this.selectedAthletes.size === 0) {
      alert(t('select_one_athlete'));
      return;
    }
    const session = {
      id: Date.now(),
      name,
      location,
      type,
      date,
      time,
      competitionCategory: type === 'competition' ? compCategory : null,
      competitionType: type === 'competition' ? compType : null,
      athletes: Array.from(this.selectedAthletes),
      createdAt: new Date().toISOString(),
    };
    const sessions = JSON.parse(localStorage.getItem('sessions')) || [];
    sessions.push(session);
    localStorage.setItem('sessions', JSON.stringify(sessions));
    window.location.href = 'index.html';
  }
}
let newSessionPage;
document.addEventListener('DOMContentLoaded', () => {
  newSessionPage = new NewSessionPage();
});