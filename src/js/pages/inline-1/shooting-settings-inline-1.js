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

class AmmunitionTypesSettingsPage {
  constructor() {
    this.defaultTypes = [
      {
        name: 'Lapua Polar Biathlon',
        manufacturer: 'Lapua',
      },
      {
        name: 'Lapua Biathlon Xtreme',
        manufacturer: 'Lapua',
      },
      {
        name: 'RWS Biathlon Competition',
        manufacturer: 'RWS',
      },
      {
        name: 'RWS Biathlon Special Match',
        manufacturer: 'RWS',
      },
      {
        name: 'SK Biathlon Sport',
        manufacturer: 'SK',
      },
    ];
    this.types = this.loadTypes();
    this.selectedType = this.loadSelectedType();
    this.updateSelectedDisplay();
  }

  loadTypes() {
    try {
      const parsed = JSON.parse(localStorage.getItem('b_ammunition_types') || '[]');
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : this.defaultTypes;
    } catch (e) {
      return this.defaultTypes;
    }
  }

  loadSelectedType() {
    try {
      const parsed = JSON.parse(localStorage.getItem('b_selected_ammunition_type') || 'null');
      return parsed && parsed.name ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  saveSelectedType(type) {
    this.selectedType = type;
    localStorage.setItem('b_selected_ammunition_type', JSON.stringify(type));
    this.updateSelectedDisplay();
  }

  isSelectedType(type) {
    return (
      this.selectedType &&
      this.selectedType.name === type.name &&
      this.selectedType.manufacturer === type.manufacturer
    );
  }

  updateSelectedDisplay() {
    const display = document.getElementById('ammunition-type-selected-display');
    if (!display) return;
    display.textContent = this.selectedType
      ? `${this.selectedType.name} - ${this.selectedType.manufacturer}`
      : typeof t === 'function'
        ? t('none')
        : 'Keine Auswahl';
  }

  openTypesList() {
    this.types = this.loadTypes();
    this.selectedType = this.loadSelectedType();
    this.renderTypesList();
    document.getElementById('ammunition-types-modal').classList.remove('hidden');
  }

  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('ammunition-types-modal').classList.add('hidden');
  }

  renderTypesList() {
    const list = document.getElementById('ammunition-types-list');
    if (!list) return;
    if (this.types.length === 0) {
      list.innerHTML =
        '<div class="text-center text-light-blue-info/50 py-4">Keine Munitionsarten vorhanden</div>';
      return;
    }
    list.innerHTML = this.types
      .map(
        (type, idx) => `
                <button
                  type="button"
                  class="ammo-type-item w-full text-left bg-off-white/5 border ${this.isSelectedType(type) ? 'border-primary bg-primary/10' : 'border-subtle'} rounded-2xl p-4 transition-all active:scale-95"
                  data-index="${idx}"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-semibold text-off-white">${type.name || ''}</p>
                      <p class="text-xs text-light-blue-info mt-0.5">${type.manufacturer || ''}</p>
                    </div>
                    <span class="material-symbols-outlined text-primary text-2xl ${this.isSelectedType(type) ? '' : 'hidden'}">check_circle</span>
                  </div>
                </button>
              `
      )
      .join('');
    list.querySelectorAll('.ammo-type-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        const selected = this.types[idx];
        if (!selected) return;
        this.saveSelectedType(selected);
        this.renderTypesList();
        setTimeout(() => this.closeModal(), 150);
      });
    });
  }
}
document.addEventListener('DOMContentLoaded', () => {
  window.shootingAmmunitionPage = new AmmunitionTypesSettingsPage();
});
