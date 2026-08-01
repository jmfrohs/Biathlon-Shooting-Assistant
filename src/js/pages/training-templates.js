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

class TrainingTemplatesPage {
  constructor() {
    this.currentEditingTemplate = null;
    this.positions = [];
  }

  posToLetter(pos) {
    return pos === t('prone') || pos === 'Liegend' || pos === 'prone' ? 'L' : 'S';
  }

  renderTemplatesList() {
    const list = document.getElementById('training-templates-list');
    const templates = trainingTemplateManager.getAll();
    if (templates.length === 0) {
      list.innerHTML =
        '<div class="text-center text-light-blue-info/50 py-4">Keine Vorlagen vorhanden</div>';
      return;
    }

    list.innerHTML = templates
      .map((template) => {
        const shotsLabel = template.shotsPerSeries
          ? ` (${template.shotsPerSeries} ${t('shots_abbr') || 'Schuss'})`
          : ' (5 Schuss)';
        const positionSummary =
          template.positions.map((p) => this.posToLetter(p)).join(' ') + shotsLabel;
        const isDefault = template.isDefault;
        return `
          <div class="bg-off-white/5 border border-subtle rounded-2xl p-4">
            <div class="flex items-start justify-between mb-2 gap-3">
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-off-white">${template.name}</p>
                <p class="text-xs text-light-blue-info">${template.description || ''}</p>
                <p class="text-xs text-light-blue-info/50 mt-1 font-mono">${positionSummary}</p>
              </div>
              ${
                !isDefault
                  ? `
                      <div class="flex gap-2 shrink-0">
                        <button
                          onclick="trainingTemplatesPage?.editTemplate('${template.id}')"
                          class="p-2 hover:bg-off-white/10 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onclick="trainingTemplatesPage?.duplicateTemplate('${template.id}')"
                          class="p-2 hover:bg-off-white/10 rounded-lg transition-colors"
                          title="Duplizieren"
                        >
                          <span class="material-symbols-outlined text-sm">content_copy</span>
                        </button>
                        <button
                          onclick="trainingTemplatesPage?.deleteTemplate('${template.id}')"
                          class="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <span class="material-symbols-outlined text-sm text-red-400">delete</span>
                        </button>
                      </div>
                    `
                  : '<span class="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full shrink-0">Standard</span>'
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  openTemplateEditor() {
    this.currentEditingTemplate = null;
    this.positions = [];
    const title = document.getElementById('template-editor-title');
    title.removeAttribute('data-i18n');
    title.textContent = 'Neue Vorlage erstellen';
    document.getElementById('template-name').value = '';
    document.getElementById('template-description').value = '';
    const shotsEl = document.getElementById('template-shots-per-series');
    if (shotsEl) shotsEl.value = '5';
    this.renderPositions();
    document.getElementById('template-editor-modal').classList.remove('hidden');
  }

  editTemplate(templateId) {
    const template = trainingTemplateManager.getById(templateId);
    if (!template) return;
    this.currentEditingTemplate = templateId;
    this.positions = [...template.positions];
    const title = document.getElementById('template-editor-title');
    title.removeAttribute('data-i18n');
    title.textContent = 'Vorlage bearbeiten';
    document.getElementById('template-name').value = template.name;
    document.getElementById('template-description').value = template.description || '';
    const shotsEl = document.getElementById('template-shots-per-series');
    if (shotsEl) shotsEl.value = template.shotsPerSeries || '5';
    this.renderPositions();
    document.getElementById('template-editor-modal').classList.remove('hidden');
  }

  addPosition(position) {
    this.positions.push(position);
    this.renderPositions();
    const container = document.getElementById('positions-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  bindPositionDragEvents() {
    const container = document.getElementById('positions-container');
    if (!container) return;

    let draggedItem = null;
    let touchState = null;
    let currentDropTarget = null;

    const setDropHighlight = (targetItem) => {
      if (currentDropTarget && currentDropTarget !== targetItem) {
        currentDropTarget.classList.remove('drop-highlight');
      }
      currentDropTarget = targetItem || null;
      if (currentDropTarget) {
        currentDropTarget.classList.add('drop-highlight');
      }
    };

    const clearDropHighlight = () => {
      if (currentDropTarget) {
        currentDropTarget.classList.remove('drop-highlight');
        currentDropTarget = null;
      }
    };

    const getDragAfterElement = (y) => {
      const items = [...container.querySelectorAll('.position-item:not(.is-dragging)')];
      let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
      items.forEach((item) => {
        const box = item.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          closest = { offset, element: item };
        }
      });
      return closest.element;
    };

    const syncArrayAndLabels = () => {
      const items = [...container.querySelectorAll('.position-item')];
      this.positions = items.map((item) => item.dataset.pos);
      items.forEach((item, idx) => {
        item.dataset.index = idx.toString();
        const label = item.querySelector('.pos-label');
        if (label) {
          label.textContent = `${idx + 1}. ${item.dataset.pos}`;
        }
        const removeBtn = item.querySelector('.pos-remove-btn');
        if (removeBtn) {
          removeBtn.setAttribute('data-idx', idx.toString());
        }
      });
    };

    const items = container.querySelectorAll('.position-item');
    items.forEach((item) => {
      // Desktop Drag & Drop
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try {
            e.dataTransfer.setData('text/plain', item.dataset.index);
          } catch {}
        }
      });

      item.addEventListener('dragover', (e) => {
        if (!draggedItem) return;
        e.preventDefault();
        const afterElement = getDragAfterElement(e.clientY);
        setDropHighlight(afterElement);
        if (afterElement) {
          container.insertBefore(draggedItem, afterElement);
        } else {
          container.appendChild(draggedItem);
        }
      });

      item.addEventListener('dragend', () => {
        if (!draggedItem) return;
        draggedItem.classList.remove('is-dragging');
        draggedItem = null;
        clearDropHighlight();
        syncArrayAndLabels();
      });

      // Touch Drag (Mobile)
      item.addEventListener(
        'touchstart',
        (e) => {
          if (e.target.closest('button')) return;
          const touch = e.touches[0];
          touchState = {
            item,
            startY: touch.clientY,
            active: false,
            timer: setTimeout(() => {
              if (!touchState) return;
              touchState.active = true;
              item.classList.add('is-dragging');
            }, 100),
          };
        },
        { passive: true }
      );

      item.addEventListener(
        'touchmove',
        (e) => {
          if (!touchState || !touchState.active) return;
          if (e.cancelable) e.preventDefault();
          const touch = e.touches[0];
          const afterElement = getDragAfterElement(touch.clientY);
          setDropHighlight(afterElement);
          if (afterElement) {
            container.insertBefore(touchState.item, afterElement);
          } else {
            container.appendChild(touchState.item);
          }
        },
        { passive: false }
      );

      item.addEventListener('touchend', () => {
        if (!touchState) return;
        clearTimeout(touchState.timer);
        if (touchState.active) {
          touchState.item.classList.remove('is-dragging');
          clearDropHighlight();
          syncArrayAndLabels();
        }
        touchState = null;
      });

      item.addEventListener('touchcancel', () => {
        if (!touchState) return;
        clearTimeout(touchState.timer);
        touchState.item.classList.remove('is-dragging');
        clearDropHighlight();
        touchState = null;
      });
    });
  }

  removePosition(index) {
    this.positions.splice(index, 1);
    this.renderPositions();
  }

  renderPositions() {
    const container = document.getElementById('positions-container');
    if (!container) return;
    if (this.positions.length === 0) {
      container.innerHTML =
        '<p class="text-xs text-light-blue-info/50 italic">Keine Positionen ausgewählt</p>';
      return;
    }

    container.innerHTML = this.positions
      .map((pos, idx) => {
        const isProne = this.posToLetter(pos) === 'L';
        const bgColor = isProne
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30';

        return `
          <div
            class="position-item flex items-center justify-between ${bgColor} px-3 py-2 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none touch-none"
            data-index="${idx}"
            data-pos="${pos}"
            draggable="true"
          >
            <div class="flex items-center gap-2 pointer-events-none">
              <span class="material-symbols-outlined text-sm opacity-60">drag_indicator</span>
              <span class="pos-label font-medium text-sm">${idx + 1}. ${pos}</span>
            </div>
            <button
              type="button"
              onclick="trainingTemplatesPage?.removePosition(parseInt(this.getAttribute('data-idx') || '${idx}'))"
              data-idx="${idx}"
              class="pos-remove-btn p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Löschen"
            >
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        `;
      })
      .join('');

    this.bindPositionDragEvents();
  }

  saveTemplate() {
    const name = document.getElementById('template-name').value.trim();
    const description = document.getElementById('template-description').value.trim();
    if (!name || this.positions.length === 0) {
      alert('Bitte Name und mindestens eine Position ausfüllen.');
      return;
    }

    const shotsEl = document.getElementById('template-shots-per-series');
    const shotsPerSeries = shotsEl ? parseInt(shotsEl.value) || 5 : 5;

    try {
      if (this.currentEditingTemplate) {
        trainingTemplateManager.update(
          this.currentEditingTemplate,
          name,
          description,
          this.positions,
          shotsPerSeries
        );
      } else {
        trainingTemplateManager.create(name, description, this.positions, shotsPerSeries);
      }
      this.closeEditorModal();
      this.renderTemplatesList();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  }

  duplicateTemplate(templateId) {
    const template = trainingTemplateManager.getById(templateId);
    if (!template) return;
    trainingTemplateManager.duplicate(templateId, template.name + ' (Kopie)');
    this.renderTemplatesList();
  }

  deleteTemplate(templateId) {
    if (!confirm('Diese Vorlage wirklich löschen?')) return;
    try {
      trainingTemplateManager.delete(templateId);
      this.renderTemplatesList();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  }

  closeEditorModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('template-editor-modal').classList.add('hidden');
  }
}

let trainingTemplatesPage = null;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof translateApp === 'function') {
    translateApp();
  }
  trainingTemplatesPage = new TrainingTemplatesPage();
  window.trainingTemplatesPage = trainingTemplatesPage;
  trainingTemplatesPage.renderTemplatesList();
});
