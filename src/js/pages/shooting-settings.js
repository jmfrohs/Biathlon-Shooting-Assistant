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

class ShootingSettingsPage {
  constructor() {
    this.currentEditingTarget = null;
    this.targetTypeOptions = [
      { id: 'scheibe1', label: 'scheibe1_name' },
      { id: 'scheibe2', label: 'scheibe2_name' },
    ];
    this.clickValueOptions = [2.0, 3.0, 4.0, 6.0];
    this.shotSizeOptions = [4, 6, 8, 10];
  }

  init() {
    if (typeof translateApp === 'function') {
      translateApp();
    }

    this.updateTargetTypeDisplay();
    this.updateClickValueDisplay();
    this.updateShotSizeDisplay();
    this.updateShotAppearanceDisplay();
    this.loadDefaultShootingTimes();
    this.updateAutoSaveGlobalUI();
    this.updateAutoSaveDelayUI();

    window.shootingSettingsPage = this;
  }

  getTargetType() {
    return localStorage.getItem('b_target_type') || 'scheibe1';
  }

  setTargetType(type) {
    localStorage.setItem('b_target_type', type);
    this.updateTargetTypeDisplay();
    this.renderTargetTypeOptions();
    setTimeout(() => this.closeTargetTypeModal(), 150);
  }

  openCustomTargetsModal() {
    this.renderCustomTargetsList();
    document.getElementById('custom-targets-modal')?.classList.remove('hidden');
    document.getElementById('target-type-modal')?.classList.add('hidden');
  }

  returnToTargetTypeModal() {
    document.getElementById('custom-targets-modal')?.classList.add('hidden');
    this.openTargetTypeModal();
  }

  closeCustomTargetsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('custom-targets-modal')?.classList.add('hidden');
  }

  renderCustomTargetsList() {
    const list = document.getElementById('custom-targets-list');
    if (!list || typeof targetManager === 'undefined') return;

    list.innerHTML = '';
    const targets = targetManager.customTargets;
    if (targets.length === 0) {
      list.innerHTML =
        '<div class="text-center py-8 text-zinc-500 italic text-sm">Noch keine eigenen Scheiben.</div>';
      return;
    }

    targets.forEach((target) => {
      const item = document.createElement('div');
      item.className =
        'bg-off-white/5 border border-subtle rounded-xl p-3 flex items-center justify-between';
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 flex-shrink-0">
            ${targetManager.generateSvgFromObject(target)}
          </div>
          <span class="font-bold text-sm text-off-white truncate max-w-[120px]">${target.name}</span>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="shootingSettingsPage?.editTarget('${target.id}')" class="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-lg">edit</span>
          </button>
          <button type="button" onclick="shootingSettingsPage?.deleteTargetHelper('${target.id}')" class="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  createNewTarget() {
    if (typeof targetManager === 'undefined') return;

    const target = targetManager.createTarget('Neue Scheibe');
    this.editTarget(target.id);
  }

  editTarget(id) {
    if (typeof targetManager === 'undefined') return;

    this.currentEditingTarget = JSON.parse(JSON.stringify(targetManager.getTargetById(id)));
    this.renderTargetEditor();
    document.getElementById('target-editor-modal')?.classList.remove('hidden');
    document.getElementById('custom-targets-modal')?.classList.add('hidden');
  }

  renderTargetEditor() {
    if (!this.currentEditingTarget) return;

    const nameInput = document.getElementById('edit-target-name');
    if (nameInput) nameInput.value = this.currentEditingTarget.name;

    const crosshair = this.currentEditingTarget.crosshair || {
      visible: false,
      color: '#000000',
      width: 1,
      opacity: 0.5,
    };

    const visibleInput = document.getElementById('edit-crosshair-visible');
    const colorInput = document.getElementById('edit-crosshair-color');
    const widthInput = document.getElementById('edit-crosshair-width');
    const settingsDiv = document.getElementById('crosshair-settings');

    if (visibleInput) visibleInput.checked = !!crosshair.visible;
    if (colorInput) colorInput.value = crosshair.color;
    if (widthInput) widthInput.value = crosshair.width;
    if (settingsDiv) {
      if (crosshair.visible) settingsDiv.classList.remove('hidden');
      else settingsDiv.classList.add('hidden');
    }

    this.renderRingsList();
    this.updateTargetPreview();
  }

  renderRingsList() {
    const list = document.getElementById('rings-list');
    if (!list || !this.currentEditingTarget) return;

    list.innerHTML = '';
    this.currentEditingTarget.rings.forEach((ring, index) => {
      const item = document.createElement('div');
      item.className = 'bg-off-white/5 border border-subtle/50 rounded-xl p-3 space-y-2';
      item.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <span class="text-xs font-bold text-zinc-500 uppercase">Ring ${index + 1}</span>
          <button type="button" onclick="shootingSettingsPage?.removeRing(${index})" class="text-red-500 hover:opacity-80">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[9px] text-zinc-500 uppercase font-bold">Radius</label>
            <input type="number" value="${ring.r}" onchange="shootingSettingsPage?.updateRingValue(${index}, 'r', this.value)" class="w-full bg-black/20 rounded border border-subtle px-2 py-1 text-sm text-off-white" />
          </div>
          <div>
            <label class="text-[9px] text-zinc-500 uppercase font-bold">Text</label>
            <input type="text" value="${ring.text || ''}" onchange="shootingSettingsPage?.updateRingValue(${index}, 'text', this.value)" class="w-full bg-black/20 rounded border border-subtle px-2 py-1 text-sm text-off-white" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-[9px] text-zinc-500 uppercase font-bold">Fill</label>
            <input type="color" value="${ring.fill}" onchange="shootingSettingsPage?.updateRingValue(${index}, 'fill', this.value)" class="w-full h-6 bg-transparent rounded cursor-pointer mt-1" />
          </div>
          <div>
            <label class="text-[9px] text-zinc-500 uppercase font-bold">Stroke</label>
            <input type="color" value="${ring.stroke}" onchange="shootingSettingsPage?.updateRingValue(${index}, 'stroke', this.value)" class="w-full h-6 bg-transparent rounded cursor-pointer mt-1" />
          </div>
          <div>
            <label class="text-[9px] text-zinc-500 uppercase font-bold">Text Color</label>
            <input type="color" value="${ring.textColor || '#000000'}" onchange="shootingSettingsPage?.updateRingValue(${index}, 'textColor', this.value)" class="w-full h-6 bg-transparent rounded cursor-pointer mt-1" />
          </div>
        </div>
      `;
      list.appendChild(item);
    });
  }

  addRing() {
    if (!this.currentEditingTarget) return;

    this.currentEditingTarget.rings.push({
      r: 20,
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
      text: '',
      textColor: '#000000',
    });
    this.renderRingsList();
    this.updateTargetPreview();
  }

  removeRing(index) {
    if (!this.currentEditingTarget) return;

    this.currentEditingTarget.rings.splice(index, 1);
    this.renderRingsList();
    this.updateTargetPreview();
  }

  updateRingValue(index, field, value) {
    if (!this.currentEditingTarget) return;

    if (field === 'r' || field === 'strokeWidth') {
      value = parseFloat(value);
    }
    this.currentEditingTarget.rings[index][field] = value;
    this.updateTargetPreview();
  }

  updateTargetPreview() {
    if (!this.currentEditingTarget || typeof targetManager === 'undefined') return;

    const preview = document.getElementById('target-preview-container');
    if (preview) {
      preview.innerHTML = targetManager.generateSvgFromObject(this.currentEditingTarget);
    }
  }

  saveTarget() {
    if (!this.currentEditingTarget || typeof targetManager === 'undefined') return;

    const nameInput = document.getElementById('edit-target-name');
    if (nameInput) {
      this.currentEditingTarget.name = nameInput.value.trim() || this.currentEditingTarget.name;
    }

    const visibleInput = document.getElementById('edit-crosshair-visible');
    const colorInput = document.getElementById('edit-crosshair-color');
    const widthInput = document.getElementById('edit-crosshair-width');

    this.currentEditingTarget.crosshair = {
      ...(this.currentEditingTarget.crosshair || {}),
      visible: !!visibleInput?.checked,
      color: colorInput?.value || '#000000',
      width: parseFloat(widthInput?.value || '1'),
    };

    targetManager.updateTarget(this.currentEditingTarget.id, this.currentEditingTarget);
    this.closeTargetEditor();
    this.openCustomTargetsModal();
  }

  returnToCustomTargets() {
    document.getElementById('target-editor-modal')?.classList.add('hidden');
    this.currentEditingTarget = null;
    this.openCustomTargetsModal();
  }

  closeTargetEditor(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('target-editor-modal')?.classList.add('hidden');
    this.currentEditingTarget = null;
  }

  deleteTargetHelper(id) {
    if (typeof targetManager === 'undefined') return;

    if (confirm('Diese eigene Scheibe wirklich löschen?')) {
      targetManager.deleteTarget(id);
      this.renderCustomTargetsList();
    }
  }

  updateTargetTypeDisplay() {
    const display = document.getElementById('target-type-display');
    if (!display || typeof targetManager === 'undefined') return;
    const target = targetManager.getTargetById(this.getTargetType());
    display.textContent = target ? target.name : this.getTargetType();
  }

  openTargetTypeModal() {
    this.renderTargetTypeOptions();
    document.getElementById('target-type-modal').classList.remove('hidden');
  }

  closeTargetTypeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('target-type-modal').classList.add('hidden');
  }

  renderTargetTypeOptions() {
    const container = document.getElementById('target-type-options');
    if (!container || typeof targetManager === 'undefined') return;
    const currentType = this.getTargetType();
    container.innerHTML = '';

    targetManager.getAllTargets().forEach((target) => {
      const button = document.createElement('button');
      const isSelected = currentType === target.id;
      button.type = 'button';
      button.className = `w-full p-4 rounded-xl border text-left transition-all active:scale-95 ${
        isSelected
          ? 'bg-primary/20 border-primary'
          : 'bg-off-white/5 border-subtle hover:bg-off-white/10'
      }`;
      button.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-off-white font-semibold">${target.name}</p>
            <p class="text-xs text-zinc-400 mt-1">${target.id.startsWith('custom_') ? 'Eigene Scheibe' : 'Systemscheibe'}</p>
          </div>
          <span class="material-symbols-outlined text-primary text-2xl ${isSelected ? '' : 'hidden'}">check_circle</span>
        </div>
      `;
      button.onclick = () => this.setTargetType(target.id);
      container.appendChild(button);
    });
  }

  getClickValue() {
    return parseFloat(localStorage.getItem('b_click_value')) || 3.0;
  }

  saveClickValue(value) {
    localStorage.setItem('b_click_value', value);
    this.updateClickValueDisplay();
    this.renderClickValueOptions();
  }

  updateClickValueDisplay() {
    const display = document.getElementById('click-value-display');
    if (display) {
      display.textContent = `${this.getClickValue().toFixed(1)} mm`;
    }
  }

  openClickValueModal() {
    this.renderClickValueOptions();
    document.getElementById('click-value-modal').classList.remove('hidden');
  }

  closeClickValueModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('click-value-modal').classList.add('hidden');
  }

  renderClickValueOptions() {
    const container = document.getElementById('click-value-options');
    if (!container) return;
    const currentValue = this.getClickValue();
    container.innerHTML = '';

    this.clickValueOptions.forEach((value) => {
      const button = document.createElement('button');
      const isSelected = currentValue === value;
      button.type = 'button';
      button.className = `w-full p-4 rounded-xl border text-left transition-all active:scale-95 ${
        isSelected
          ? 'bg-primary/20 border-primary'
          : 'bg-off-white/5 border-subtle hover:bg-off-white/10'
      }`;
      button.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <p class="text-off-white font-semibold">${value.toFixed(1)} mm</p>
            <p class="text-xs text-zinc-400 mt-1">${value === 3 ? 'Standard' : 'Voreinstellung'}</p>
          </div>
          <span class="material-symbols-outlined text-primary text-2xl ${isSelected ? '' : 'hidden'}">check_circle</span>
        </div>
      `;
      button.onclick = () => this.saveClickValue(value);
      container.appendChild(button);
    });
  }

  saveCustomClickValue() {
    const input = document.getElementById('custom-click-input');
    if (!input) return;
    const value = parseFloat(input.value);
    if (Number.isNaN(value) || value < 0.5 || value > 10.0) {
      alert('Bitte einen Wert zwischen 0,5 und 10,0 mm eingeben.');
      return;
    }
    this.saveClickValue(value);
    input.value = '';
  }

  getShotSize() {
    return parseFloat(localStorage.getItem('b_shot_size')) || 6;
  }

  saveShotSize(value) {
    localStorage.setItem('b_shot_size', value);
    this.updateShotSizeDisplay();
    this.renderShotSizeOptions();
  }

  updateShotSizeDisplay() {
    const display = document.getElementById('shot-size-display');
    if (!display) return;
    const value = this.getShotSize();
    display.textContent = `${value}px`;
  }

  openShotSizeModal() {
    this.renderShotSizeOptions();
    document.getElementById('shot-size-modal').classList.remove('hidden');
  }

  closeShotSizeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('shot-size-modal').classList.add('hidden');
  }

  renderShotSizeOptions() {
    const container = document.getElementById('shot-size-options');
    if (!container) return;
    const currentValue = this.getShotSize();
    container.innerHTML = '';

    this.shotSizeOptions.forEach((value) => {
      const button = document.createElement('button');
      const isSelected = currentValue === value;
      button.type = 'button';
      button.className = `w-full p-4 rounded-xl border text-left transition-all active:scale-95 ${
        isSelected
          ? 'bg-primary/20 border-primary'
          : 'bg-off-white/5 border-subtle hover:bg-off-white/10'
      }`;
      button.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <p class="text-off-white font-semibold">${value}px</p>
            <p class="text-xs text-zinc-400 mt-1">Schussdurchmesser</p>
          </div>
          <span class="material-symbols-outlined text-primary text-2xl ${isSelected ? '' : 'hidden'}">check_circle</span>
        </div>
      `;
      button.onclick = () => this.saveShotSize(value);
      container.appendChild(button);
    });
  }

  saveCustomShotSize() {
    const input = document.getElementById('custom-shot-input');
    if (!input) return;
    const value = parseFloat(input.value);
    if (Number.isNaN(value) || value < 2 || value > 20) {
      alert('Bitte einen Wert zwischen 2 und 20 px eingeben.');
      return;
    }
    this.saveShotSize(value);
    input.value = '';
  }

  getShotLabelContent() {
    return localStorage.getItem('b_shot_label_content') || 'number';
  }

  getHitColor() {
    return localStorage.getItem('b_hit_color') || '#32D74B';
  }

  getHitLabelColor() {
    return localStorage.getItem('b_hit_label_color') || '#FFFFFF';
  }

  getMissColor() {
    return localStorage.getItem('b_miss_color') || '#FF453A';
  }

  getMissLabelColor() {
    return localStorage.getItem('b_miss_label_color') || '#FFFFFF';
  }

  getGhostShotColor() {
    return localStorage.getItem('b_ghost_shot_color') || '#007AFF';
  }

  getGhostLabelColor() {
    return localStorage.getItem('b_ghost_label_color') || '#FFFFFF';
  }

  updateShotAppearanceDisplay() {
    const display = document.getElementById('shot-appearance-display');
    if (!display) return;
    const labels = {
      number: 'Nummer',
      ring: 'Ring',
      none: 'Keine',
    };
    display.textContent = labels[this.getShotLabelContent()] || 'Nummer';
  }

  openShotAppearanceModal() {
    document.getElementById('shot-appearance-modal').classList.remove('hidden');
    document.getElementById('hit-color-picker').value = this.getHitColor();
    document.getElementById('hit-label-color-picker').value = this.getHitLabelColor();
    document.getElementById('miss-color-picker').value = this.getMissColor();
    document.getElementById('miss-label-color-picker').value = this.getMissLabelColor();
    document.getElementById('ghost-color-picker').value = this.getGhostShotColor();
    document.getElementById('ghost-label-color-picker').value = this.getGhostLabelColor();
    document.getElementById('shot-label-content-select').value = this.getShotLabelContent();
  }

  closeShotAppearanceModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('shot-appearance-modal').classList.add('hidden');
  }

  saveShotAppearance() {
    localStorage.setItem('b_hit_color', document.getElementById('hit-color-picker').value);
    localStorage.setItem(
      'b_hit_label_color',
      document.getElementById('hit-label-color-picker').value
    );
    localStorage.setItem('b_miss_color', document.getElementById('miss-color-picker').value);
    localStorage.setItem(
      'b_miss_label_color',
      document.getElementById('miss-label-color-picker').value
    );
    localStorage.setItem('b_ghost_shot_color', document.getElementById('ghost-color-picker').value);
    localStorage.setItem(
      'b_ghost_label_color',
      document.getElementById('ghost-label-color-picker').value
    );
    localStorage.setItem(
      'b_shot_label_content',
      document.getElementById('shot-label-content-select').value
    );
    this.updateShotAppearanceDisplay();
  }

  resetShotAppearanceToDefault() {
    localStorage.removeItem('b_hit_color');
    localStorage.removeItem('b_hit_label_color');
    localStorage.removeItem('b_miss_color');
    localStorage.removeItem('b_miss_label_color');
    localStorage.removeItem('b_ghost_shot_color');
    localStorage.removeItem('b_ghost_label_color');
    localStorage.removeItem('b_shot_label_content');
    this.openShotAppearanceModal();
    this.updateShotAppearanceDisplay();
  }

  loadDefaultShootingTimes() {
    const proneInput = document.getElementById('default-prone-time');
    const standingInput = document.getElementById('default-standing-time');
    if (proneInput) proneInput.value = localStorage.getItem('b_default_time_prone') || '20';
    if (standingInput)
      standingInput.value = localStorage.getItem('b_default_time_standing') || '15';
  }

  saveDefaultShootingTimes() {
    const proneInput = document.getElementById('default-prone-time');
    const standingInput = document.getElementById('default-standing-time');
    if (proneInput) localStorage.setItem('b_default_time_prone', proneInput.value);
    if (standingInput) localStorage.setItem('b_default_time_standing', standingInput.value);
  }

  toggleAutoSaveGlobal() {
    const currentState = localStorage.getItem('b_auto_save_enabled') === 'true';
    const newState = !currentState;
    localStorage.setItem('b_auto_save_enabled', newState);
    this.updateAutoSaveGlobalUI();
  }

  updateAutoSaveGlobalUI() {
    const toggle = document.getElementById('auto-save-toggle');
    const knob = document.getElementById('auto-save-knob');
    if (!toggle || !knob) return;
    const enabled = localStorage.getItem('b_auto_save_enabled') === 'true';
    if (enabled) {
      toggle.classList.remove('bg-zinc-700');
      toggle.classList.add('bg-primary');
      knob.style.transform = 'translateX(20px)';
    } else {
      toggle.classList.add('bg-zinc-700');
      toggle.classList.remove('bg-primary');
      knob.style.transform = 'translateX(0px)';
    }
  }

  saveAutoSaveDelay(value) {
    localStorage.setItem('b_auto_save_delay', value);
    this.updateAutoSaveDelayUI();
  }

  updateAutoSaveDelayUI() {
    const val =
      typeof getAutoSaveDelay === 'function'
        ? getAutoSaveDelay()
        : parseInt(localStorage.getItem('b_auto_save_delay')) || 500;
    const display = document.getElementById('auto-save-delay-display');
    const slider = document.getElementById('auto-save-delay-slider');
    if (display) display.textContent = `${(val / 1000).toFixed(1)} s`;
    if (slider) slider.value = val;
  }
}

function navigateBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = 'menu.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const page = new ShootingSettingsPage();
  window.shootingSettingsPage = page;
  page.init();
});
