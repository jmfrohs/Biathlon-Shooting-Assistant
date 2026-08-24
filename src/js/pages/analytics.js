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
 * Analytics Page Script
 * Displays athlete list for selection and handles analytics views
 */

class AnalyticsPage {
  constructor() {
    this.OVERVIEW_FILTERS_STORAGE_KEY = 'b_analytics_overview_filters';
    this.CUSTOM_ANALYTICS_STORAGE_KEY = 'b_custom_analytics';
    this.OVERVIEW_LAYOUT_ORDER_KEY = 'b_analytics_overview_layout_order';
    this.OVERVIEW_LAYOUT_HIDDEN_KEY = 'b_analytics_overview_layout_hidden';
    this.MINI_TARGET_SHOT_OPACITY_KEY = 'b_analytics_mini_target_shot_opacity';
    this.container = document.getElementById('analytics-content');
    this.analylsisSection = document.getElementById('analysis-content');
    this.analysisChevron = document.getElementById('analysis-chevron');
    this.backBtn = document.getElementById('analytics-back');
    this.title = document.getElementById('analytics-title');
    this.subtitle = document.getElementById('analytics-subtitle');
    this.athletes = [];
    this.sessions = [];
    this.currentAthleteFilter = 'all';
    this.currentSessionFilter = 'all';
    this.currentSeriesFilter = 'all';
    this.currentAthlete = null;
    this.currentSession = null;
    this.currentView = 'selection';
    this.currentAthleteSessionFilter = 'all';
    this.currentShots = [];
    this.currentSeriesList = [];
    this.userRole = localStorage.getItem('b_user_role');
    this.personalAthleteId = parseInt(localStorage.getItem('b_personal_athlete_id'));
    this.editingAnalysisId = null;
    this.isCustomAnalyticsEditMode = false;
    this.draggedCustomAnalysisItem = null;
    this.customTouchDragState = null;
    this.currentCustomDropTarget = null;
    this.customListDragBound = false;
    this.isOverviewLayoutEditMode = false;
    this.draggedOverviewItem = null;
    this.overviewTouchDragState = null;
    this.currentOverviewDropTarget = null;
    this.overviewListDragBound = false;
    this.dragAutoScrollRaf = null;
    this.dragAutoScrollTarget = null;
    this.dragAutoScrollVelocity = 0;
    this.dragPreviewElement = null;
    this.dragPreviewSource = null;
    this.dragPreviewOffsetX = 0;
    this.dragPreviewOffsetY = 0;
    this.useMiniTargetShotOpacity =
      localStorage.getItem(this.MINI_TARGET_SHOT_OPACITY_KEY) === 'true';
    this.trendOverviewDays = 7;
    this.trendDayRange = 14;
    this.analysisFilters = {
      session_id: 'all',
      athlete_id: 'all',
      series_index: 'all',
      stance: 'all',
      session_type: 'all',
      intensity: 'all',
    };
    this.loadPersistedOverviewFilters();
    this.init();
  }

  async init() {
    await Promise.all([this.loadAthletes(), this.loadSessions()]);
    this.updateAthleteSessionCounts();
    this.updateMiniTargetOpacityButton();
    this.bindCustomAnalysisEditButton();
    this.initializeOverviewLayoutEditing();

    const preselectedSessionId = this.getPreselectedSessionIdFromUrl();
    const fromSessionDetail = !!preselectedSessionId;

    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => {
        if (fromSessionDetail && preselectedSessionId) {
          window.location.href = `session-detail.html?id=${preselectedSessionId}`;
          return;
        }

        const addBtn = document.getElementById('analytics-add-btn');
        const exportLink = document.getElementById('analytics-export-link');
        const editToggleBtn = document.getElementById('analytics-edit-toggle-btn');
        if (addBtn) addBtn.classList.remove('hidden');
        if (exportLink) exportLink.classList.remove('hidden');
        if (editToggleBtn) editToggleBtn.classList.remove('hidden');
        if (this.subtitle) this.subtitle.classList.remove('hidden');
        if (this.title) this.title.classList.remove('hidden');

        if (this.userRole === 'athlete') {
          if (this.currentView === 'session_detail') {
            this.renderAthleteList();
            if (this.backBtn) this.backBtn.classList.add('hidden');
            return;
          }
        }

        if (this.currentView === 'athlete_detail') {
          this.currentAthlete = null;
          this.renderAthleteList();
        } else if (this.currentView === 'session_detail') {
          if (this.currentAthlete && this.userRole !== 'athlete') {
            this.currentSession = null;
            this.renderSeriesList();
          } else {
            this.currentSession = null;
            this.renderAthleteList();
          }
        } else if (this.currentView === 'custom_detail') {
          if (this.currentSession) {
            this.selectSession(this.currentSession);
          } else if (this.currentAthlete) {
            this.selectAthlete(this.currentAthlete);
          } else {
            this.renderAthleteList();
          }
        }
      });
    }

    if (preselectedSessionId) {
      const preselectedSession = this.sessions.find((s) => s.id === preselectedSessionId);
      if (preselectedSession) {
        this.selectSession(preselectedSession);
        this.applyAnalysisVisibility();
        this.renderCustomAnalyses();
        if (this.backBtn) this.backBtn.classList.remove('hidden');
        return;
      }
    }

    this.renderAthleteList();
    this.applyAnalysisVisibility();
    this.renderCustomAnalyses();
    if (this.backBtn) {
      this.backBtn.classList.add('hidden');
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.relative')) {
        document
          .querySelectorAll('[id^="overview-dropdown-"]')
          .forEach((d) => d.classList.add('hidden'));
        document
          .querySelectorAll('[id^="detail-dropdown-"]')
          .forEach((d) => d.classList.add('hidden'));
      }
    });
  }

  bindCustomAnalysisEditButton() {
    const editButton = document.getElementById('analytics-edit-toggle-btn');
    if (!editButton || editButton.dataset.bound === 'true') return;
    editButton.addEventListener('click', () => {
      this.setOverviewLayoutEditMode(!this.isOverviewLayoutEditMode);
    });
    editButton.dataset.bound = 'true';
    this.updateOverviewLayoutEditButton();
  }

  updateMiniTargetOpacityButton() {
    const btn = document.getElementById('analytics-shot-opacity-btn');
    if (!btn) return;
    const isCombinedDetailView =
      this.currentView === 'custom_detail' && this.viewedCustomAnalysis?.type === 'combined';
    btn.classList.toggle('hidden', !isCombinedDetailView);
    if (!isCombinedDetailView) return;

    const active = this.useMiniTargetShotOpacity;
    btn.classList.toggle('bg-primary/20', active);
    btn.classList.toggle('text-primary', active);
    btn.classList.toggle('border-primary/60', active);
    btn.classList.toggle('bg-card-dark', !active);
    btn.classList.toggle('text-off-white/70', !active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.title = active
      ? 'Schuss-Transparenz aktiv (Klick zum Deaktivieren)'
      : 'Schuss-Transparenz inaktiv (Klick zum Aktivieren)';
  }

  applyMiniTargetShotOpacityToDom() {
    const shotOpacity = this.useMiniTargetShotOpacity ? 0.42 : 1;
    document.querySelectorAll('circle[data-mini-target-shot="true"]').forEach((el) => {
      el.setAttribute('opacity', String(shotOpacity));
    });
  }

  toggleMiniTargetOpacity() {
    this.useMiniTargetShotOpacity = !this.useMiniTargetShotOpacity;
    localStorage.setItem(
      this.MINI_TARGET_SHOT_OPACITY_KEY,
      this.useMiniTargetShotOpacity ? 'true' : 'false'
    );
    this.updateMiniTargetOpacityButton();
    this.applyMiniTargetShotOpacityToDom();
  }

  updateOverviewLayoutEditButton() {
    const editButton = document.getElementById('analytics-edit-toggle-btn');
    if (!editButton) return;
    editButton.innerHTML = this.isOverviewLayoutEditMode
      ? '<span class="material-symbols-outlined text-[24px]">check</span>'
      : '<span class="material-symbols-outlined text-[24px]">edit</span>';
    editButton.title = this.isOverviewLayoutEditMode
      ? t('done') || 'Fertig'
      : t('edit') || 'Bearbeiten';
    editButton.classList.toggle('bg-primary/20', this.isOverviewLayoutEditMode);
    editButton.classList.toggle('text-primary', this.isOverviewLayoutEditMode);
    editButton.classList.toggle('text-off-white/70', !this.isOverviewLayoutEditMode);
    editButton.classList.toggle('border-primary/60', this.isOverviewLayoutEditMode);
  }

  getOverviewLayoutContainer() {
    return document.getElementById('analysis-content');
  }

  getScrollableAncestor(element) {
    let node = element;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll)/.test(style.overflowY);
      if (canScrollY && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  stopDragAutoScroll() {
    if (this.dragAutoScrollRaf) {
      window.cancelAnimationFrame(this.dragAutoScrollRaf);
      this.dragAutoScrollRaf = null;
    }
    this.dragAutoScrollTarget = null;
    this.dragAutoScrollVelocity = 0;
  }

  maybeAutoScrollWhileDragging(sourceElement, pointerY) {
    const scrollTarget = this.getScrollableAncestor(sourceElement);
    if (!scrollTarget) {
      this.stopDragAutoScroll();
      return;
    }

    const rect = scrollTarget.getBoundingClientRect();
    const threshold = 72;
    let velocity = 0;

    if (pointerY < rect.top + threshold) {
      velocity = -Math.min(18, Math.max(3, Math.round((rect.top + threshold - pointerY) / 6)));
    } else if (pointerY > rect.bottom - threshold) {
      velocity = Math.min(18, Math.max(3, Math.round((pointerY - (rect.bottom - threshold)) / 6)));
    }

    if (velocity === 0) {
      this.stopDragAutoScroll();
      return;
    }

    this.dragAutoScrollTarget = scrollTarget;
    this.dragAutoScrollVelocity = velocity;

    if (this.dragAutoScrollRaf) return;

    const tick = () => {
      if (!this.dragAutoScrollTarget || this.dragAutoScrollVelocity === 0) {
        this.stopDragAutoScroll();
        return;
      }
      this.dragAutoScrollTarget.scrollTop += this.dragAutoScrollVelocity;
      this.dragAutoScrollRaf = window.requestAnimationFrame(tick);
    };

    this.dragAutoScrollRaf = window.requestAnimationFrame(tick);
  }

  createTouchDragPreview(sourceElement, pointerX, pointerY) {
    this.removeTouchDragPreview();
    if (!sourceElement) return;

    const rect = sourceElement.getBoundingClientRect();
    const clone = sourceElement.cloneNode(true);
    clone.classList.add('drag-floating-preview');
    clone.style.width = `${Math.max(120, Math.round(rect.width))}px`;
    clone.style.height = `${Math.max(48, Math.round(rect.height))}px`;
    clone.style.opacity = '0.98';

    this.dragPreviewOffsetX = Math.min(rect.width * 0.5, Math.max(28, pointerX - rect.left));
    this.dragPreviewOffsetY = Math.min(rect.height * 0.5, Math.max(18, pointerY - rect.top));
    this.dragPreviewElement = clone;
    this.dragPreviewSource = sourceElement;
    sourceElement.classList.add('drag-source-active');

    document.body.appendChild(clone);
    this.updateTouchDragPreviewPosition(pointerX, pointerY);
  }

  updateTouchDragPreviewPosition(pointerX, pointerY) {
    if (!this.dragPreviewElement) return;
    const x = pointerX - this.dragPreviewOffsetX;
    const y = pointerY - this.dragPreviewOffsetY;
    this.dragPreviewElement.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.03)`;
  }

  removeTouchDragPreview() {
    if (this.dragPreviewSource) {
      this.dragPreviewSource.classList.remove('drag-source-active');
    }
    this.dragPreviewSource = null;
    if (this.dragPreviewElement && this.dragPreviewElement.parentElement) {
      this.dragPreviewElement.parentElement.removeChild(this.dragPreviewElement);
    }
    this.dragPreviewElement = null;
  }

  getOverviewLayoutItems() {
    const container = this.getOverviewLayoutContainer();
    if (!container) return [];
    return Array.from(container.querySelectorAll('[data-overview-analysis-id]'));
  }

  getStoredOverviewHiddenSet() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.OVERVIEW_LAYOUT_HIDDEN_KEY) || '[]');
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map((v) => String(v)));
    } catch {
      localStorage.removeItem(this.OVERVIEW_LAYOUT_HIDDEN_KEY);
      return new Set();
    }
  }

  saveStoredOverviewHiddenSet(hiddenSet) {
    localStorage.setItem(this.OVERVIEW_LAYOUT_HIDDEN_KEY, JSON.stringify([...hiddenSet]));
  }

  saveOverviewLayoutOrder() {
    const ids = this.getOverviewLayoutItems()
      .map((item) => item.dataset.overviewAnalysisId)
      .filter(Boolean);
    localStorage.setItem(this.OVERVIEW_LAYOUT_ORDER_KEY, JSON.stringify(ids));
  }

  applyOverviewLayoutOrder() {
    const container = this.getOverviewLayoutContainer();
    if (!container) return;
    let storedOrder = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(this.OVERVIEW_LAYOUT_ORDER_KEY) || '[]');
      if (Array.isArray(parsed)) storedOrder = parsed.map((id) => String(id));
    } catch {
      localStorage.removeItem(this.OVERVIEW_LAYOUT_ORDER_KEY);
    }

    if (!storedOrder.length) return;
    const byId = new Map(
      this.getOverviewLayoutItems().map((item) => [item.dataset.overviewAnalysisId, item])
    );
    storedOrder.forEach((id) => {
      const item = byId.get(id);
      if (item) {
        container.appendChild(item);
        byId.delete(id);
      }
    });
    byId.forEach((item) => container.appendChild(item));
  }

  applyOverviewHiddenVisibility() {
    const hiddenSet = this.getStoredOverviewHiddenSet();
    this.getOverviewLayoutItems().forEach((item) => {
      const id = item.dataset.overviewAnalysisId;
      item.classList.toggle('overview-temp-hidden', hiddenSet.has(id));
    });
    this.updateOverviewRestoreButton(hiddenSet.size > 0);
  }

  updateOverviewRestoreButton(hasHidden) {
    const restoreBtn = document.getElementById('analysis-edit-restore-btn');
    if (!restoreBtn) return;
    restoreBtn.disabled = !hasHidden;
    restoreBtn.classList.toggle('opacity-40', !hasHidden);
    restoreBtn.classList.toggle('cursor-not-allowed', !hasHidden);
  }

  getOverviewDragAfterElement(y) {
    const items = this.getOverviewLayoutItems().filter((item) => item !== this.draggedOverviewItem);
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    items.forEach((item) => {
      const box = item.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: item };
      }
    });
    return closest.element;
  }

  setOverviewDropHighlight(targetItem) {
    if (this.currentOverviewDropTarget && this.currentOverviewDropTarget !== targetItem) {
      this.currentOverviewDropTarget.classList.remove('drop-highlight');
    }
    this.currentOverviewDropTarget = targetItem || null;
    if (this.currentOverviewDropTarget) {
      this.currentOverviewDropTarget.classList.add('drop-highlight');
    }
  }

  clearOverviewDragVisuals() {
    if (this.draggedOverviewItem) {
      this.draggedOverviewItem.classList.remove('is-dragging');
    }

    if (this.currentOverviewDropTarget) {
      this.currentOverviewDropTarget.classList.remove('drop-highlight');
      this.currentOverviewDropTarget = null;
    }
    this.removeTouchDragPreview();
  }

  handleOverviewDragStart(event) {
    if (!this.isOverviewLayoutEditMode) {
      event.preventDefault();
      return;
    }
    this.draggedOverviewItem = event.currentTarget;
    this.draggedOverviewItem.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData(
          'text/plain',
          this.draggedOverviewItem.dataset.overviewAnalysisId || ''
        );
      } catch {}
    }
  }

  handleOverviewDragOver(event) {
    if (!this.isOverviewLayoutEditMode || !this.draggedOverviewItem) return;
    event.preventDefault();
    const container = this.getOverviewLayoutContainer();
    if (!container) return;
    this.maybeAutoScrollWhileDragging(container, event.clientY);
    const afterElement = this.getOverviewDragAfterElement(event.clientY);
    this.setOverviewDropHighlight(afterElement);
    if (afterElement) {
      container.insertBefore(this.draggedOverviewItem, afterElement);
    } else {
      container.appendChild(this.draggedOverviewItem);
    }
  }

  handleOverviewDrop(event) {
    if (!this.isOverviewLayoutEditMode) return;
    event.preventDefault();
    this.stopDragAutoScroll();
    this.saveOverviewLayoutOrder();
  }

  handleOverviewDragEnd(event) {
    event.currentTarget.classList.remove('is-dragging');
    this.stopDragAutoScroll();
    this.clearOverviewDragVisuals();
    this.draggedOverviewItem = null;
    this.saveOverviewLayoutOrder();
  }

  startOverviewTouchHoldDrag(event) {
    if (!this.isOverviewLayoutEditMode) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (event.target.closest('.overview-hide-btn')) return;
    const item = event.currentTarget;
    if (!item) return;
    this.overviewTouchDragState = {
      item,
      pointerId: event.pointerId,
      active: false,
      lastX: event.clientX,
      lastY: event.clientY,
      timerId: window.setTimeout(() => {
        if (!this.overviewTouchDragState || this.overviewTouchDragState.item !== item) return;
        this.overviewTouchDragState.active = true;
        item.classList.add('is-dragging');
        this.createTouchDragPreview(
          item,
          this.overviewTouchDragState.lastX,
          this.overviewTouchDragState.lastY
        );
      }, 220),
    };
    if (item.setPointerCapture) {
      try {
        item.setPointerCapture(event.pointerId);
      } catch {}
    }
  }

  moveOverviewTouchHoldDrag(event) {
    if (!this.overviewTouchDragState) return;
    if (event.pointerId !== this.overviewTouchDragState.pointerId) return;
    this.overviewTouchDragState.lastX = event.clientX;
    this.overviewTouchDragState.lastY = event.clientY;
    if (!this.overviewTouchDragState.active) return;
    event.preventDefault();
    const container = this.getOverviewLayoutContainer();
    if (!container) return;
    this.maybeAutoScrollWhileDragging(container, event.clientY);
    this.updateTouchDragPreviewPosition(event.clientX, event.clientY);
    this.draggedOverviewItem = this.overviewTouchDragState.item;
    const afterElement = this.getOverviewDragAfterElement(event.clientY);
    this.setOverviewDropHighlight(afterElement);
    if (afterElement) {
      container.insertBefore(this.overviewTouchDragState.item, afterElement);
    } else {
      container.appendChild(this.overviewTouchDragState.item);
    }
  }

  endOverviewTouchHoldDrag(event) {
    if (!this.overviewTouchDragState) return;
    if (event.pointerId !== this.overviewTouchDragState.pointerId) return;
    window.clearTimeout(this.overviewTouchDragState.timerId);
    this.overviewTouchDragState.item.classList.remove('is-dragging');
    if (this.overviewTouchDragState.active) {
      event.preventDefault();
      this.saveOverviewLayoutOrder();
    }

    if (this.overviewTouchDragState.item.releasePointerCapture) {
      try {
        this.overviewTouchDragState.item.releasePointerCapture(event.pointerId);
      } catch {}
    }
    this.stopDragAutoScroll();
    this.clearOverviewDragVisuals();
    this.overviewTouchDragState = null;
    this.draggedOverviewItem = null;
  }

  hideOverviewLayoutItem(itemId) {
    const hiddenSet = this.getStoredOverviewHiddenSet();
    hiddenSet.add(String(itemId));
    this.saveStoredOverviewHiddenSet(hiddenSet);
    this.applyOverviewHiddenVisibility();
  }

  restoreAllHiddenOverviewItems() {
    localStorage.setItem(this.OVERVIEW_LAYOUT_HIDDEN_KEY, JSON.stringify([]));
    this.applyOverviewHiddenVisibility();
  }

  ensureOverviewLayoutControls() {
    const items = this.getOverviewLayoutItems();
    items.forEach((item) => {
      item.classList.add('relative');
      if (!item.querySelector('.overview-layout-controls')) {
        const controls = document.createElement('div');
        controls.className =
          'overview-layout-controls hidden absolute z-20 flex items-center gap-1';
        controls.innerHTML = `
          <button type="button" class="overview-layout-control overview-handle-btn" title="Verschieben">
            <span class="material-symbols-outlined text-[18px]">drag_indicator</span>
          </button>
          <button type="button" class="overview-layout-control overview-hide-btn" title="Temporär ausblenden">
            <span class="material-symbols-outlined text-[18px]">visibility_off</span>
          </button>
        `;
        item.appendChild(controls);

        const hideBtn = controls.querySelector('.overview-hide-btn');
        if (hideBtn) {
          hideBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.hideOverviewLayoutItem(item.dataset.overviewAnalysisId);
          });
        }
      }

      if (!item.dataset.overviewDragBound) {
        item.dataset.overviewDragBound = 'true';
        item.addEventListener('dragstart', (event) => this.handleOverviewDragStart(event));
        item.addEventListener('dragend', (event) => this.handleOverviewDragEnd(event));
        item.addEventListener('pointerdown', (event) => this.startOverviewTouchHoldDrag(event));
        item.addEventListener('pointermove', (event) => this.moveOverviewTouchHoldDrag(event));
        item.addEventListener('pointerup', (event) => this.endOverviewTouchHoldDrag(event));
        item.addEventListener('pointercancel', (event) => this.endOverviewTouchHoldDrag(event));
      }

      item.setAttribute('draggable', this.isOverviewLayoutEditMode ? 'true' : 'false');
      item.classList.toggle('cursor-grab', this.isOverviewLayoutEditMode);
      const controls = item.querySelector('.overview-layout-controls');
      if (controls) controls.classList.toggle('hidden', !this.isOverviewLayoutEditMode);
    });
  }

  initializeOverviewLayoutEditing() {
    const container = this.getOverviewLayoutContainer();
    if (!container) return;

    this.applyOverviewLayoutOrder();
    this.applyOverviewHiddenVisibility();
    this.ensureOverviewLayoutControls();

    if (!this.overviewListDragBound) {
      this.overviewListDragBound = true;
      container.addEventListener('dragover', (event) => this.handleOverviewDragOver(event));
      container.addEventListener('drop', (event) => this.handleOverviewDrop(event));
      container.addEventListener(
        'click',
        (event) => {
          if (!this.isOverviewLayoutEditMode) return;
          if (event.target.closest('.overview-layout-control')) return;
          if (event.target.closest('#analysis-layout-tools')) return;
          event.preventDefault();
          event.stopPropagation();
        },
        true
      );
    }

    const restoreBtn = document.getElementById('analysis-edit-restore-btn');
    if (restoreBtn && restoreBtn.dataset.bound !== 'true') {
      restoreBtn.dataset.bound = 'true';
      restoreBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.restoreAllHiddenOverviewItems();
      });
    }

    this.updateOverviewLayoutEditButton();
  }

  setOverviewLayoutEditMode(isEditing) {
    this.isOverviewLayoutEditMode = Boolean(isEditing);
    this.updateOverviewLayoutEditButton();
    const container = this.getOverviewLayoutContainer();
    if (!container) return;
    container.classList.toggle('overview-layout-edit-active', this.isOverviewLayoutEditMode);
    const tools = document.getElementById('analysis-layout-tools');
    if (tools) {
      tools.classList.toggle('hidden', !this.isOverviewLayoutEditMode);
      tools.classList.toggle('flex', this.isOverviewLayoutEditMode);
    }
    this.ensureOverviewLayoutControls();
    this.applyOverviewHiddenVisibility();
    if (!this.isOverviewLayoutEditMode) {
      this.stopDragAutoScroll();
      this.clearOverviewDragVisuals();
      this.saveOverviewLayoutOrder();
    }
  }

  updateCustomAnalysesEditButton() {
    const editButton = document.getElementById('analytics-edit-toggle-btn');
    if (!editButton) return;
    editButton.innerHTML = this.isCustomAnalyticsEditMode
      ? '<span class="material-symbols-outlined text-[24px]">check</span>'
      : '<span class="material-symbols-outlined text-[24px]">edit</span>';
    editButton.title = this.isCustomAnalyticsEditMode
      ? t('done') || 'Fertig'
      : t('edit') || 'Bearbeiten';
    editButton.classList.toggle('bg-primary/20', this.isCustomAnalyticsEditMode);
    editButton.classList.toggle('text-primary', this.isCustomAnalyticsEditMode);
    editButton.classList.toggle('text-off-white/70', !this.isCustomAnalyticsEditMode);
    editButton.classList.toggle('border-primary/60', this.isCustomAnalyticsEditMode);
  }

  getCustomAnalyticsContainer() {
    return document.getElementById('custom-analytics-container');
  }

  getCustomAnalysisItems() {
    const container = this.getCustomAnalyticsContainer();
    if (!container) return [];
    return Array.from(container.children).filter((item) =>
      item.classList.contains('custom-analysis-item')
    );
  }

  getCustomDragAfterElement(container, y) {
    const items = this.getCustomAnalysisItems().filter(
      (item) => item !== this.draggedCustomAnalysisItem
    );
    let closest = {
      offset: Number.NEGATIVE_INFINITY,
      element: null,
    };
    items.forEach((item) => {
      const box = item.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: item };
      }
    });
    return closest.element;
  }

  setCustomDropHighlight(targetItem) {
    if (this.currentCustomDropTarget && this.currentCustomDropTarget !== targetItem) {
      this.currentCustomDropTarget.classList.remove('drop-highlight');
    }
    this.currentCustomDropTarget = targetItem || null;
    if (this.currentCustomDropTarget) {
      this.currentCustomDropTarget.classList.add('drop-highlight');
    }
  }

  clearCustomDragVisuals() {
    if (this.draggedCustomAnalysisItem) {
      this.draggedCustomAnalysisItem.classList.remove('is-dragging');
    }

    if (this.currentCustomDropTarget) {
      this.currentCustomDropTarget.classList.remove('drop-highlight');
      this.currentCustomDropTarget = null;
    }
    this.removeTouchDragPreview();
  }

  handleCustomAnalysisDragStart(event) {
    if (!this.isCustomAnalyticsEditMode) {
      event.preventDefault();
      return;
    }
    this.draggedCustomAnalysisItem = event.currentTarget;
    this.draggedCustomAnalysisItem.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData(
          'text/plain',
          this.draggedCustomAnalysisItem.dataset.analysisId || ''
        );
      } catch {}
    }
  }

  handleCustomAnalysisDragOver(event) {
    if (!this.isCustomAnalyticsEditMode || !this.draggedCustomAnalysisItem) return;
    event.preventDefault();
    const container = this.getCustomAnalyticsContainer();
    if (!container) return;
    this.maybeAutoScrollWhileDragging(container, event.clientY);
    const afterElement = this.getCustomDragAfterElement(container, event.clientY);
    this.setCustomDropHighlight(afterElement);
    if (afterElement) {
      container.insertBefore(this.draggedCustomAnalysisItem, afterElement);
    } else {
      container.appendChild(this.draggedCustomAnalysisItem);
    }
  }

  handleCustomAnalysisDrop(event) {
    if (!this.isCustomAnalyticsEditMode) return;
    event.preventDefault();
    this.stopDragAutoScroll();
    this.persistCustomAnalysesOrder();
  }

  handleCustomAnalysisDragEnd(event) {
    event.currentTarget.classList.remove('is-dragging');
    this.stopDragAutoScroll();
    this.clearCustomDragVisuals();
    this.draggedCustomAnalysisItem = null;
    this.persistCustomAnalysesOrder();
  }

  startCustomTouchHoldDrag(event) {
    if (!this.isCustomAnalyticsEditMode) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    const item = event.currentTarget;
    if (!item) return;
    this.customTouchDragState = {
      item,
      pointerId: event.pointerId,
      active: false,
      lastX: event.clientX,
      lastY: event.clientY,
      timerId: window.setTimeout(() => {
        if (!this.customTouchDragState || this.customTouchDragState.item !== item) return;
        this.customTouchDragState.active = true;
        item.classList.add('is-dragging');
        this.createTouchDragPreview(
          item,
          this.customTouchDragState.lastX,
          this.customTouchDragState.lastY
        );
      }, 220),
    };
    if (item.setPointerCapture) {
      try {
        item.setPointerCapture(event.pointerId);
      } catch {}
    }
  }

  moveCustomTouchHoldDrag(event) {
    if (!this.customTouchDragState) return;
    if (event.pointerId !== this.customTouchDragState.pointerId) return;
    this.customTouchDragState.lastX = event.clientX;
    this.customTouchDragState.lastY = event.clientY;
    if (!this.customTouchDragState.active) return;
    event.preventDefault();
    const container = this.getCustomAnalyticsContainer();
    if (!container) return;
    this.maybeAutoScrollWhileDragging(container, event.clientY);
    this.updateTouchDragPreviewPosition(event.clientX, event.clientY);
    this.draggedCustomAnalysisItem = this.customTouchDragState.item;
    const afterElement = this.getCustomDragAfterElement(container, event.clientY);
    this.setCustomDropHighlight(afterElement);
    if (afterElement) {
      container.insertBefore(this.customTouchDragState.item, afterElement);
    } else {
      container.appendChild(this.customTouchDragState.item);
    }
  }

  endCustomTouchHoldDrag(event) {
    if (!this.customTouchDragState) return;
    if (event.pointerId !== this.customTouchDragState.pointerId) return;
    window.clearTimeout(this.customTouchDragState.timerId);
    this.customTouchDragState.item.classList.remove('is-dragging');
    if (this.customTouchDragState.active) {
      event.preventDefault();
      this.persistCustomAnalysesOrder();
    }

    if (this.customTouchDragState.item.releasePointerCapture) {
      try {
        this.customTouchDragState.item.releasePointerCapture(event.pointerId);
      } catch {}
    }
    this.stopDragAutoScroll();
    this.clearCustomDragVisuals();
    this.customTouchDragState = null;
    this.draggedCustomAnalysisItem = null;
  }

  persistCustomAnalysesOrder() {
    const container = this.getCustomAnalyticsContainer();
    if (!container) return;
    const orderedIds = this.getCustomAnalysisItems()
      .map((item) => item.dataset.analysisId)
      .filter(Boolean);
    if (!orderedIds.length) return;

    const saved = JSON.parse(localStorage.getItem(this.CUSTOM_ANALYTICS_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved) || !saved.length) return;
    const byId = new Map(saved.map((entry) => [entry.id, entry]));
    const reordered = [];

    orderedIds.forEach((id) => {
      const entry = byId.get(id);
      if (entry) {
        reordered.push(entry);
        byId.delete(id);
      }
    });

    byId.forEach((entry) => reordered.push(entry));
    localStorage.setItem(this.CUSTOM_ANALYTICS_STORAGE_KEY, JSON.stringify(reordered));
  }

  initializeCustomAnalysisReordering() {
    const container = this.getCustomAnalyticsContainer();
    if (!container) return;

    this.getCustomAnalysisItems().forEach((item) => {
      item.setAttribute('draggable', this.isCustomAnalyticsEditMode ? 'true' : 'false');
      if (!item.dataset.dragBound) {
        item.dataset.dragBound = 'true';
        item.addEventListener('dragstart', (event) => this.handleCustomAnalysisDragStart(event));
        item.addEventListener('dragend', (event) => this.handleCustomAnalysisDragEnd(event));
        item.addEventListener('pointerdown', (event) => this.startCustomTouchHoldDrag(event));
        item.addEventListener('pointermove', (event) => this.moveCustomTouchHoldDrag(event));
        item.addEventListener('pointerup', (event) => this.endCustomTouchHoldDrag(event));
        item.addEventListener('pointercancel', (event) => this.endCustomTouchHoldDrag(event));
      }
    });

    if (!this.customListDragBound) {
      this.customListDragBound = true;
      container.addEventListener('dragover', (event) => this.handleCustomAnalysisDragOver(event));
      container.addEventListener('drop', (event) => this.handleCustomAnalysisDrop(event));
    }

    container.classList.toggle('analytics-edit-active', this.isCustomAnalyticsEditMode);
  }

  handleCustomAnalysisCardClick(event, id) {
    if (this.isCustomAnalyticsEditMode) {
      event.preventDefault();
      return;
    }
    this.editCustomAnalysis(id);
  }

  getPreselectedSessionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const rawSessionId = params.get('sessionId') || params.get('session');
    if (!rawSessionId) return null;

    const sessionId = parseInt(rawSessionId, 10);
    if (Number.isNaN(sessionId) || sessionId <= 0) return null;
    return sessionId;
  }

  loadPersistedOverviewFilters() {
    try {
      const persisted = JSON.parse(localStorage.getItem(this.OVERVIEW_FILTERS_STORAGE_KEY) || '{}');
      if (!persisted || typeof persisted !== 'object') return;

      Object.keys(this.analysisFilters).forEach((key) => {
        const value = persisted[key];
        if (this.isValidOverviewFilterValue(key, value)) {
          this.analysisFilters[key] = String(value);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  savePersistedOverviewFilters() {
    localStorage.setItem(this.OVERVIEW_FILTERS_STORAGE_KEY, JSON.stringify(this.analysisFilters));
  }

  isValidOverviewFilterValue(key, value) {
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    const normalized = String(value);

    if (key === 'session_id') {
      return normalized === 'all' || /^\d+(,\d+)*$/.test(normalized);
    }

    if (key === 'athlete_id') {
      return normalized === 'all' || /^\d+$/.test(normalized);
    }

    if (key === 'series_index') {
      return normalized === 'all' || /^\d+$/.test(normalized);
    }

    const allowed = {
      stance: ['all', 'prone', 'standing'],
      session_type: ['all', 'training', 'competition', 'test_competition', 'other'],
      intensity: ['all', ...INTENSITY_LEVELS, 'I1', 'I2', 'I3', 'I4', 'I5'],
    };

    return Array.isArray(allowed[key]) ? allowed[key].includes(normalized) : false;
  }

  async loadAthletes() {
    try {
      this.athletes = (await apiService.getAthletes()) || [];
      if (this.userRole === 'athlete' && this.personalAthleteId) {
        this.athletes = this.athletes.filter((a) => a.id === this.personalAthleteId);
      }
    } catch (e) {
      this.athletes = [];
    }
  }

  async loadSessions() {
    try {
      this.sessions = (await apiService.getSessions()) || [];
      if (this.userRole === 'athlete' && this.personalAthleteId) {
        this.sessions = this.sessions.filter((s) => {
          const inAthletesList = s.athletes && s.athletes.includes(this.personalAthleteId);
          const hasSeries =
            s.series && s.series.some((ser) => ser.athleteId === this.personalAthleteId);
          return inAthletesList || hasSeries;
        });
      }
    } catch (e) {
      this.sessions = [];
    }
  }

  updateAthleteSessionCounts() {
    if (!this.athletes.length || !this.sessions.length) return;

    const counts = {};
    this.sessions.forEach((session) => {
      if (session.athletes && Array.isArray(session.athletes)) {
        session.athletes.forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }

      if (session.series) {
        const uniqueInSeries = new Set();
        session.series.forEach((s) => {
          if (s.athleteId && (!session.athletes || !session.athletes.includes(s.athleteId))) {
            uniqueInSeries.add(s.athleteId);
          }
        });
        uniqueInSeries.forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }
    });

    this.athletes.forEach((athlete) => {
      athlete.sessions = counts[athlete.id] || 0;
    });
  }

  createSessionCard(session) {
    const card = document.createElement('div');
    let formattedDate = session.date;
    try {
      const parts = session.date.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10)
        );
        formattedDate = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch (e) {
      console.error(e);
    }

    const normalizedType = (session.type || '').toLowerCase();
    const typeColors = {
      training: 'bg-primary/10 text-primary border-primary/20',
      competition: 'bg-neon-green/10 text-neon-green border-neon-green/20',
      test_competition: 'bg-neon-orange/10 text-neon-orange border-neon-orange/20',
      other: 'bg-neon-red/10 text-neon-red border-neon-red/20',
      testing: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20',
      international_test: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20',
    };
    const activeColor = typeColors[normalizedType] || typeColors.training;

    let typeLabel = session.type || t('training');
    if (normalizedType === 'competition') typeLabel = t('competitions');
    else if (normalizedType === 'test_competition') typeLabel = t('test_competition');
    else if (normalizedType === 'training') typeLabel = t('training');
    else if (normalizedType === 'international_test') typeLabel = t('international_test');
    else if (normalizedType === 'other') typeLabel = t('other');
    else if (normalizedType === 'testing') typeLabel = t('testing');

    const isCompLike = normalizedType === 'competition' || normalizedType === 'test_competition';
    let compBadge = '';
    if (isCompLike && session.competitionCategory) {
      compBadge = `
            <div class="flex items-center gap-1.5 mt-2">
                <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-light-blue-info uppercase tracking-widest">${session.competitionCategory}</span>
                <span class="text-[10px] font-bold text-light-blue-info/50">${session.competitionType || ''}</span>
            </div>
        `;
    }

    const athletesCount = session.athletes ? session.athletes.length : 0;
    const seriesCount = session.seriesCount || (session.series ? session.series.length : 0);

    card.className =
      'bg-card-dark border border-subtle rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer';
    card.innerHTML = `
        <!-- Header -->
        <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
                <h3 class="text-base font-bold text-off-white tracking-tight">${session.name}</h3>
                <div class="flex items-center gap-1 mt-1">
                    <span class="material-symbols-outlined text-[14px] text-light-blue-info/60">location_on</span>
                    <p class="text-xs font-semibold text-light-blue-info/60 truncate">${session.location}</p>
                </div>
            </div>
            <div class="${activeColor} border px-3 py-1 rounded-full ml-2 flex-shrink-0">
              <span class="text-[10px] font-black uppercase tracking-wider">${typeLabel}</span>
            </div>
        </div>

        ${compBadge}

        <!-- Footer -->
        <div class="mt-3 pt-3 border-t border-subtle/50 flex items-center justify-between text-xs font-bold text-light-blue-info/60">
            <div class="flex items-center gap-3">

                <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">groups</span>
                    <span>${athletesCount} ${athletesCount === 1 ? 'Athlete' : 'Athletes'}</span>
                </div>
                ${
                  seriesCount
                    ? `<div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">reorder</span>
                    <span>${seriesCount} ${seriesCount === 1 ? 'Serie' : 'Serien'}</span>
                </div>`
                    : ''
                }
            </div>
        </div>
    `;
    card.addEventListener('click', () => {
      this.selectSession(session);
    });
    return card;
  }

  selectSession(session) {
    this.currentSession = session;
    this.currentView = 'session_detail';
    this.updateMiniTargetOpacityButton();
    this.toggleBottomNav(false);
    const switcher = document.getElementById('view-switcher');
    if (switcher) switcher.classList.add('hidden');
    if (this.title) this.title.textContent = session.name;
    if (this.backBtn) this.backBtn.classList.remove('hidden');
    this.renderSessionSeriesList(session);
  }

  renderSessionSeriesList(session) {
    if (!session) return;
    let sessionSeries = session.series || [];
    if (this.userRole === 'athlete' && this.personalAthleteId) {
      sessionSeries = sessionSeries.filter((s) => s.athleteId === this.personalAthleteId);
    }

    sessionSeries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.container.innerHTML = `
      <div class="px-1 pb-2 space-y-3">
        <div class="flex justify-between items-center bg-card-dark/50 p-3 rounded-2xl border border-subtle/20">
          <div class="flex flex-col">
            <h2 class="text-sm font-bold text-light-blue-info uppercase tracking-widest">${t('series')}</h2>
            <span class="text-[10px] text-light-blue-info/50 font-bold">${sessionSeries.length} ${t('series')}</span>
          </div>
          <div class="flex gap-2">
            <button id="session-export-pdf" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold border border-primary/20 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-sm">picture_as_pdf</span>
                ${t('export_pdf') || 'PDF'}
            </button>
            <button id="session-export-excel" class="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/10 text-neon-green rounded-xl text-xs font-bold border border-neon-green/20 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-sm">description</span>
                ${t('export_excel') || 'Excel'}
            </button>
          </div>
        </div>
      </div>
      <div id="analytics-series-list" class="space-y-3 pb-20"></div>
    `;

    const pdfBtn = document.getElementById('session-export-pdf');
    const excelBtn = document.getElementById('session-export-excel');
    const list = document.getElementById('analytics-series-list');

    let allShots = [];
    const augmentedSeries = sessionSeries.map((s) => ({
      ...s,
      sessionDate: session.date,
      sessionLocation: session.location,
      sessionId: session.id,
      session_type: session.type,
      stance: s.stance || session.stance || 'prone',
      intensity: normalizeIntensityLevel(s.intensity || session.intensity || 'Ruhe'),
    }));

    if (sessionSeries.length === 0) {
      if (list) {
        list.innerHTML = `
          <div class="py-12 text-center">
            <div class="w-16 h-16 bg-off-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-3xl text-off-white/20">history</span>
            </div>
            <p class="text-light-blue-info/50 text-base italic">${t('no_series_found') || 'Keine Serien gefunden'}</p>
          </div>`;
      }
    } else {
      augmentedSeries.forEach((s) => {
        const card = this.createSeriesCard(s);
        if (list) list.appendChild(card);
        if (s.shots) {
          allShots = allShots.concat(s.shots);
        }
      });
    }

    if (pdfBtn) pdfBtn.onclick = () => this.exportSessionToPDF_Analytics(session, augmentedSeries);
    if (excelBtn)
      excelBtn.onclick = () => this.exportSessionToExcel_Analytics(session, augmentedSeries);

    this.updateAnalysis(allShots, augmentedSeries.length, augmentedSeries);
  }

  renderAthleteList() {
    if (!this.container) return;
    this.currentView = 'athletes';
    this.updateMiniTargetOpacityButton();
    this.toggleBottomNav(true);
    if (this.backBtn) this.backBtn.classList.add('hidden');
    if (this.title) this.title.textContent = t('analytics') || 'Analyse';
    if (this.subtitle) {
      this.subtitle.textContent =
        this.userRole === 'coach' ? t('coach_account') : t('athlete_account');
    }

    if (!this.sessions.length || !this.athletes.length) {
      this.container.innerHTML = `
        <div class="p-5 mb-4 bg-card-dark/60 border border-subtle rounded-3xl text-center shadow-lg animate-fade-in backdrop-blur-md">
          <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
            <span class="material-symbols-outlined text-2xl">analytics</span>
          </div>
          <h3 class="text-sm font-bold text-off-white mb-1">${typeof t === 'function' ? t('empty_state_no_sessions_title') : 'Noch keine Einheiten erstellt'}</h3>
          <p class="text-xs text-light-blue-info/70 mb-4 leading-relaxed">${typeof t === 'function' ? t('empty_state_no_sessions_desc') : 'Erstelle deine erste Trainingseinheit oder lege Sportler an, um Auswertungen zu sehen.'}</p>
          <div class="flex flex-col sm:flex-row gap-2 justify-center">
            <a href="new-session.html" class="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all inline-flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-base">add</span>
              <span>${typeof t === 'function' ? t('create_first_session') : 'Erste Einheit erstellen'}</span>
            </a>
            <a href="athletes.html" class="px-4 py-2.5 bg-off-white/5 hover:bg-off-white/10 border border-subtle text-light-blue-info hover:text-off-white font-semibold text-xs rounded-xl active:scale-95 transition-all inline-flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-base">person_add</span>
              <span>${typeof t === 'function' ? t('create_first_athlete') : 'Ersten Sportler anlegen'}</span>
            </a>
          </div>
        </div>`;
    } else {
      this.container.innerHTML = '';
    }

    let filteredAthletes = this.athletes;
    if (this.currentAthleteFilter !== 'all') {
      if (['m', 'w'].includes(this.currentAthleteFilter)) {
        filteredAthletes = filteredAthletes.filter((a) => a.gender === this.currentAthleteFilter);
      } else {
        filteredAthletes = filteredAthletes.filter((a) => a.ageGroup === this.currentAthleteFilter);
      }
    }

    const analysisSection = document.getElementById('section-analysis-container');
    const customSection = document.getElementById('section-custom-container');
    if (analysisSection) analysisSection.classList.remove('hidden');
    if (customSection) customSection.classList.remove('hidden');

    let allShots = [];
    let allSeries = [];
    const athleteIds = new Set(filteredAthletes.map((a) => a.id));
    this.sessions.forEach((session) => {
      if (session.series) {
        session.series.forEach((s) => {
          if (athleteIds.has(s.athleteId)) {
            const augmented = {
              ...s,
              session_type: session.type,
              stance: s.stance || session.stance || 'prone',
              intensity: normalizeIntensityLevel(s.intensity || session.intensity || 'Ruhe'),
              sessionDate: session.date,
              sessionId: session.id,
              sessionLocation: session.location,
            };
            allSeries.push(augmented);
            if (s.shots) {
              allShots = allShots.concat(s.shots);
            }
          }
        });
      }
    });
    this.currentShots = allShots;
    this.currentSeriesList = allSeries;
    this.updateAnalysis(allShots, allSeries.length, allSeries);
  }

  selectAthlete(athlete) {
    this.currentAthlete = athlete;
    this.currentView = 'athlete_detail';
    this.updateMiniTargetOpacityButton();
    this.toggleBottomNav(false);
    this.currentAthleteSessionFilter = 'all';
    const switcher = document.getElementById('view-switcher');
    if (switcher) switcher.classList.add('hidden');
    if (this.title) this.title.textContent = athlete.name;
    if (this.backBtn) this.backBtn.classList.remove('hidden');
    this.renderSeriesList();
  }

  renderSeriesList() {
    if (!this.currentAthlete) return;
    let athleteSeries = [];
    const athleteSessions = [];
    const seenSessions = new Set();

    this.sessions.forEach((session) => {
      let athleteJoinedSession = false;
      if (session.series) {
        session.series.forEach((s) => {
          if (s.athleteId === this.currentAthlete.id) {
            athleteJoinedSession = true;
            athleteSeries.push({
              ...s,
              sessionDate: session.date,
              sessionLocation: session.location,
              sessionId: session.id,
              session_type: session.type,
              stance: s.stance || session.stance || 'prone',
              intensity: normalizeIntensityLevel(s.intensity || session.intensity || 'Ruhe'),
              sessionName: session.name,
            });
          }
        });
      }

      if (athleteJoinedSession && !seenSessions.has(session.id)) {
        athleteSessions.push(session);
        seenSessions.add(session.id);
      }
    });

    const totalSeriesCount = athleteSeries.length;

    if (this.currentAthleteSessionFilter !== 'all') {
      athleteSeries = athleteSeries.filter((s) => s.sessionId === this.currentAthleteSessionFilter);
    }

    if (this.currentSeriesFilter !== 'all') {
      if (this.currentSeriesFilter === 'competition') {
        athleteSeries = athleteSeries.filter(
          (s) => s.session_type === 'competition' || s.session_type === 'test_competition'
        );
      } else if (this.currentSeriesFilter === 'training') {
        athleteSeries = athleteSeries.filter((s) => s.session_type === 'training');
      } else if (this.currentSeriesFilter === 'zeroing') {
        athleteSeries = athleteSeries.filter((s) => s.type === 'zeroing');
      } else if (this.currentSeriesFilter === 'series') {
        athleteSeries = athleteSeries.filter((s) => s.type !== 'zeroing');
      }
    }

    athleteSeries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.container.innerHTML = `
            <div class="px-1 pb-2 space-y-6">
                <!-- Data Export Buttons -->
                <div class="flex gap-2">
                    <button id="athlete-export-pdf" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-primary/10 text-primary rounded-xl text-xs font-bold border border-primary/20 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-sm">picture_as_pdf</span>
                        ${t('export_pdf') || 'PDF Bericht'}
                    </button>
                    <button id="athlete-export-excel" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-neon-green/10 text-neon-green rounded-xl text-xs font-bold border border-neon-green/20 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-sm">description</span>
                        ${t('export_excel') || 'Excel Export'}
                    </button>
                </div>

                <!-- Sessions List Section -->
                <div class="space-y-3">
                  <div class="flex justify-between items-center px-1">
                    <h2 class="text-xs font-black text-light-blue-info/50 uppercase tracking-[0.2em]">${t('training_units') || 'Einheiten'}</h2>
                    <span class="text-[10px] font-bold text-zinc-600">${athleteSessions.length} ${athleteSessions.length === 1 ? t('session_singular') || 'Einheit' : t('sessions') || 'Einheiten'}</span>
                  </div>
                  <div id="athlete-sessions-list" class="space-y-3"></div>
                </div>

                <!-- Series List Section -->
                <div class="space-y-3">
                  <div class="flex justify-between items-center px-1">
                    <h2 class="text-xs font-black text-light-blue-info/50 uppercase tracking-[0.2em]">${t('history') || 'Serien-Verlauf'}</h2>
                    <span class="text-[10px] font-bold text-zinc-600">${athleteSeries.length} / ${totalSeriesCount} ${t('series')}</span>
                  </div>
                  ${this.renderSeriesFilters(athleteSeries, totalSeriesCount)}
                  <div id="analytics-series-list" class="space-y-3 pb-20"></div>
                </div>
            </div>
        `;

    const pdfBtn = document.getElementById('athlete-export-pdf');
    const excelBtn = document.getElementById('athlete-export-excel');
    if (pdfBtn) pdfBtn.onclick = () => this.exportAthleteToPDF(this.currentAthlete, athleteSeries);
    if (excelBtn)
      excelBtn.onclick = () => this.exportAthleteToExcel(this.currentAthlete, athleteSeries);

    this.attachSeriesFilterListeners();

    const sessionsList = document.getElementById('athlete-sessions-list');
    athleteSessions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((session) => {
        const card = this.createSessionCard(session);
        sessionsList.appendChild(card);
      });

    const list = document.getElementById('analytics-series-list');
    if (athleteSeries.length === 0) {
      list.innerHTML = `
                <div class="py-12 text-center">
                    <div class="w-16 h-16 bg-off-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="material-symbols-outlined text-3xl text-off-white/20">history</span>
                    </div>
                    <p class="text-light-blue-info/50 text-base italic">${t('no_series_filter')}</p>
                </div>`;
      return;
    }
    athleteSeries.forEach((s) => {
      const card = this.createSeriesCard(s);
      list.appendChild(card);
    });
    let allShots = [];
    athleteSeries.forEach((s) => {
      if (s.shots) {
        allShots = allShots.concat(s.shots);
      }
    });
    this.updateAnalysis(allShots, athleteSeries.length, athleteSeries);
  }

  renderSeriesFilters(currentFilteredList, totalCount) {
    const filters = [
      { id: 'all', label: t('filter_all') },
      { id: 'series', label: t('series') },
      { id: 'zeroing', label: t('zeroing') },
      { id: 'competition', label: t('competitions') },
      { id: 'training', label: t('training') },
    ];
    const style = '';
    return `
            ${style}
            <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                ${filters
                  .map((f) => {
                    const isActive = this.currentSeriesFilter === f.id;
                    return `
                        <button data-filter="${f.id}"
                            class="series-filter-btn px-6 py-2.5 rounded-full text-sm whitespace-nowrap transition-all ${
                              isActive
                                ? 'bg-primary text-off-white font-bold active:opacity-80'
                                : 'bg-card-dark text-off-white font-semibold border border-subtle active:bg-off-white/5'
                            }">
                            ${f.label}
                        </button>
                    `;
                  })
                  .join('')}
            </div>
        `;
  }

  attachSeriesFilterListeners() {
    const btns = this.container.querySelectorAll('.series-filter-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentSeriesFilter = btn.dataset.filter;
        this.renderSeriesList();
      });
    });
  }

  createSeriesCard(s) {
    const card = document.createElement('div');
    card.id = `series-card-${s.id}`;
    const stats = s.stats || {
      hitCount: s.shots ? s.shots.filter((sh) => sh.hit).length : 0,
      totalShots: s.shots ? s.shots.length : 0,
      avgRing: 0,
    };
    const label = s.type === 'zeroing' ? t('zeroing') : t('series');
    const dateStr = new Date(s.timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = new Date(s.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const targetShotsCount = s.shotsPerSeries || 5;
    const shotIndicators = Array.from({ length: targetShotsCount })
      .map((_, i) => {
        const shot = s.shots && s.shots[i];
        const statusColor = shot ? (shot.hit ? 'bg-neon-green' : 'bg-neon-red') : 'bg-zinc-800';
        return `<div class="w-2 h-2 rounded-full ${statusColor} shadow-sm"></div>`;
      })
      .join('');
    const avgRing =
      stats.avgRing ||
      (s.shots && s.shots.length
        ? (s.shots.reduce((a, b) => a + (b.ring || 0), 0) / s.shots.length).toFixed(1)
        : '0');
    card.innerHTML = `
            <div class="group flex items-center gap-3 p-3 bg-card-dark rounded-2xl border border-subtle shadow-sm active:scale-[0.99] transition-all cursor-pointer to-toggle-detail">

                <!-- Left: Mini Target -->
                <div class="shrink-0 w-[52px] h-[52px]">
                    ${this.renderMiniTarget(s.shots)}
                </div>

                <!-- Right: Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-bold text-off-white tracking-wide uppercase leading-none">${label}</p>
                                <span class="text-xs text-light-blue-info/60 font-medium">${dateStr}</span>
                            </div>
                            <p class="text-xs font-bold text-light-blue-info/40 uppercase tracking-tighter mt-1">
                                ${timeStr} • ${s.sessionLocation || t('unknown_location')}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            ${s.wind !== undefined ? this.renderWindFlag(s.wind, 32) : ''}
                            <div class="text-right flex flex-col items-end">
                                <div class="flex items-center gap-1">
                                    <span class="text-xl font-black text-off-white leading-none">${stats.hitCount}</span><span class="text-xs text-zinc-500">/${targetShotsCount}</span>
                                </div>
                                ${s.totalTime ? `<span class="text-[10px] font-black text-primary/80 font-mono tracking-tighter leading-none">${s.totalTime}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Hit Indicators Row -->
                    <div class="flex items-center justify-between mt-1">
                        <div class="flex items-center gap-1.5 ml-1">
                            ${shotIndicators}
                        </div>
                        <span id="series-expand-icon-${s.id}" class="material-symbols-outlined text-xs text-light-blue-info/20 group-hover:text-primary transition-colors">chevron_left</span>
                    </div>
                </div>
            </div>

            <!-- Expanded Content (Hidden by default) -->
            <div id="series-detail-${s.id}" class="hidden mt-2 p-4 bg-white/[0.02] border border-subtle/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div class="flex gap-4">
                    <!-- Clickable Larger Target (Now opens Modal) -->
                    <div class="shrink-0 cursor-pointer active:scale-95 transition-transform to-open-modal w-[120px] h-[120px]">
                        ${this.renderMiniTarget(s.shots)}
                        <p class="text-[8px] text-center text-light-blue-info/40 mt-1 uppercase font-bold text-primary">${t('large_view')}</p>
                    </div>

                    <!-- Stats & Shot List -->
                    <div class="flex-1 min-w-0 space-y-3">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="bg-card-dark p-2 rounded-xl border border-subtle/10">
                                <p class="text-[8px] text-zinc-500 uppercase font-black">${t('avg_ring')}</p>
                                <p class="text-sm font-black text-off-white">${avgRing}</p>
                            </div>
                            <div class="bg-card-dark p-2 rounded-xl border border-subtle/10">
                                <p class="text-[8px] text-zinc-500 uppercase font-black">${t('total_time')}</p>
                                <p class="text-sm font-black text-primary font-mono">${s.totalTime || '--:--.-'}</p>
                            </div>
                        </div>

                        <!-- Detailed Shot List -->
                        <div class="space-y-1">
                            <p class="text-[8px] text-zinc-500 uppercase font-black mb-1">${t('shot_details')}</p>
                            ${(s.shots || [])
                              .map((shot, idx) => {
                                const split = s.splits
                                  ? s.splits[idx]
                                  : idx === 0
                                    ? t('start')
                                    : '';
                                return `
                                    <div class="flex items-center justify-between py-1 px-2 bg-white/[0.02] rounded-lg border border-subtle/5">
                                        <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-black text-light-blue-info/40 w-4">${idx + 1}</span>
                                            <div class="w-2 h-2 rounded-full ${shot.hit ? 'bg-neon-green' : 'bg-neon-red'} shadow-sm"></div>
                                            <span class="text-[11px] font-black text-off-white">Ring ${shot.ring || '-'}</span>
                                        </div>
                                        <span class="text-[10px] font-black text-off-white/40 font-mono">${split || '-'}</span>
                                    </div>
                                `;
                              })
                              .join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    const toggleBtn = card.querySelector('.to-toggle-detail');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSeriesDetail(s.id));
    }

    const modalBtn = card.querySelector('.to-open-modal');
    if (modalBtn) {
      modalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openTargetModal({
          type: 'series',
          series: s,
        });
      });
    }
    return card;
  }

  toggleSeriesDetail(seriesId) {
    const detail = document.getElementById(`series-detail-${seriesId}`);
    const icon = document.getElementById(`series-expand-icon-${seriesId}`);
    if (!detail || !icon) return;
    if (detail.classList.contains('hidden')) {
      detail.classList.remove('hidden');
      icon.textContent = 'expand_more';
      icon.classList.replace('text-light-blue-info/20', 'text-primary');
      icon.style.transform = 'rotate(-90deg)';
    } else {
      detail.classList.add('hidden');
      icon.textContent = 'chevron_left';
      icon.classList.replace('text-primary', 'text-light-blue-info/20');
      icon.style.transform = 'rotate(0deg)';
    }
  }

  renderMiniTarget(shots, showNumbers = true) {
    const shotSize = typeof getShotSize === 'function' ? getShotSize() : 6;
    const shotOpacity = this.useMiniTargetShotOpacity ? 0.42 : 1;
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

        const textElement =
          showNumbers && labelContent !== 'none'
            ? `<text x="${s.x}" y="${s.y + (shotSize / 6) * 0.5}" text-anchor="middle" dominant-baseline="central" fill="${labelColor}"
                          style="font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif;">${labelText}</text>`
            : '';
        return `
                <g>
            <circle data-mini-target-shot="true" cx="${s.x}" cy="${s.y}" r="${r}" fill="${color}" stroke="white" stroke-width="${sw}" opacity="${shotOpacity}" />
                    ${textElement}
                </g>
            `;
      })
      .join('');
    return `
            <svg viewBox="0 0 200 200" class="w-full h-full rounded-full bg-white shadow-inner overflow-hidden flex-shrink-0">
                <style>
                    .ring-number-white { font-family: sans-serif; font-weight: bold; font-size: 4px; fill: white; text-anchor: middle; dominant-baseline: central; }
                    .ring-number-black { font-family: sans-serif; font-weight: bold; font-size: 4px; fill: #000; text-anchor: middle; dominant-baseline: central; }
                </style>

                <!-- Background -->
                <rect x="0" y="0" width="200" height="200" fill="white" />

                <circle cx="100" cy="100" r="100" fill="white" stroke="#000" stroke-width="0.5"></circle>
                <text x="195" y="100" class="ring-number-black" text-anchor="end">1</text>
                <text x="5" y="100" class="ring-number-black" text-anchor="start">1</text>
                <text x="100" y="5" class="ring-number-black">1</text>
                <text x="100" y="195" class="ring-number-black">1</text>

                <circle cx="100" cy="100" r="90" fill="white" stroke="#000" stroke-width="0.5"></circle>
                <text x="185" y="100" class="ring-number-black" text-anchor="end">2</text>
                <text x="15" y="100" class="ring-number-black" text-anchor="start">2</text>
                <text x="100" y="15" class="ring-number-black">2</text>
                <text x="100" y="185" class="ring-number-black">2</text>

                <circle cx="100" cy="100" r="80" fill="white" stroke="#000" stroke-width="0.5"></circle>
                <text x="175" y="100" class="ring-number-black" text-anchor="end">3</text>
                <text x="25" y="100" class="ring-number-black" text-anchor="start">3</text>
                <text x="100" y="25" class="ring-number-black">3</text>
                <text x="100" y="175" class="ring-number-black">3</text>

                <circle cx="100" cy="100" r="70" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="165" y="100" class="ring-number-white" text-anchor="end">4</text>
                <text x="35" y="100" class="ring-number-white" text-anchor="start">4</text>
                <text x="100" y="35" class="ring-number-white">4</text>
                <text x="100" y="165" class="ring-number-white">4</text>

                <circle cx="100" cy="100" r="60" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="155" y="100" class="ring-number-white" text-anchor="end">5</text>
                <text x="45" y="100" class="ring-number-white" text-anchor="start">5</text>
                <text x="100" y="45" class="ring-number-white">5</text>
                <text x="100" y="155" class="ring-number-white">5</text>

                <circle cx="100" cy="100" r="50" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="145" y="100" class="ring-number-white" text-anchor="end">6</text>
                <text x="55" y="100" class="ring-number-white" text-anchor="start">6</text>
                <text x="100" y="55" class="ring-number-white">6</text>
                <text x="100" y="145" class="ring-number-white">6</text>

                <circle cx="100" cy="100" r="40" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <text x="135" y="100" class="ring-number-white" text-anchor="end">7</text>
                <text x="65" y="100" class="ring-number-white" text-anchor="start">7</text>
                <text x="100" y="65" class="ring-number-white">7</text>
                <text x="100" y="135" class="ring-number-white">7</text>

                <circle cx="100" cy="100" r="30" fill="#000" stroke="white" stroke-width="2.5"></circle>
                <text x="125" y="100" class="ring-number-white" text-anchor="end">8</text>
                <text x="75" y="100" class="ring-number-white" text-anchor="start">8</text>
                <text x="100" y="75" class="ring-number-white">8</text>
                <text x="100" y="125" class="ring-number-white">8</text>

                <circle cx="100" cy="100" r="20" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <circle cx="100" cy="100" r="10" fill="#000" stroke="white" stroke-width="0.5"></circle>
                <circle cx="100" cy="100" r="2" fill="white" stroke="none"></circle>

                ${shotCircles}
            </svg>
        `;
  }

  renderWindFlag(wind = 0, size = 24) {
    const absVal = Math.min(Math.abs(wind), 10);
    const scaleX = wind < 0 ? -1 : 1;
    return `
            <svg viewBox="0 0 40 40" style="width: ${size}px; height: ${size}px; overflow: visible;" class="flex-shrink-0">
                <rect x="18" y="5" width="2" height="30" fill="#cbd5e1" rx="1" />
                <circle cx="19" cy="5" r="2" fill="#94a3b8" />
                <g style="transform-origin: 19px 14px; transform: scaleX(${scaleX}) rotate(${wind}deg);">
                    <path d="M19 8 L36 14 L19 20 Z" fill="#ef4444" />
                    <path d="M19 8 L36 14 L19 11 Z" fill="rgba(0,0,0,0.15)" />
                </g>
            </svg>
        `;
  }

  getInitials(name) {
    if (!name) return '';
    const parts = name.split(' ').filter((p) => p.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  openTargetModal(data) {
    const modal = document.getElementById('targetPreviewModal');
    const container = document.getElementById('largeTargetContainer');
    const editBtn = document.getElementById('modalEditSeriesBtn');
    const titleEl = modal ? modal.querySelector('[data-i18n="target_analysis"]') : null;

    if (!modal || !container || !editBtn) return;

    if (data.type === 'series') {
      const s = data.series;
      container.innerHTML = this.renderTargetPreview(s);
      if (titleEl) titleEl.textContent = t('target_preview') || 'Trefferbild Vorschau';
      editBtn.classList.remove('hidden');
      editBtn.onclick = () => {
        window.location.href = `shooting.html?series=${s.id}&session=${s.sessionId}&athleteId=${s.athleteId}`;
      };
    } else {
      return;
    }

    modal.classList.remove('hidden');
    this.toggleBottomNav(false);
    const closeBtn = document.getElementById('closeTargetPreviewBtn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        this.toggleBottomNav(true);
      };
    }
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        this.toggleBottomNav(true);
      }
    };
  }

  updateAnalysis(shots, seriesCount = 0, seriesList = []) {
    this.currentShots = shots;
    this.currentSeriesList = seriesList;

    const filteredSeries = this.getFilteredSeries(this.analysisFilters);
    const filteredShots = this.getFilteredShots(this.analysisFilters);

    const totalShots = filteredShots.length;
    const hitCount = filteredShots.filter((s) => s.isHit || s.hit).length;
    const totalRings = filteredShots.reduce((sum, s) => sum + (s.ring || s.score || 0), 0);
    const hitRate = totalShots > 0 ? Math.round((hitCount / totalShots) * 100) : 0;
    const avgRings = totalShots > 0 ? (totalRings / totalShots).toFixed(1) : '0.0';

    const elSeries = document.getElementById('stat-total-series');
    const elRate = document.getElementById('stat-hit-rate');
    const elRings = document.getElementById('stat-avg-rings');
    const elShots = document.getElementById('stat-total-shots');

    if (elSeries) elSeries.textContent = filteredSeries.length;
    if (elRate) elRate.textContent = `${hitRate}%`;
    if (elRings) elRings.textContent = avgRings;
    if (elShots) elShots.textContent = totalShots;

    const heatmapContainer = document.getElementById('heatmap-container');
    const totalContainer = document.getElementById('total-placements-container');
    const trendContainer = document.getElementById('trend-chart-container');

    if (heatmapContainer) {
      heatmapContainer.innerHTML = this.renderHeatmap(filteredShots);
      heatmapContainer.onclick = () => this.showStandardAnalysisDetail('heatmap');
    }

    if (totalContainer) {
      totalContainer.innerHTML = this.renderMiniTarget(filteredShots, false);
      totalContainer.onclick = () => this.showStandardAnalysisDetail('combined');
    }

    if (trendContainer) {
      trendContainer.innerHTML = this.renderTrendChart(filteredSeries);
      trendContainer.onclick = () => this.showStandardAnalysisDetail('trend');
    }

    this.renderDirectionTendency(filteredShots);
    this.renderShotTimeAnalysis(filteredSeries);
    this.renderRhythmAnalysis(filteredSeries);
    this.renderMeanShot(filteredShots);

    this.renderAnalysisFiltersElement();

    this.applyAnalysisVisibility();
    this.renderCustomAnalyses();
  }

  renderOverviewFilterPill(key, currentVal, options) {
    const keyLabels = {
      stance: t('filter_stance') || 'Anschlag',
      session_type: t('filter_session_type') || 'Typ',
      intensity: t('filter_intensity') || 'Belastung',
      session_id: 'Einheit',
      athlete_id: 'Sportler',
      series_index: 'Serie',
    };

    const currentLabel = this.getOverviewFilterLabel(key, currentVal, options);
    const selectedSessionIds =
      key === 'session_id' ? new Set(this.getSelectedSessionIds(currentVal).map(String)) : null;

    return `
      <div class="relative w-full">
        <button onclick="Analytics.toggleOverviewFilter('${key}')" class="w-full h-10 px-4 rounded-full bg-navy-charcoal border border-subtle/50 flex items-center justify-between gap-2 active:scale-[0.98] transition-all">
          <div class="flex items-center gap-2 truncate">
            <span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0">${
              keyLabels[key] || key
            }:</span>
            <span class="text-xs font-bold text-off-white truncate">${currentLabel}</span>
          </div>
          <span class="material-symbols-outlined text-zinc-600 text-sm shrink-0">expand_more</span>
        </button>
        <div id="overview-dropdown-${key}" class="hidden absolute top-full left-0 right-0 mt-2 bg-card-dark border border-subtle rounded-[20px] shadow-2xl z-50 overflow-hidden min-w-full max-h-[300px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
           <div class="p-1">
             ${options
               .map(
                 (opt) => `
               <button onclick="Analytics.updateOverviewFilter('${key}', '${opt.id}')" class="w-full p-3 text-left hover:bg-white/5 rounded-xl text-xs font-black ${
                 key === 'session_id'
                   ? opt.id === 'all'
                     ? String(currentVal) === 'all'
                       ? 'text-primary'
                       : 'text-off-white'
                     : selectedSessionIds && selectedSessionIds.has(String(opt.id))
                       ? 'text-primary'
                       : 'text-off-white'
                   : String(currentVal) === opt.id
                     ? 'text-primary'
                     : 'text-off-white'
               } transition-all whitespace-nowrap">
                 ${opt.label}
               </button>
             `
               )
               .join('')}
           </div>
        </div>
      </div>
    `;
  }

  getSelectedSessionIds(sessionIdValue) {
    const raw = String(sessionIdValue || 'all');
    if (raw === 'all') return [];
    return raw
      .split(',')
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id) && id > 0);
  }

  getOverviewFilterLabel(key, currentVal, options) {
    if (key === 'session_id') {
      const selected = this.getSelectedSessionIds(currentVal).map(String);
      if (selected.length === 0) return 'Alle Einheiten';
      if (selected.length === 1) {
        const single = options.find((opt) => opt.id === selected[0]);
        return single ? single.label : `Einheit ${selected[0]}`;
      }
      return `${selected.length} Einheiten`;
    }

    if (key === 'athlete_id' && String(currentVal) === 'all') {
      return 'Alle Sportler';
    }

    const currentOpt = options.find((opt) => opt.id === String(currentVal)) || {
      id: String(currentVal),
      label: String(currentVal),
    };
    return currentOpt.label;
  }

  renderAnalysisFiltersElement() {
    const container = document.getElementById('overview-filters-container');
    if (!container) return;

    const sessionOpts = this.getSessionFilterOptions();
    const athleteOpts = this.getAthleteFilterOptions(this.analysisFilters.session_id);
    const seriesOpts = this.getSeriesFilterOptions(this.analysisFilters.session_id);

    container.innerHTML = `
      ${this.renderOverviewFilterPill('session_id', this.analysisFilters.session_id, sessionOpts)}
      ${this.renderOverviewFilterPill('athlete_id', this.analysisFilters.athlete_id, athleteOpts)}
      ${this.renderOverviewFilterPill('series_index', this.analysisFilters.series_index, seriesOpts)}
      ${this.renderOverviewFilterPill('stance', this.analysisFilters.stance, [
        { id: 'all', label: 'Alle' },
        { id: 'prone', label: t('prone') || 'Liegend' },
        { id: 'standing', label: t('standing') || 'Stehend' },
      ])}
      ${this.renderOverviewFilterPill('session_type', this.analysisFilters.session_type, [
        { id: 'all', label: 'Alle' },
        { id: 'training', label: t('training') || 'Training' },
        { id: 'competition', label: t('competitions') || 'Wettkampf' },
        { id: 'test_competition', label: t('test_competition') || 'Testwettkampf' },
        { id: 'other', label: t('other') || 'Sonstiges' },
      ])}
      ${this.renderOverviewFilterPill('intensity', this.analysisFilters.intensity, [
        { id: 'all', label: 'Alle' },
        { id: 'Ruhe', label: 'Ruhe' },
        { id: 'Niedrig', label: 'Niedrig' },
        { id: 'Moderat', label: 'Moderat' },
        { id: 'Hoch', label: 'Hoch' },
      ])}
    `;
  }

  toggleOverviewFilter(key) {
    const dropdown = document.getElementById(`overview-dropdown-${key}`);
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    document
      .querySelectorAll('[id^="overview-dropdown-"]')
      .forEach((d) => d.classList.add('hidden'));
    if (isHidden) dropdown.classList.remove('hidden');
  }

  updateOverviewFilter(key, value) {
    const keepSessionDropdownOpen =
      key === 'session_id' &&
      !document.getElementById('overview-dropdown-session_id')?.classList.contains('hidden');

    if (key !== 'session_id') {
      document
        .querySelectorAll('[id^="overview-dropdown-"]')
        .forEach((d) => d.classList.add('hidden'));
    }

    if (key === 'session_id') {
      const currentSelected = new Set(this.getSelectedSessionIds(this.analysisFilters.session_id));

      if (value === 'all') {
        this.analysisFilters.session_id = 'all';
      } else {
        const numericValue = parseInt(value, 10);
        if (Number.isNaN(numericValue) || numericValue <= 0) return;

        if (currentSelected.has(numericValue)) {
          currentSelected.delete(numericValue);
        } else {
          currentSelected.add(numericValue);
        }

        const next = [...currentSelected].sort((a, b) => a - b).map(String);
        this.analysisFilters.session_id = next.length > 0 ? next.join(',') : 'all';
      }
    } else {
      this.analysisFilters[key] = value;
    }

    this.savePersistedOverviewFilters();
    if (this.currentView === 'custom_detail' && this.viewedCustomAnalysis) {
      this.viewedCustomAnalysis[key] = this.analysisFilters[key];
      this.renderCustomAnalysisDetail();
    } else {
      this.updateAnalysis(this.currentShots, this.currentSeriesList.length, this.currentSeriesList);
    }

    if (keepSessionDropdownOpen) {
      const sessionDropdown = document.getElementById('overview-dropdown-session_id');
      if (sessionDropdown) sessionDropdown.classList.remove('hidden');
    }
  }

  openAnalysisBuilder() {
    this.editingAnalysisId = null;
    const modal = document.getElementById('analysis-builder-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.toggleBottomNav(false);
    }

    const title = document.querySelector('#analysis-builder-modal h3');
    if (title) title.textContent = t('create_custom_metric') || 'Neue Analyse';
    const saveBtn = document.querySelector(
      '#analysis-builder-modal button[onclick*="saveCustomAnalysis"]'
    );
    if (saveBtn) saveBtn.textContent = t('save_analysis') || 'Analyse speichern';

    document.getElementById('builder-metric-name').value = '';
    document.getElementById('builder-target-value').value = '';
    this.setMetricType('hit_rate');
    this.setFocus('all');
    this.setStance('all');
    this.setType('all');
    this.setIntensity('all');

    if (!this._dropdownListenerAdded) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('[id^="dropdown-"]') && !e.target.closest('[id$="-trigger"]')) {
          this.closeAllDropdowns();
        }
      });
      this._dropdownListenerAdded = true;
    }
  }

  toggleDropdown(id) {
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    this.closeAllDropdowns();
    if (!isHidden) return;

    dropdown.classList.remove('hidden');

    setTimeout(() => {
      dropdown.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
  }

  closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('[id^="dropdown-"]');
    dropdowns.forEach((d) => {
      d.classList.add('hidden');
    });
  }

  setMetricType(type) {
    const hiddenSelect = document.getElementById('builder-metric-type');
    if (hiddenSelect) hiddenSelect.value = type;

    const iconEl = document.getElementById('trigger-metric-icon');
    const textEl = document.getElementById('trigger-metric-text');

    const config = {
      hit_rate: { icon: 'target', text: t('metric_hit_rate') },
      avg_ring: { icon: 'adjust', text: t('metric_avg_ring') },
      group_size: { icon: 'blur_on', text: t('metric_group_size') },
      first_shot: { icon: 'timer', text: t('metric_first_shot') },
      avg_rhythm: { icon: 'reorder', text: t('metric_avg_rhythm') },
      total_time: { icon: 'hourglass_empty', text: t('metric_total_series_time') },
      avg_offset: { icon: 'gps_fixed', text: t('metric_avg_offset') },
    };

    if (iconEl) iconEl.textContent = config[type].icon;
    if (textEl) textEl.textContent = config[type].text;

    this.closeAllDropdowns();
  }

  setFocus(value) {
    const input = document.getElementById('builder-focus-shots');
    let currentFocus = input ? input.value : 'all';

    if (value === 'all' || value === 'after_miss') {
      currentFocus = value;
    } else {
      let selected =
        currentFocus === 'all' || currentFocus === 'after_miss' ? [] : currentFocus.split(',');
      if (selected.includes(value)) {
        selected = selected.filter((v) => v !== value);
      } else {
        selected.push(value);
      }
      currentFocus = selected.length > 0 ? selected.sort().join(',') : 'all';
    }

    if (input) input.value = currentFocus;

    const btns = document.querySelectorAll('.focus-btn');
    btns.forEach((btn) => {
      const val = btn.dataset.value;
      let isActive = false;

      if (currentFocus === 'all' || currentFocus === 'after_miss') {
        isActive = val === currentFocus;
      } else {
        isActive = currentFocus.split(',').includes(val);
      }

      if (isActive) {
        btn.classList.add('active');
        if (btn.classList.contains('w-10')) {
          btn.classList.add('bg-primary', 'text-white', 'shadow-lg', 'shadow-primary/30');
          btn.classList.remove('text-off-white/60');
        } else {
          btn.classList.add('bg-primary/20', 'text-primary', 'border-primary/40');
          btn.classList.remove('bg-card-dark', 'text-off-white/70', 'border-subtle');
        }
      } else {
        btn.classList.remove('active');
        if (btn.classList.contains('w-10')) {
          btn.classList.remove('bg-primary', 'text-white', 'shadow-lg', 'shadow-primary/30');
          btn.classList.add('text-off-white/60');
        } else {
          btn.classList.add('bg-card-dark', 'text-off-white/70', 'border-subtle');
          btn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/40');
        }
      }
    });
  }

  setStance(value) {
    const input = document.getElementById('builder-filter-stance');
    if (input) input.value = value;

    const labels = {
      all: t('filter_all'),
      prone: t('prone'),
      standing: t('standing'),
    };
    const textEl = document.getElementById('trigger-stance-text');
    if (textEl) textEl.textContent = labels[value] || value;

    this.closeAllDropdowns();
  }

  setType(value) {
    const input = document.getElementById('builder-filter-type');
    if (input) input.value = value;

    const labels = {
      all: t('filter_all'),
      training: t('training'),
      competition: t('competitions'),
      test_competition: t('test_competition'),
      other: t('other'),
    };
    const textEl = document.getElementById('trigger-type-text');
    if (textEl) textEl.textContent = labels[value] || value;

    this.closeAllDropdowns();
  }

  setIntensity(value) {
    const normalizedValue = value === 'all' ? value : normalizeIntensityLevel(value);
    const input = document.getElementById('builder-filter-intensity');
    if (input) input.value = normalizedValue;

    const labels = {
      all: t('filter_all'),
      Ruhe: 'Ruhe',
      Niedrig: 'Niedrig',
      Moderat: 'Moderat',
      Hoch: 'Hoch',
    };
    const textEl = document.getElementById('trigger-intensity-text');
    if (textEl) textEl.textContent = labels[normalizedValue] || normalizedValue;

    this.closeAllDropdowns();
  }

  closeAnalysisBuilder() {
    const modal = document.getElementById('analysis-builder-modal');
    if (modal) {
      modal.classList.add('hidden');
      this.toggleBottomNav(true);
    }
  }

  saveCustomAnalysis() {
    const name = document.getElementById('builder-metric-name').value;
    const type = document.getElementById('builder-metric-type').value;
    const focus = document.getElementById('builder-focus-shots').value;
    const stance = document.getElementById('builder-filter-stance').value;
    const sessionType = document.getElementById('builder-filter-type').value;
    const intensity = document.getElementById('builder-filter-intensity').value;
    const targetValue = document.getElementById('builder-target-value').value;

    if (!name) {
      alert('Bitte gib einen Namen für die Analyse ein.');
      return;
    }

    const saved = JSON.parse(localStorage.getItem(this.CUSTOM_ANALYTICS_STORAGE_KEY) || '[]');

    if (this.editingAnalysisId) {
      const index = saved.findIndex((s) => s.id === this.editingAnalysisId);
      if (index !== -1) {
        saved[index] = {
          ...saved[index],
          name,
          type,
          focus,
          stance,
          sessionType,
          intensity,
          targetValue: targetValue ? parseFloat(targetValue) : null,
        };
      }
      this.editingAnalysisId = null;
    } else {
      const definition = {
        id: Date.now().toString(),
        name,
        type,
        focus,
        stance,
        sessionType,
        intensity,
        targetValue: targetValue ? parseFloat(targetValue) : null,
      };
      saved.push(definition);
    }

    localStorage.setItem(this.CUSTOM_ANALYTICS_STORAGE_KEY, JSON.stringify(saved));
    this.closeAnalysisBuilder();
    this.renderCustomAnalyses();
  }

  editCustomAnalysis(id) {
    const saved = JSON.parse(localStorage.getItem(this.CUSTOM_ANALYTICS_STORAGE_KEY) || '[]');
    const def = saved.find((s) => s.id === id);
    if (!def) return;

    this.editingAnalysisId = id;
    const modal = document.getElementById('analysis-builder-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.toggleBottomNav(false);
    }

    const title = document.querySelector('#analysis-builder-modal h3');
    if (title) title.textContent = t('edit_analysis') || 'Analyse bearbeiten';
    const saveBtn = document.querySelector(
      '#analysis-builder-modal button[onclick*="saveCustomAnalysis"]'
    );
    if (saveBtn) saveBtn.textContent = 'Speichern';

    document.getElementById('builder-metric-name').value = def.name;
    document.getElementById('builder-target-value').value = def.targetValue || '';
    this.setMetricType(def.type || 'hit_rate');
    this.setFocus(def.focus || 'all');
    this.setStance(def.stance || 'all');
    this.setType(def.sessionType || 'all');
    this.setIntensity(def.intensity || 'all');
  }

  deleteCustomAnalysis(id) {
    const saved = JSON.parse(localStorage.getItem(this.CUSTOM_ANALYTICS_STORAGE_KEY) || '[]');
    const def = saved.find((s) => s.id === id);
    const msg = def
      ? `Soll die Analyse "${def.name}" wirklich gelöscht werden?`
      : 'Analyse wirklich löschen?';
    if (!confirm(msg)) return;

    const filtered = saved.filter((s) => s.id !== id);
    localStorage.setItem(this.CUSTOM_ANALYTICS_STORAGE_KEY, JSON.stringify(filtered));
    this.renderCustomAnalyses();
  }

  renderCustomAnalyses() {
    const container = document.getElementById('custom-analytics-container');
    if (!container) return;

    const saved = JSON.parse(localStorage.getItem(this.CUSTOM_ANALYTICS_STORAGE_KEY) || '[]');
    if (!saved.length) {
      this.isCustomAnalyticsEditMode = false;
    }

    const countEl = document.getElementById('custom-analysis-count');
    if (countEl) countEl.textContent = saved.length;

    if (saved.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-8 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-subtle rounded-3xl">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-20">analytics</span>
          <p class="text-xs font-bold uppercase tracking-widest opacity-40 mb-3">Keine eigenen Analysen erstellt</p>
          <button onclick="Analytics.openAnalysisBuilder()" class="px-4 py-2 bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95">
            <span class="material-symbols-outlined text-sm">add</span>
            <span data-i18n="create_custom_metric">Eigene Analyse erstellen</span>
          </button>
        </div>
      `;
      this.initializeCustomAnalysisReordering();
      return;
    }

    container.innerHTML = saved
      .map((def) => {
        const stats = this.calculateCustomMetric(def);
        const isSuccess = def.targetValue !== null ? stats.numericValue >= def.targetValue : null;
        const statusColor =
          isSuccess === null ? 'bg-primary' : isSuccess ? 'bg-neon-green' : 'bg-rose-500';

        return `
        <div data-analysis-id="${def.id}" onclick="Analytics.handleCustomAnalysisCardClick(event, '${def.id}')" class="custom-analysis-item bg-card-dark rounded-[24px] border border-subtle p-5 flex flex-col justify-between group transition-all hover:bg-white/[0.02] hover:border-primary/40 relative overflow-hidden shadow-xl ${this.isCustomAnalyticsEditMode ? 'cursor-grab bg-off-white/5' : 'cursor-pointer'}">
          <div class="absolute top-0 right-0 p-3 flex gap-2 z-10">
            ${
              this.isCustomAnalyticsEditMode
                ? `<div class="analytics-drag-handle flex items-center justify-center p-1.5 rounded-md border border-subtle text-light-blue-info"><span class="material-symbols-outlined text-[18px]">drag_indicator</span></div>`
                : ''
            }
            ${
              this.isCustomAnalyticsEditMode
                ? ''
                : `
            <button onclick="event.stopPropagation(); Analytics.editCustomAnalysis('${def.id}')" class="w-8 h-8 rounded-full bg-white/10 text-off-white flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg active:scale-90">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="event.stopPropagation(); Analytics.deleteCustomAnalysis('${def.id}')" class="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
            `
            }
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <div class="flex items-center px-2 py-0.5 bg-zinc-900 rounded-lg border border-subtle/30 text-zinc-500 font-black uppercase tracking-[0.05em] text-[9px]">
                <span>${t(`metric_${def.type}`) || def.type}</span>
              </div>
              <div class="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 rounded-lg border border-subtle/30 text-zinc-500 font-black uppercase tracking-[0.05em] text-[9px]">
                  <span>${def.stance === 'all' ? t('filter_all') : t(def.stance)}</span>
              </div>
              <div class="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 rounded-lg border border-subtle/30 text-zinc-500 font-black uppercase tracking-[0.05em] text-[9px]">
                  <span>${def.sessionType === 'all' ? t('filter_all') : t(def.sessionType)}</span>
              </div>
              ${
                def.intensity && def.intensity !== 'all'
                  ? `
              <div class="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 rounded-lg border border-subtle/30 text-zinc-500 font-black uppercase tracking-[0.05em] text-[9px]">
                  <span>${getIntensityDisplayLabel(def.intensity)}</span>
              </div>
              `
                  : ''
              }
            </div>
            <h4 class="text-off-white font-bold text-base leading-tight truncate pr-8 tracking-tight">${def.name}</h4>
          </div>

          <div class="mt-6 flex items-end justify-between">
            <div class="flex flex-col">
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-black ${isSuccess === false ? 'text-rose-500' : isSuccess === true ? 'text-neon-green' : 'text-off-white'} tracking-tighter">${stats.value}</span>
                <span class="text-sm font-bold text-zinc-500">${stats.unit}</span>
              </div>
              <span class="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">${stats.label}</span>
            </div>

            <div class="relative shrink-0">
               <div class="w-12 h-12 rounded-2xl ${statusColor} bg-opacity-20 shadow-inner"></div>
               ${
                 def.targetValue
                   ? `
                 <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-subtle flex items-center justify-center">
                    <span class="text-[8px] font-black text-zinc-500">${def.targetValue}</span>
                 </div>
               `
                   : ''
               }
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    this.initializeCustomAnalysisReordering();
  }

  showStandardAnalysisDetail(type) {
    const labels = {
      series: t('series') || 'Serien',
      hit_rate: t('hit_rate') || 'Trefferquote',
      avg_rings: t('avg_rings') || 'Ø Ringe',
      shots: t('shots_count') || 'Schüsse',
      heatmap: t('shot_distribution') || 'Schussverteilung',
      combined: t('combined_accuracy') || 'Kombinierte Genauigkeit',
      trend: t('performance_trend') || 'Leistungsverlauf',
      shot_time: t('show_shot_time') || 'Fehler-Schießzeit',
      rhythm: t('show_rhythm') || 'Fehler-Rhythmus',
      mean_shot: t('show_mean_shot') || 'Durchschn. Schuss',
      direction: t('show_direction') || 'Fehler-Richtung',
    };

    const metricTypes = {
      series: 'series_count',
      hit_rate: 'hit_rate',
      avg_rings: 'avg_ring',
      shots: 'shots_count',
      heatmap: 'heatmap',
      combined: 'combined',
      trend: 'trend',
      shot_time: 'shot_time',
      rhythm: 'rhythm',
      mean_shot: 'mean_shot',
      direction: 'direction',
    };

    const def = {
      id: `std_${type}`,
      name: labels[type],
      type: metricTypes[type],
      focus: 'all',
      stance: this.analysisFilters.stance,
      session_type: this.analysisFilters.session_type,
      intensity: this.analysisFilters.intensity,
      session_id: this.analysisFilters.session_id,
      series_index: this.analysisFilters.series_index,
      targetValue: null,
      isStandard: true,
    };

    this.showCustomAnalysisDetail(def.id, def);
  }

  showCustomAnalysisDetail(id, directDef = null) {
    let def = directDef;
    if (!def) {
      const saved = JSON.parse(localStorage.getItem(this.CUSTOM_ANALYTICS_STORAGE_KEY) || '[]');
      def = saved.find((s) => s.id === id);
    }

    if (!def) return;

    this.currentView = 'custom_detail';
    this.toggleBottomNav(false);
    this.viewedCustomAnalysis = { ...def };
    this.updateMiniTargetOpacityButton();

    const analysisSection = document.getElementById('section-analysis-container');
    const customSection = document.getElementById('section-custom-container');
    if (analysisSection) analysisSection.classList.add('hidden');
    if (customSection) customSection.classList.add('hidden');

    const addBtn = document.getElementById('analytics-add-btn');
    const exportLink = document.getElementById('analytics-export-link');
    const editToggleBtn = document.getElementById('analytics-edit-toggle-btn');
    if (addBtn) addBtn.classList.add('hidden');
    if (exportLink) exportLink.classList.add('hidden');
    if (editToggleBtn) editToggleBtn.classList.add('hidden');
    if (this.subtitle) this.subtitle.classList.add('hidden');
    if (this.title) this.title.classList.add('hidden');

    const switcher = document.getElementById('view-switcher');
    if (switcher) switcher.classList.add('hidden');
    if (this.backBtn) this.backBtn.classList.remove('hidden');

    this.renderCustomAnalysisDetail();
  }

  renderCustomAnalysisDetail() {
    const def = this.viewedCustomAnalysis;
    const stats = this.calculateCustomMetric(def);
    const isSuccess = def.targetValue !== null ? stats.numericValue >= def.targetValue : null;
    const statusColor =
      isSuccess === null ? 'bg-primary' : isSuccess ? 'bg-neon-green' : 'bg-rose-500';

    if (this.title) this.title.textContent = def.name;
    if (this.subtitle) this.subtitle.textContent = t(`metric_${def.type}`) || def.type;

    const isLargeViz = [
      'heatmap',
      'combined',
      'trend',
      'shot_time',
      'rhythm',
      'mean_shot',
      'direction',
    ].includes(def.type);

    this.container.innerHTML = `
      <div class="px-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

        ${
          !isLargeViz
            ? `
        <!-- Metric Hero -->
        <div class="bg-card-dark rounded-[32px] border border-subtle p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

          <div class="relative z-10 flex flex-col items-center">
            <div class="flex items-baseline gap-2 mb-2">
              <span class="text-7xl font-black ${
                isSuccess === false
                  ? 'text-rose-500'
                  : isSuccess === true
                    ? 'text-neon-green'
                    : 'text-off-white'
              } tracking-tighter transition-all duration-300">
                ${stats.value}
              </span>
              <span class="text-xl font-bold text-zinc-500">${stats.unit}</span>
            </div>
            <span class="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">${stats.label}</span>
          </div>

          <div class="mt-8 flex items-center gap-4">
             <div class="px-4 py-2 rounded-2xl ${statusColor} bg-opacity-10 border border-${statusColor.replace(
               'bg-',
               ''
             )}/20 flex items-center gap-2">
               <div class="w-2.4 h-2.4 rounded-full ${statusColor}"></div>
               <span class="text-[10px] font-black uppercase tracking-widest ${statusColor.replace(
                 'bg-',
                 'text-'
               )}">
                 ${isSuccess === true ? 'Ziel Erreicht' : isSuccess === false ? 'Unter Zielwert' : 'Info'}
               </span>
             </div>
             ${
               def.targetValue
                 ? `
               <div class="px-4 py-2 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2">
                 <span class="text-[10px] font-black uppercase text-zinc-500 tracking-widest pr-1">Ziel:</span>
                 <span class="text-xs font-black text-off-white">${def.targetValue}</span>
               </div>
             `
                 : ''
             }
          </div>
        </div>
        `
            : ''
        }

        <!-- Trend and Detailed Analysis -->
        <div id="custom-detail-additional" class="space-y-4">
           <!-- Potential for trend charts based on these filters -->
        </div>
      </div>
    `;

    const trendContainer = document.getElementById('custom-detail-additional');
    if (trendContainer) {
      const filteredSeries = this.getFilteredSeries(def);
      const filteredShots = this.getFilteredShots(def);

      if (isLargeViz) {
        let content = '';
        if (def.type === 'heatmap') {
          content = `<div class="w-[21rem] h-[21rem] max-w-[86vw] max-h-[86vw]">${this.renderHeatmap(filteredShots)}</div>`;
        } else if (def.type === 'combined') {
          content = `<div class="w-[21rem] h-[21rem] max-w-[86vw] max-h-[86vw]">${this.renderMiniTarget(filteredShots, false)}</div>`;
        } else if (def.type === 'trend') {
          const dayOptions = [
            { id: 7, label: '7 Tage' },
            { id: 14, label: '14 Tage' },
            { id: 30, label: '30 Tage' },
            { id: 'all', label: 'Alle' },
          ];
          const daySelector = dayOptions
            .map((opt) => {
              const isActive = String(this.trendDayRange) === String(opt.id);
              return `<button onclick="Analytics.setTrendDayRange('${opt.id}')" class="px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
                isActive
                  ? 'bg-primary/20 text-primary border-primary/60'
                  : 'bg-card-dark text-off-white/80 border-subtle hover:bg-white/5'
              }">${opt.label}</button>`;
            })
            .join('');

          content = `
            <div class="w-full max-w-[520px]">
              <div class="flex flex-wrap gap-2 justify-center">${daySelector}</div>
              <div class="w-full h-[280px]">${this.renderTrendChart(filteredSeries, true, this.trendDayRange)}</div>
            </div>
          `;
        } else if (def.type === 'shot_time')
          content = this.renderShotTimeAnalysis(filteredSeries, true);
        else if (def.type === 'rhythm') content = this.renderRhythmAnalysis(filteredSeries, true);
        else if (def.type === 'mean_shot') content = this.renderMeanShot(filteredShots, true);
        else if (def.type === 'direction')
          content = this.renderDirectionTendency(filteredShots, true);

        trendContainer.innerHTML = `
          <div class="flex items-center justify-center pt-1 pb-3">
            ${content}
          </div>
        `;
      } else if (filteredSeries.length > 0) {
        trendContainer.innerHTML = `
          <div class="bg-card-dark rounded-2xl border border-subtle overflow-hidden">
            <div class="px-4 py-3 border-b border-subtle flex justify-between items-center">
              <span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Trendverlauf</span>
            </div>
            <div class="p-4 h-48">
              ${this.renderTrendChart(filteredSeries, true)}
            </div>
          </div>
        `;
      }
    }
  }

  getFilteredShots(def) {
    if (!this.currentSeriesList) return [];
    let shots = [];
    const series = this.getFilteredSeries(def);
    series.forEach((s) => {
      if (s.shots) {
        if (def.focus === 'all' || !def.focus) {
          shots.push(...s.shots);
        } else if (def.focus === 'after_miss') {
          for (let i = 1; i < s.shots.length; i++) {
            if (!s.shots[i - 1].hit) shots.push(s.shots[i]);
          }
        } else {
          const indices = def.focus.split(',').map((v) => parseInt(v) - 1);
          indices.forEach((idx) => {
            if (s.shots[idx]) shots.push(s.shots[idx]);
          });
        }
      }
    });
    return shots;
  }

  getSeriesIndexInSession(s) {
    if (!s.sessionId) return -1;
    const sess = this.sessions.find((session) => session.id === s.sessionId);
    if (!sess || !sess.series) return -1;
    let sessSeries = sess.series || [];
    if (this.userRole === 'athlete' && this.personalAthleteId) {
      sessSeries = sessSeries.filter((ser) => ser.athleteId === this.personalAthleteId);
    }

    const sorted = [...sessSeries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return sorted.findIndex((ser) => ser.id === s.id);
  }

  getSessionFilterOptions() {
    if (!this.currentSeriesList) return [{ id: 'all', label: 'Alle Einheiten' }];
    const sessionIdsInContext = new Set(
      this.currentSeriesList.map((s) => s.sessionId).filter(Boolean)
    );
    const contextSessions = this.sessions.filter((s) => sessionIdsInContext.has(s.id));
    contextSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return [
      { id: 'all', label: 'Alle Einheiten' },
      ...contextSessions.map((s) => {
        const dateStr = new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
        return { id: String(s.id), label: `${dateStr} - ${s.name || s.location || 'Einheit'}` };
      }),
    ];
  }

  getAthleteFilterOptions(sessionIdVal = 'all') {
    if (!this.currentSeriesList) return [{ id: 'all', label: 'Alle Sportler' }];

    const selectedSessionIds = this.getSelectedSessionIds(sessionIdVal);
    const selectedSet = new Set(selectedSessionIds);

    const seriesInContext = this.currentSeriesList.filter((s) => {
      if (s.isPlaceholder || !s.athleteId) return false;
      if (selectedSet.size === 0) return true;
      return selectedSet.has(s.sessionId);
    });

    const athleteIdSet = new Set(seriesInContext.map((s) => s.athleteId));
    const options = [...athleteIdSet]
      .map((id) => {
        const athlete = this.athletes.find((a) => a.id === id);
        return {
          id: String(id),
          label: athlete?.name || `${t('unknown_athlete') || 'Unbekannter Sportler'} #${id}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

    return [{ id: 'all', label: 'Alle Sportler' }, ...options];
  }

  getSeriesFilterOptions(sessionIdVal = 'all') {
    if (!this.currentSeriesList) return [{ id: 'all', label: 'Alle Serien' }];
    const sessionIdsInContext = new Set(
      this.currentSeriesList.map((s) => s.sessionId).filter(Boolean)
    );
    const contextSessions = this.sessions.filter((s) => sessionIdsInContext.has(s.id));

    let maxSeries = 5;
    const selectedSessionIds = this.getSelectedSessionIds(sessionIdVal);
    if (selectedSessionIds.length > 0) {
      selectedSessionIds.forEach((sessionId) => {
        const selectedSess = this.sessions.find((s) => s.id === sessionId);
        if (selectedSess && selectedSess.series) {
          let sList = selectedSess.series;
          if (this.userRole === 'athlete' && this.personalAthleteId) {
            sList = sList.filter((s) => s.athleteId === this.personalAthleteId);
          }

          if (sList.length > maxSeries) maxSeries = sList.length;
        }
      });
    } else {
      contextSessions.forEach((s) => {
        if (s.series) {
          let sList = s.series;
          if (this.userRole === 'athlete' && this.personalAthleteId) {
            sList = sList.filter((ser) => ser.athleteId === this.personalAthleteId);
          }

          if (sList.length > maxSeries) maxSeries = sList.length;
        }
      });
    }

    return [
      { id: 'all', label: 'Alle Serien' },
      ...Array.from({ length: maxSeries }).map((_, i) => ({
        id: String(i + 1),
        label: `Serie ${i + 1}`,
      })),
    ];
  }

  getFilteredSeries(def) {
    if (!this.currentSeriesList) return [];
    let filtered = this.currentSeriesList.filter((s) => !s.isPlaceholder);

    const selectedSessionIds = this.getSelectedSessionIds(def.session_id);
    if (selectedSessionIds.length > 0) {
      const selectedSet = new Set(selectedSessionIds);
      filtered = filtered.filter((s) => selectedSet.has(s.sessionId));
    }

    const athleteIdVal = String(def.athlete_id || def.athleteId || 'all');
    if (athleteIdVal !== 'all') {
      const selectedAthleteId = parseInt(athleteIdVal, 10);
      if (!Number.isNaN(selectedAthleteId)) {
        filtered = filtered.filter((s) => s.athleteId === selectedAthleteId);
      }
    }

    if (def.series_index && def.series_index !== 'all') {
      const targetIdx = parseInt(def.series_index) - 1;
      filtered = filtered.filter((s) => this.getSeriesIndexInSession(s) === targetIdx);
    }

    if (def.stance && def.stance !== 'all') {
      filtered = filtered.filter((s) => {
        const sVal = (s.stance || '').toLowerCase();
        const dVal = (def.stance || '').toLowerCase();
        return (
          sVal === dVal ||
          (dVal === 'prone' && sVal === 'liegend') ||
          (dVal === 'standing' && sVal === 'stehend')
        );
      });
    }

    const sessionTypeVal = def.session_type || def.sessionType;
    if (sessionTypeVal && sessionTypeVal !== 'all') {
      filtered = filtered.filter((s) => {
        const sVal = (s.session_type || s.sessionType || s.category || '').toLowerCase();
        const dVal = (sessionTypeVal || '').toLowerCase();
        if (dVal === 'competition') {
          return sVal === 'competition' || sVal === 'test_competition';
        }
        return sVal === dVal;
      });
    }

    if (def.intensity && def.intensity !== 'all') {
      filtered = filtered.filter(
        (s) =>
          normalizeIntensityLevel(s.intensity || 'Ruhe').toLowerCase() ===
          normalizeIntensityLevel(def.intensity).toLowerCase()
      );
    }

    return filtered;
  }

  toggleDetailFilter(key) {
    const dropdown = document.getElementById(`detail-dropdown-${key}`);
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    document.querySelectorAll('[id^="detail-dropdown-"]').forEach((d) => d.classList.add('hidden'));
    if (isHidden) dropdown.classList.remove('hidden');
  }

  updateDetailFilter(key, value) {
    document.querySelectorAll('[id^="detail-dropdown-"]').forEach((d) => d.classList.add('hidden'));
    this.viewedCustomAnalysis[key] = value;
    this.renderCustomAnalysisDetail();
  }

  setTrendDayRange(days) {
    const normalized = String(days) === 'all' ? 'all' : parseInt(days, 10);
    if (normalized !== 'all' && Number.isNaN(normalized)) return;
    this.trendDayRange = normalized;
    if (this.currentView === 'custom_detail' && this.viewedCustomAnalysis?.type === 'trend') {
      this.renderCustomAnalysisDetail();
    }
  }

  calculateCustomMetric(def) {
    if (!this.currentSeriesList || this.currentSeriesList.length === 0) {
      return { value: '-', unit: '', label: 'Keine Daten', numericValue: 0 };
    }

    let filteredSeries = this.getFilteredSeries(def);

    let shots = [];
    filteredSeries.forEach((s) => {
      if (s.shots) {
        if (def.focus === 'all') {
          shots.push(...s.shots);
        } else if (def.focus === 'after_miss') {
          for (let i = 1; i < s.shots.length; i++) {
            if (!s.shots[i - 1].hit) {
              shots.push(s.shots[i]);
            }
          }
        } else {
          const indices = def.focus.split(',').map((v) => parseInt(v) - 1);
          indices.forEach((idx) => {
            if (s.shots[idx]) shots.push(s.shots[idx]);
          });
        }
      }
    });

    if (shots.length === 0 && def.type !== 'series_count') {
      return { value: '-', unit: '', label: 'Keine Daten', numericValue: 0 };
    }

    const type = def.type;
    let value = '-';
    let unit = '';
    let label = t(`metric_${type}`) || type;
    let numericValue = 0;

    switch (type) {
      case 'hit_rate': {
        const hits = shots.filter((s) => s.hit || s.isHit).length;
        numericValue = shots.length > 0 ? (hits / shots.length) * 100 : 0;
        value = Math.round(numericValue).toString();
        unit = '%';
        label = t('hit_rate') || 'Trefferquote';
        break;
      }
      case 'avg_ring': {
        const totalRings = shots.reduce((sum, s) => sum + (s.ring || 0), 0);
        numericValue = shots.length > 0 ? totalRings / shots.length : 0;
        value = numericValue.toFixed(1);
        unit = '';
        label = t('avg_rings') || 'Ø Ringe';
        break;
      }
      case 'series_count': {
        numericValue = filteredSeries.length;
        value = numericValue.toString();
        label = t('series') || 'Serien';
        break;
      }
      case 'shots_count': {
        numericValue = shots.length;
        value = numericValue.toString();
        label = t('shots_count') || 'Schüsse';
        break;
      }
      case 'group_size': {
        const n = shots.length;
        if (n === 0) break;
        const meanX = shots.reduce((s, sh) => s + (sh.x || 100), 0) / n;
        const meanY = shots.reduce((s, sh) => s + (sh.y || 100), 0) / n;
        const avgDist =
          shots.reduce((sum, sh) => {
            return (
              sum +
              Math.sqrt(Math.pow((sh.x || 100) - meanX, 2) + Math.pow((sh.y || 100) - meanY, 2))
            );
          }, 0) / n;

        numericValue = avgDist / 10;
        value = numericValue.toFixed(2);
        unit = 'R';
        label = 'Ø Streuung';
        break;
      }
      case 'first_shot': {
        const times = filteredSeries
          .map((s) => {
            if (s.splits && s.splits[0]) {
              const parts = s.splits[0].split(':');
              if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
              return parseFloat(s.splits[0]);
            }
            return null;
          })
          .filter((t) => t !== null);

        if (times.length > 0) {
          numericValue = times.reduce((a, b) => a + b, 0) / times.length;
          value = numericValue.toFixed(1);
        }
        unit = t('unit_seconds') || 'sek';
        label = t('metric_first_shot') || 'Zeit 1. Schuss';
        break;
      }
      case 'avg_rhythm': {
        let allSplits = [];
        filteredSeries.forEach((s) => {
          if (s.splits && s.splits.length > 1) {
            for (let i = 1; i < s.splits.length; i++) {
              const parts = s.splits[i].split(':');
              if (parts.length === 2) allSplits.push(parseInt(parts[0]) * 60 + parseInt(parts[1]));
              else allSplits.push(parseFloat(s.splits[i]));
            }
          }
        });
        if (allSplits.length > 0) {
          numericValue = allSplits.reduce((a, b) => a + b, 0) / allSplits.length;
          value = numericValue.toFixed(2);
        }
        unit = t('unit_seconds') || 'sek';
        label = t('metric_avg_rhythm') || 'Ø Rhythmus';
        break;
      }
      case 'total_time': {
        let totalTimes = [];
        filteredSeries.forEach((s) => {
          if (s.splits && s.splits.length > 0) {
            const lastSplit = s.splits[s.splits.length - 1];
            const parts = lastSplit.split(':');
            if (parts.length === 2) totalTimes.push(parseInt(parts[0]) * 60 + parseInt(parts[1]));
            else totalTimes.push(parseFloat(lastSplit));
          }
        });
        if (totalTimes.length > 0) {
          numericValue = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
          value = numericValue.toFixed(1);
        }
        unit = t('unit_seconds') || 'sek';
        label = t('metric_total_series_time') || 'Gesamtzeit';
        break;
      }
      case 'avg_offset': {
        const nShots = shots.length;
        if (nShots > 0) {
          const totalDist = shots.reduce((sum, sh) => {
            return (
              sum + Math.sqrt(Math.pow((sh.x || 100) - 100, 2) + Math.pow((sh.y || 100) - 100, 2))
            );
          }, 0);
          numericValue = totalDist / nShots / 10;
          value = numericValue.toFixed(2);
        }
        unit = t('unit_rings') || 'R';
        label = t('metric_avg_offset') || 'Ø Offset';
        break;
      }
      default:
        value = '?';
        break;
    }

    return { value, unit, label, numericValue };
  }

  applyAnalysisVisibility() {
    const types = ['heatmap', 'combined', 'trend', 'mean-shot', 'direction'];
    types.forEach((type) => {
      const isVisible = localStorage.getItem(`b_analysis_${type}`) !== 'false';
      const section = document.getElementById(`section-${type}`);
      if (section) {
        if (isVisible) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      }
    });
  }

  renderTrendChart(series, isLarge = false, maxDays = null) {
    if (!series || series.length === 0) {
      return `<div class="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">${t('no_trend_data') || 'Keine Daten für Trend'}</div>`;
    }

    const dayData = {};
    series.forEach((s) => {
      if (!s.timestamp || s.isPlaceholder) return;
      const tsDate = new Date(s.timestamp);
      const dateKey = `${tsDate.getFullYear()}-${String(tsDate.getMonth() + 1).padStart(2, '0')}-${String(tsDate.getDate()).padStart(2, '0')}`;
      if (!dayData[dateKey]) {
        dayData[dateKey] = { hits: 0, total: 0, time: new Date(tsDate).setHours(0, 0, 0, 0) };
      }

      const h = s.shots ? s.shots.filter((sh) => sh.hit).length : 0;
      const t = s.shots ? s.shots.length : 0;
      dayData[dateKey].hits += h;
      dayData[dateKey].total += t;
    });

    let sortedDays = Object.keys(dayData)
      .map((d) => ({ date: d, ...dayData[d] }))
      .sort((a, b) => a.time - b.time);

    const effectiveMaxDays =
      maxDays === null
        ? isLarge
          ? null
          : this.trendOverviewDays
        : maxDays === 'all'
          ? null
          : maxDays;
    if (effectiveMaxDays && sortedDays.length > effectiveMaxDays) {
      sortedDays = sortedDays.slice(-effectiveMaxDays);
    }

    if (sortedDays.length === 0) {
      return `<div class="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">${t('no_trend_data') || 'Keine Daten für Trend'}</div>`;
    }

    const width = isLarge ? 400 : 300;
    const height = isLarge ? 300 : 150;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = sortedDays.map((d, i) => {
      const x =
        padding +
        (sortedDays.length > 1 ? (i / (sortedDays.length - 1)) * chartWidth : chartWidth / 2);
      const hitRate = d.total > 0 ? (d.hits / d.total) * 100 : 0;
      const y = padding + (1 - hitRate / 100) * chartHeight;
      const labelDate = new Date(d.time).toLocaleDateString([], {
        day: '2-digit',
        month: '2-digit',
      });
      return { x, y, hitRate, date: d.date, labelDate };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, i) => {
      if (i > 0) pathD += ` L ${p.x} ${p.y}`;
    });

    const yTicks = [0, 25, 50, 75, 100];
    const horizontalGrid = yTicks
      .map((tick) => {
        const y = padding + (1 - tick / 100) * chartHeight;
        return `
          <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#8E8E93" stroke-width="0.9" opacity="0.34" stroke-dasharray="${tick === 0 || tick === 100 ? 'none' : '3 3'}" />
          <text x="${padding - 6}" y="${y + 2}" font-size="8" fill="#8E8E93" text-anchor="end">${tick}%</text>
        `;
      })
      .join('');

    const verticalGrid = points
      .map(
        (p) =>
          `<line x1="${p.x}" y1="${padding}" x2="${p.x}" y2="${height - padding}" stroke="#8E8E93" stroke-width="0.8" opacity="0.3" />`
      )
      .join('');

    const dots = points
      .map(
        (p) => `
      <circle cx="${p.x}" cy="${p.y}" r="${isLarge ? 4 : 3}" fill="#007AFF" stroke="white" stroke-width="1.5" />
      <text x="${p.x}" y="${height - 10}" font-size="8" fill="#8E8E93" text-anchor="middle" class="font-bold">${p.labelDate}</text>
      <text x="${p.x}" y="${Math.max(p.y - 8, padding + 8)}" font-size="8" fill="#60A5FA" text-anchor="middle" class="font-bold">${Math.round(p.hitRate)}%</text>
    `
      )
      .join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-full">
        ${horizontalGrid}
        ${verticalGrid}

        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#8E8E93" stroke-width="1" opacity="0.5" />
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#8E8E93" stroke-width="1" opacity="0.5" />

        <!-- Path -->
        <path d="${pathD}" fill="none" stroke="#007AFF" stroke-width="${isLarge ? 4 : 3}" stroke-linecap="round" stroke-linejoin="round" />

        ${dots}
      </svg>
    `;
  }

  renderHeatmap(shots) {
    const center = { x: 100, y: 100 };
    let countZone1 = 0;
    let countZone2 = 0;
    let countZone3 = 0;
    let countZone4Total = 0;
    let countZone4TopRight = 0;
    let countZone4BottomRight = 0;
    let countZone4BottomLeft = 0;
    let countZone4TopLeft = 0;
    shots.forEach((shot) => {
      if (!shot) return;
      const dx = shot.x - center.x;
      const dy = shot.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 15) {
        countZone1++;
      } else if (distance <= 30) {
        countZone2++;
      } else if (distance <= 70) {
        countZone3++;
      } else {
        countZone4Total++;
        if (dx > 0 && dy < 0) countZone4TopRight++;
        else if (dx > 0 && dy > 0) countZone4BottomRight++;
        else if (dx < 0 && dy > 0) countZone4BottomLeft++;
        else if (dx < 0 && dy < 0) countZone4TopLeft++;
      }
    });
    const total = shots.length;
    const p = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);
    const positions = [
      { x: 100, y: 100, percent: p(countZone1), size: 12 },
      { x: 100, y: 80, percent: p(countZone2), size: 11 },
      { x: 100, y: 50, percent: p(countZone3), size: 11 },
      { x: 165, y: 40, percent: p(countZone4TopRight), size: 11 },
      { x: 165, y: 160, percent: p(countZone4BottomRight), size: 11 },
      { x: 35, y: 160, percent: p(countZone4BottomLeft), size: 11 },
      { x: 35, y: 40, percent: p(countZone4TopLeft), size: 11 },
      { x: 100, y: 15, percent: p(countZone4Total), size: 11 },
    ];
    let svg = `
            <svg viewBox="0 0 200 200" class="w-full h-full rounded-full bg-zinc-100 shadow-inner overflow-hidden">
                <style>
                    .zone-percentage { font-family: sans-serif; text-anchor: middle; dominant-baseline: central; font-weight: 900; }
                    .crosshair-line { stroke: #ffffff; stroke-width: 1px; opacity: 0.9; }
                </style>
                <circle cx="100" cy="100" r="100" fill="#560101" />
                <circle cx="100" cy="100" r="70" fill="#034286" />
                <circle cx="100" cy="100" r="30" fill="#226b03" stroke="white" stroke-width="2" />
                <circle cx="100" cy="100" r="15" fill="#fbbf24" />
                <line x1="100" y1="0" x2="100" y2="200" class="crosshair-line" />
                <line x1="0" y1="100" x2="200" y2="100" class="crosshair-line" />
        `;
    positions.forEach((pos) => {
      const textColor = pos.y === 100 && pos.x === 100 ? 'black' : 'white';
      svg += `<text x="${pos.x}" y="${pos.y}" class="zone-percentage" font-size="${pos.size}" fill="${textColor}">${pos.percent}%</text>`;
    });
    svg += `</svg>`;
    return svg;
  }

  exportAthleteToPDF(athlete, series) {
    if (!window.jspdf) {
      alert('PDF library not loaded');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.text(t('analytics') || 'Analytics', 14, 20);

    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text(athlete.name, 14, 30);

    const totalShots = series.reduce((sum, s) => sum + (s.shots ? s.shots.length : 0), 0);
    const hitCount = series.reduce(
      (sum, s) => sum + (s.shots ? s.shots.filter((sh) => sh.hit).length : 0),
      0
    );
    const hitRate = totalShots > 0 ? `${Math.round((hitCount / totalShots) * 100)}%` : '-';

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`${t('hit_rate')}: ${hitRate} (${hitCount}/${totalShots})`, 14, 40);
    doc.text(`${t('history')}: ${series.length} ${t('series')}`, 14, 45);

    const head = [
      [
        t('session_date') || 'Datum',
        t('location') || 'Ort',
        t('stance') || 'Anschlag',
        t('hits') || 'Treffer',
        t('total_time') || 'Zeit',
      ],
    ];

    const body = series.map((s) => {
      const sHits = s.shots ? s.shots.filter((sh) => sh.hit).length : 0;
      const sTotal = s.shots ? s.shots.length : 0;
      const dateStr = new Date(s.timestamp).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return [
        dateStr,
        s.sessionLocation || '-',
        s.type === 'zeroing' ? t('zeroing') : s.stance === 'prone' ? t('prone') : t('standing'),
        `${sHits}/${sTotal}`,
        s.totalTime || '-',
      ];
    });

    if (doc.autoTable) {
      doc.autoTable({
        head,
        body,
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [0, 122, 255] },
      });
    }

    doc.save(`Analytics_${athlete.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  }

  exportAthleteToExcel(athlete, series) {
    if (typeof XLSX === 'undefined') {
      alert('Excel library not loaded');
      return;
    }

    const data = series.map((s) => {
      const sHits = s.shots ? s.shots.filter((sh) => sh.hit).length : 0;
      const sTotal = s.shots ? s.shots.length : 0;
      const hitRate = sTotal > 0 ? Math.round((sHits / sTotal) * 100) : 0;

      return {
        [t('session_date') || 'Datum']: new Date(s.timestamp).toLocaleDateString(),
        [t('location') || 'Ort']: s.sessionLocation || '-',
        [t('stance') || 'Anschlag']: s.type === 'zeroing' ? t('zeroing') : s.stance,
        [t('hits') || 'Treffer']: sHits,
        [t('total') || 'Gesamt']: sTotal,
        [t('hit_rate') || 'Quote (%)']: hitRate,
        [t('total_time') || 'Zeit']: s.totalTime || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');

    const wscols = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Analytics_${athlete.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  }

  exportSessionToPDF_Analytics(session, series) {
    if (!window.jspdf) {
      alert('PDF library not loaded');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text(session.name, 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${session.location || '-'} | ${new Date(session.date).toLocaleDateString()}`, 14, 28);

    const uniqueAthleteIds = [...new Set(series.map((s) => s.athleteId))];
    const sessionAthletes = uniqueAthleteIds.map((id) => {
      const athlete = this.athletes.find((a) => a.id == id);
      return athlete || { id, name: t('unknown_athlete') };
    });

    let maxSeriesCount = 0;
    sessionAthletes.forEach((athlete) => {
      const count = series.filter((s) => s.athleteId == athlete.id).length;
      if (count > maxSeriesCount) maxSeriesCount = count;
    });

    const seriesCols = Array.from({ length: maxSeriesCount }, (_, i) => `SF ${i + 1}`);

    const head = [[t('name') || 'Name', t('hits') || 'Treffer', ...seriesCols]];

    const body = sessionAthletes.map((athlete) => {
      const atomSeries = series
        .filter((s) => s.athleteId == athlete.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const hitCount = atomSeries.reduce(
        (sum, s) =>
          sum + (s.stats?.hitCount || (s.shots ? s.shots.filter((sh) => sh.hit).length : 0)),
        0
      );
      const totalShots = atomSeries.reduce(
        (sum, s) => sum + (s.stats?.totalShots || (s.shots ? s.shots.length : 0)),
        0
      );
      const hitRate = totalShots > 0 ? `${Math.round((hitCount / totalShots) * 100)}%` : '-';

      const seriesData = Array.from({ length: maxSeriesCount }, (_, i) => {
        const s = atomSeries[i];
        if (!s) return '-';
        const sHits = s.shots ? s.shots.filter((sh) => sh.hit).length : s.stats?.hitCount || 0;
        const sTotal = s.shots ? s.shots.length : s.stats?.totalShots || 0;
        return `${s.rangeTime || s.totalTime || '-'} (${sHits}/${sTotal})`;
      });

      return [athlete.name, `${hitCount}/${totalShots} (${hitRate})`, ...seriesData];
    });

    if (doc.autoTable) {
      doc.autoTable({
        head,
        body,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [0, 122, 255] },
      });
    }

    doc.save(`Session_${session.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  }

  exportSessionToExcel_Analytics(session, series) {
    if (typeof XLSX === 'undefined') {
      alert('Excel library not loaded');
      return;
    }

    const lang = typeof getLanguage === 'function' ? getLanguage() : 'en';
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    const dateStr = new Date(session.date).toLocaleDateString(locale, {
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

    const athleteIdsFromSession = Array.isArray(session.athletes) ? session.athletes : [];
    const athleteIdsFromSeries = series.map((s) => s.athleteId);
    const uniqueAthleteIds = [...new Set([...athleteIdsFromSession, ...athleteIdsFromSeries])];
    const sessionAthletes = uniqueAthleteIds.map((id) => {
      const athleteFromList = this.athletes.find((a) => a.id == id);
      const athleteFromSession = Array.isArray(session.athleteData)
        ? session.athleteData.find((a) => a.id == id)
        : null;
      return (
        athleteFromList || athleteFromSession || { id, name: t('unknown_athlete'), ageGroup: '-' }
      );
    });

    const athleteSummaries = sessionAthletes.map((athlete) => {
      const athleteSeries = series
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

    const workbook = XLSX.utils.book_new();
    const usedNames = new Set();
    const summaryData = [
      [session.name || 'Session'],
      ['Datum', dateStr],
      ['Ort', session.location || '-'],
      ['Typ', getTranslatedSessionType(session.type)],
      [],
      [
        t('name') || 'Name',
        t('age_group') || 'Altersklasse',
        'Serien',
        t('hits') || 'Treffer',
        t('total') || 'Gesamt',
        t('hit_rate') || 'Quote (%)',
        'Durchschnitt Serie (%)',
      ],
      ...athleteSummaries.map((entry) => [
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

    athleteSummaries.forEach((entry) => {
      const athleteSheetData = [
        [`Athlet: ${entry.athlete.name}`],
        ['Session', session.name || '-'],
        ['Datum', dateStr],
        ['Ort', session.location || '-'],
        ['Typ', getTranslatedSessionType(session.type)],
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

    XLSX.writeFile(workbook, `Session_${session.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  }

  renderDirectionTendency(shots, returnHtml = false) {
    const container = document.getElementById('dir-tendency-container');
    const hasContainer = !!container;
    if (!hasContainer && !returnHtml) return '';

    const missShots = (shots || []).filter((s) => !s.hit);
    const emptyState =
      '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Fehlschüsse vorhanden</div>';
    if (missShots.length === 0) {
      if (returnHtml) return emptyState;
      if (container) container.innerHTML = emptyState;
      return emptyState;
    }

    const nMiss = missShots.length;
    const meanMissX = missShots.reduce((s, sh) => s + (sh.x || 100), 0) / nMiss;
    const meanMissY = missShots.reduce((s, sh) => s + (sh.y || 100), 0) / nMiss;

    const dists = missShots.map((sh) =>
      Math.sqrt(Math.pow((sh.x || 100) - meanMissX, 2) + Math.pow((sh.y || 100) - meanMissY, 2))
    );
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const varMiss = dists.reduce((a, b) => a + Math.pow(b - avgDist, 2), 0) / dists.length;
    const stdDevMiss = Math.sqrt(varMiss);

    const shotSize = typeof getShotSize === 'function' ? getShotSize() : 6;
    const crosshairMiss = `
      <circle cx="${meanMissX.toFixed(1)}" cy="${meanMissY.toFixed(1)}" r="${shotSize}" fill="#f43f5e" stroke="white" stroke-width="1.5" />
    `;

    const offX = (meanMissX - 100) / 10;
    const offY = (meanMissY - 100) / 10;
    const offXLabel =
      offX > 0
        ? `${offX.toFixed(2)} R rechts`
        : offX < 0
          ? `${Math.abs(offX).toFixed(2)} R links`
          : 'mittig';
    const offYLabel =
      offY > 0
        ? `${offY.toFixed(2)} R unten`
        : offY < 0
          ? `${Math.abs(offY).toFixed(2)} R oben`
          : 'mittig';

    const meanRadMiss = Math.sqrt(Math.pow(meanMissX - 100, 2) + Math.pow(meanMissY - 100, 2));
    const meanRingMiss = Math.max(0, 11 - meanRadMiss / 10).toFixed(2);

    const infoHtml = `
      <div class="mt-4 space-y-2 px-1">
      <div class="flex justify-between items-center bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
        <span class="text-[10px] font-black text-rose-500/60 uppercase tracking-widest">Ø Fehler-Punkt (Ring)</span>
        <span class="text-lg font-black text-rose-500">${meanRingMiss}</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Abweichung</p>
           <p class="text-[11px] font-bold text-off-white">${offXLabel}<br/>${offYLabel}</p>
        </div>
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Ø Streuung (σ)</p>
           <p class="text-[11px] font-bold text-off-white">${(stdDevMiss / 10).toFixed(2)} <span class="text-[9px] opacity-40">Ringe</span></p>
        </div>
      </div>
      </div>`;

    const targetSizeClass = returnHtml ? 'w-80 h-80 max-w-[88vw] max-h-[88vw]' : 'w-72 h-72';
    const html = `${this._meanShotTargetSvg('', crosshairMiss, '', targetSizeClass)}${infoHtml}`;
    if (returnHtml) {
      return `<div class="w-full max-w-[520px] flex flex-col items-center">${html}</div>`;
    }

    if (container) container.innerHTML = html;
    return html;
  }

  renderShotTimeAnalysis(seriesList) {
    const container = document.getElementById('shot-time-container');
    if (!container) return;

    const parseSplit = (str) => {
      if (!str || str === '-') return null;
      const s = String(str).trim();
      const parts = s.split(':');
      if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(s) || null;
    };

    const hitTimes = [],
      missTimes = [];
    const zones = [
      { label: '< 3s', min: 0, max: 3, id: 'fast' },
      { label: '3–5s', min: 3, max: 5, id: 'steady' },
      { label: '5–8s', min: 5, max: 8, id: 'focused' },
      { label: '> 8s', min: 8, max: Infinity, id: 'slow' },
    ];
    const zoneHits = zones.map(() => 0);
    const zoneMisses = zones.map(() => 0);

    (seriesList || []).forEach((series) => {
      if (!series.splits || !series.shots) return;
      series.shots.forEach((shot, idx) => {
        const raw = series.splits[idx];
        const sec = parseSplit(raw);
        if (sec === null) return;
        if (shot.hit) hitTimes.push(sec);
        else missTimes.push(sec);
        zones.forEach((z, zi) => {
          if (sec >= z.min && sec < z.max) {
            if (shot.hit) zoneHits[zi]++;
            else zoneMisses[zi]++;
          }
        });
      });
    });

    const hasSplitData = hitTimes.length + missTimes.length > 0;
    if (!hasSplitData) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Keine Split-Daten vorhanden (Splits werden beim Schießen automatisch erfasst)</div>';
      return;
    }

    const avg = (arr) =>
      arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
    const avgHit = avg(hitTimes);
    const avgMiss = avg(missTimes);

    let bestZoneIdx = -1;
    let maxRate = -1;
    zones.forEach((z, i) => {
      const total = zoneHits[i] + zoneMisses[i];
      if (total >= 3) {
        const rate = (zoneHits[i] / total) * 100;
        if (rate > maxRate) {
          maxRate = rate;
          bestZoneIdx = i;
        }
      }
    });

    const zoneHtml = zones
      .map((z, i) => {
        const total = zoneHits[i] + zoneMisses[i];
        const rate = total > 0 ? Math.round((zoneHits[i] / total) * 100) : 0;
        const isBest = i === bestZoneIdx;

        let barColor = 'bg-zinc-800';
        if (total > 0) {
          if (rate >= 85) barColor = 'bg-neon-green';
          else if (rate >= 60) barColor = 'bg-yellow-400';
          else barColor = 'bg-rose-500';
        }

        return `
        <div class="space-y-1.5">
          <div class="flex justify-between items-end px-1">
            <span class="text-[10px] font-black ${isBest ? 'text-primary' : 'text-zinc-500'} uppercase tracking-tight">${z.label}</span>
            <div class="flex items-baseline gap-1">
               <span class="text-xs font-black text-off-white">${rate}%</span>
               <span class="text-[8px] font-bold text-zinc-600 uppercase">Rate</span>
            </div>
          </div>
          <div class="h-3 w-full bg-off-white/5 rounded-full overflow-hidden border border-subtle/20 flex gap-0.5 p-0.5">
            <div class="h-full ${barColor} rounded-full transition-all duration-1000 shadow-sm" style="width: ${rate}%"></div>
          </div>
          <div class="flex justify-between px-1">
            <span class="text-[8px] font-bold text-zinc-600 uppercase">${total} Schüsse</span>
            ${isBest ? '<span class="text-[8px] font-black text-primary uppercase tracking-widest">Comfort Zone</span>' : ''}
          </div>
        </div>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Summary Dashboard -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-card-dark border border-subtle rounded-2xl p-4 shadow-lg relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-12 h-12 bg-neon-green/5 -mr-4 -mt-4 rounded-full blur-xl"></div>
            <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 leading-none">Ø Zeit Treffer</p>
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-black text-neon-green">${avgHit || '–'}</span>
              <span class="text-[10px] font-bold text-zinc-500 uppercase">sek</span>
            </div>
          </div>
          <div class="bg-card-dark border border-subtle rounded-2xl p-4 shadow-lg relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-12 h-12 bg-rose-500/5 -mr-4 -mt-4 rounded-full blur-xl"></div>
            <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 leading-none">Ø Zeit Fehler</p>
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-black text-rose-500">${avgMiss || '–'}</span>
              <span class="text-[10px] font-bold text-zinc-500 uppercase">sek</span>
            </div>
          </div>
        </div>

        <!-- Zones Grid -->
        <div class="space-y-4">
          <div class="flex justify-between items-center px-1">
            <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Quote nach Zeitfenster</p>
            <div class="flex gap-2">
               <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-neon-green"></div><span class="text-[8px] font-bold text-zinc-600 uppercase">Gut</span></div>
               <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-yellow-400"></div><span class="text-[8px] font-bold text-zinc-600 uppercase">Mittel</span></div>
               <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div><span class="text-[8px] font-bold text-zinc-600 uppercase">Kritisch</span></div>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-4 bg-off-white/5 p-4 rounded-2xl border border-subtle/50">
            ${zoneHtml}
          </div>
        </div>

        <!-- Insight Message -->
        ${
          bestZoneIdx !== -1
            ? `
          <div class="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
             <span class="material-symbols-outlined text-primary text-xl">psychology</span>
             <p class="text-xs font-medium text-off-white/80">
               Deine höchste Präzision liegt im Bereich <span class="text-primary font-bold">${zones[bestZoneIdx].label}</span>.
               ${bestZoneIdx === 0 ? 'Extrem mutiges Timing!' : bestZoneIdx === 3 ? 'Geduld zahlt sich aus.' : 'Ein stabiler Rhythmus.'}
             </p>
          </div>
        `
            : ''
        }
      </div>`;
  }

  renderRhythmAnalysis(seriesList) {
    const container = document.getElementById('rhythm-container');
    if (!container) return;

    const parseSplit = (str) => {
      if (!str || str === '-') return null;
      const s = String(str).trim();
      const parts = s.split(':');
      if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      return parseFloat(s) || null;
    };

    const dataByStep = [
      { clean: [], error: [] },
      { clean: [], error: [] },
      { clean: [], error: [] },
      { clean: [], error: [] },
    ];

    (seriesList || [])
      .filter((s) => s.splits && s.shots && s.shots.length > 1)
      .forEach((series) => {
        const anyMiss = series.shots.some((s) => !s.hit);
        let prevSec = null;
        for (let i = 0; i < Math.min(series.shots.length, 5); i++) {
          const sec = parseSplit(series.splits[i]);
          if (sec === null) {
            prevSec = null;
            continue;
          }

          if (i > 0 && prevSec !== null && dataByStep[i - 1]) {
            const interval = sec - prevSec;
            if (interval > 0 && interval < 40) {
              if (anyMiss) dataByStep[i - 1].error.push(interval);
              else dataByStep[i - 1].clean.push(interval);
            }
          }
          prevSec = sec;
        }
      });

    const hasData = dataByStep.some((d) => d.clean.length + d.error.length > 0);
    if (!hasData) {
      container.innerHTML =
        '<div class="text-center text-zinc-500 text-xs italic py-4">Zu wenig Rhythmus-Daten vorhanden</div>';
      return;
    }

    const calcStats = (arr) => {
      if (arr.length === 0) return { avg: null, sd: 0 };
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      const sd =
        arr.length > 1
          ? Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length)
          : 0;
      return { avg, sd };
    };

    const statsClean = dataByStep.map((d) => calcStats(d.clean));
    const statsError = dataByStep.map((d) => calcStats(d.error));

    const W = 300,
      H = 140,
      pad = { l: 24, r: 10, t: 20, b: 34 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const xStep = chartW / 3;
    const allVals = dataByStep.flatMap((d) => [...d.clean, ...d.error]);
    const maxTime = Math.min(Math.max(...allVals, 5) * 1.15, 30);

    const getPath = (stats, type) => {
      const valid = stats
        .map((s, i) =>
          s.avg !== null
            ? {
                x: pad.l + i * xStep,
                y: pad.t + chartH - (s.avg / maxTime) * chartH,
                sd: (s.sd / maxTime) * chartH,
              }
            : null
        )
        .filter((p) => p !== null);
      if (valid.length < 2) return { line: '', area: '', dots: '' };

      const line = `M ${valid.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
      const area = `M ${valid.map((p) => `${p.x.toFixed(1)},${(p.y - p.sd).toFixed(1)}`).join(' L ')}
                     L ${valid
                       .reverse()
                       .map((p) => `${p.x.toFixed(1)},${(p.y + p.sd).toFixed(1)}`)
                       .join(' L ')} Z`;

      const dots = stats
        .map((s, i) => {
          if (s.avg === null) return '';
          const x = pad.l + i * xStep;
          const y = pad.t + chartH - (s.avg / maxTime) * chartH;
          const color = type === 'clean' ? '#39FF14' : '#f43f5e';
          return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="#18181b" stroke-width="1.5" />`;
        })
        .join('');

      return { line, area, dots };
    };

    const pClean = getPath(statsClean, 'clean');
    const pError = getPath(statsError, 'error');

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="w-full overflow-visible">
        <!-- Grid -->
        <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + chartH}" stroke="#27272a" stroke-width="0.5" />
        <line x1="${pad.l}" y1="${pad.t + chartH}" x2="${W - pad.r}" y2="${pad.t + chartH}" stroke="#27272a" stroke-width="0.5" />

        <!-- Y Axis Labels -->
        <text x="${pad.l - 4}" y="${pad.t + 4}" font-size="7" fill="#52525b" text-anchor="end">${maxTime.toFixed(0)}s</text>
        <text x="${pad.l - 4}" y="${pad.t + chartH}" font-size="7" fill="#52525b" text-anchor="end">0s</text>

        <!-- Clean Path (Area + Line) -->
        <path d="${pClean.area}" fill="#39FF14" opacity="0.08" />
        <path d="${pClean.line}" fill="none" stroke="#39FF14" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pClean.dots}

        <!-- Error Path (Area + Line) -->
        <path d="${pError.area}" fill="#f43f5e" opacity="0.1" />
        <path d="${pError.line}" fill="none" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pError.dots}

        <!-- X Axis Labels -->
        ${['1→2', '2→3', '3→4', '4→5']
          .map(
            (label, i) => `
            <text x="${pad.l + i * xStep}" y="${H - 12}" font-size="8" font-weight="900" fill="#71717a" text-anchor="middle">${label}</text>
        `
          )
          .join('')}
      </svg>

      <div class="flex justify-between items-center mt-2 px-1">
        <div class="flex gap-4">
          <div class="flex items-center gap-1.5">
            <div class="w-5 h-1 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.4)]"></div>
            <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ø Sauber</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-5 h-1 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
            <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ø Fehler</span>
          </div>
        </div>
        <p class="text-[8px] text-zinc-600 font-bold uppercase italic">Rhythmus-Band (Trend)</p>
      </div>`;
  }

  renderMeanShot(shots, returnHtml = false) {
    const container = document.getElementById('mean-shot-container');
    const hasContainer = !!container;
    if (!hasContainer && !returnHtml) return '';

    const emptyState =
      '<div class="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">Keine Schussdaten</div>';
    if (!shots || shots.length === 0) {
      if (returnHtml) return emptyState;
      if (container) container.innerHTML = emptyState;
      return emptyState;
    }

    const n = shots.length;
    const meanX = shots.reduce((s, sh) => s + (sh.x || 100), 0) / n;
    const meanY = shots.reduce((s, sh) => s + (sh.y || 100), 0) / n;

    const dists = shots.map((sh) =>
      Math.sqrt(Math.pow((sh.x || 100) - meanX, 2) + Math.pow((sh.y || 100) - meanY, 2))
    );
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const variance = dists.reduce((a, b) => a + Math.pow(b - avgDist, 2), 0) / dists.length;
    const stdDev = Math.sqrt(variance);

    const offX = (meanX - 100) / 10;
    const offY = (meanY - 100) / 10;
    const offXLabel =
      offX > 0
        ? `${offX.toFixed(2)} R rechts`
        : offX < 0
          ? `${Math.abs(offX).toFixed(2)} R links`
          : 'mittig';
    const offYLabel =
      offY > 0
        ? `${offY.toFixed(2)} R unten`
        : offY < 0
          ? `${Math.abs(offY).toFixed(2)} R oben`
          : 'mittig';

    const meanRad = Math.sqrt(Math.pow(meanX - 100, 2) + Math.pow(meanY - 100, 2));
    const meanRingScore = Math.min(10, Math.max(0, 11 - meanRad / 10)).toFixed(2);

    const shotSize = typeof getShotSize === 'function' ? getShotSize() : 6;
    const crosshair = `
      <circle cx="${meanX.toFixed(1)}" cy="${meanY.toFixed(1)}" r="${shotSize}" fill="#007AFF" stroke="white" stroke-width="1.5" />`;

    const infoHtml = `
      <div class="mt-4 space-y-2 px-1">
      <div class="flex justify-between items-center bg-off-white/5 p-3 rounded-xl border border-subtle/30">
        <span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ø Treffpunkt (Ring)</span>
        <span class="text-lg font-black text-primary">${meanRingScore}</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Abweichung</p>
           <p class="text-[11px] font-bold text-off-white">${offXLabel}<br/>${offYLabel}</p>
        </div>
        <div class="p-2.5 bg-off-white/5 rounded-xl border border-subtle/30">
           <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Ø Streuung (σ)</p>
           <p class="text-[11px] font-bold text-off-white">${(stdDev / 10).toFixed(2)} <span class="text-[9px] opacity-40">Ringe</span></p>
        </div>
      </div>

      <div class="flex items-center justify-center gap-2 pt-1">
        <div class="w-4 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(0,122,255,0.5)]"></div>
        <span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Durchschnittlicher Schuss</span>
      </div>
      </div>`;

    const targetSizeClass = returnHtml ? 'w-80 h-80 max-w-[88vw] max-h-[88vw]' : 'w-72 h-72';
    const html = `${this._meanShotTargetSvg('', crosshair, '', targetSizeClass)}${infoHtml}`;
    if (returnHtml) {
      return `<div class="w-full max-w-[520px] flex flex-col items-center">${html}</div>`;
    }

    if (container) container.innerHTML = html;
    return html;
  }

  _meanShotTargetSvg(shotCircles, crosshair, overlay = '', sizeClass = 'w-72 h-72') {
    return `
      <svg viewBox="0 0 200 200" class="${sizeClass} rounded-full bg-white shadow-inner overflow-hidden flex-shrink-0 animate-in zoom-in-50 duration-500">
        <defs>
          <filter id="crosshair-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <style>
            .rn-w { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 4px; fill: white; text-anchor: middle; dominant-baseline: central; }
            .rn-b { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 4px; fill: #000; text-anchor: middle; dominant-baseline: central; }
          </style>
        </defs>

        <rect x="0" y="0" width="200" height="200" fill="white" />

        <circle cx="100" cy="100" r="100" fill="white" stroke="#000" stroke-width="0.5" />
        <text x="195" y="100" class="rn-b" text-anchor="end">1</text>
        <text x="5" y="100" class="rn-b" text-anchor="start">1</text>
        <text x="100" y="5" class="rn-b">1</text>
        <text x="100" y="195" class="rn-b">1</text>

        <circle cx="100" cy="100" r="90" fill="white" stroke="#000" stroke-width="0.5" />
        <text x="185" y="100" class="rn-b" text-anchor="end">2</text>
        <text x="15" y="100" class="rn-b" text-anchor="start">2</text>
        <text x="100" y="15" class="rn-b">2</text>
        <text x="100" y="185" class="rn-b">2</text>

        <circle cx="100" cy="100" r="80" fill="white" stroke="#000" stroke-width="0.5" />
        <text x="175" y="100" class="rn-b" text-anchor="end">3</text>
        <text x="25" y="100" class="rn-b" text-anchor="start">3</text>
        <text x="100" y="25" class="rn-b">3</text>
        <text x="100" y="175" class="rn-b">3</text>

        <circle cx="100" cy="100" r="70" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="165" y="100" class="rn-w" text-anchor="end">4</text>
        <text x="35" y="100" class="rn-w" text-anchor="start">4</text>
        <text x="100" y="35" class="rn-w">4</text>
        <text x="100" y="165" class="rn-w">4</text>

        <circle cx="100" cy="100" r="60" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="155" y="100" class="rn-w" text-anchor="end">5</text>
        <text x="45" y="100" class="rn-w" text-anchor="start">5</text>
        <text x="100" y="45" class="rn-w">5</text>
        <text x="100" y="155" class="rn-w">5</text>

        <circle cx="100" cy="100" r="50" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="145" y="100" class="rn-w" text-anchor="end">6</text>
        <text x="55" y="100" class="rn-w" text-anchor="start">6</text>
        <text x="100" y="55" class="rn-w">6</text>
        <text x="100" y="145" class="rn-w">6</text>

        <circle cx="100" cy="100" r="40" fill="#000" stroke="white" stroke-width="0.5" />
        <text x="135" y="100" class="rn-w" text-anchor="end">7</text>
        <text x="65" y="100" class="rn-w" text-anchor="start">7</text>
        <text x="100" y="65" class="rn-w">7</text>
        <text x="100" y="135" class="rn-w">7</text>

        <circle cx="100" cy="100" r="30" fill="#000" stroke="white" stroke-width="2.5" />
        <text x="125" y="100" class="rn-w" text-anchor="end">8</text>
        <text x="75" y="100" class="rn-w" text-anchor="start">8</text>
        <text x="100" y="75" class="rn-w">8</text>
        <text x="100" y="125" class="rn-w">8</text>

        <circle cx="100" cy="100" r="20" fill="#000" stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="10" fill="#000" stroke="white" stroke-width="0.5" />
        <circle cx="100" cy="100" r="2" fill="white" stroke="none" />

        ${shotCircles || ''}
        ${crosshair || ''}
        ${overlay || ''}
      </svg>
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  toggleBottomNav(show) {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;
    if (show) nav.classList.remove('hidden');
    else nav.classList.add('hidden');
  }

  toggleFilters() {
    const container = document.getElementById('overview-filters-container');
    const btn = document.getElementById('analytics-filter-btn');
    if (!container) return;
    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
      container.classList.remove('hidden');
      if (btn) {
        btn.classList.add('bg-primary/20', 'text-primary');
        btn.classList.remove('bg-card-dark', 'text-off-white/70');
      }
    } else {
      container.classList.add('hidden');
      if (btn) {
        btn.classList.remove('bg-primary/20', 'text-primary');
        btn.classList.add('bg-card-dark', 'text-off-white/70');
      }
    }
  }
}

function navigateTo(url) {
  window.location.href = url;
}

const CUSTOM_ANALYSIS_EXPANDED_KEY = 'b_custom_analysis_expanded';

function applyCustomAnalysisExpandedState() {
  const content = document.getElementById('custom-analysis-content');
  const chevron = document.getElementById('custom-analysis-chevron');
  if (!content) return;

  const isExpanded = localStorage.getItem(CUSTOM_ANALYSIS_EXPANDED_KEY) === 'true';
  content.classList.toggle('hidden', !isExpanded);
  if (chevron) chevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
}

function toggleAnalysis() {
  const content = document.getElementById('analysis-content');
  const chevron = document.getElementById('analysis-chevron');
  if (!content) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}

function toggleCustomAnalysis() {
  const content = document.getElementById('custom-analysis-content');
  const chevron = document.getElementById('custom-analysis-chevron');
  if (!content) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
    localStorage.setItem(CUSTOM_ANALYSIS_EXPANDED_KEY, 'true');
  } else {
    content.classList.add('hidden');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
    localStorage.setItem(CUSTOM_ANALYSIS_EXPANDED_KEY, 'false');
  }
}

window.AnalyticsPage = AnalyticsPage;

document.addEventListener('DOMContentLoaded', () => {
  window.Analytics = new AnalyticsPage();
  applyCustomAnalysisExpandedState();

  const athletesBtn = document.getElementById('nav-athletes');
  if (athletesBtn) athletesBtn.addEventListener('click', () => navigateTo('athletes.html'));
  const calendarBtn = document.getElementById('nav-calendar');
  if (calendarBtn) calendarBtn.addEventListener('click', () => navigateTo('calendar.html'));
  const sessionsBtn = document.getElementById('nav-sessions');
  if (sessionsBtn) sessionsBtn.addEventListener('click', () => navigateTo('index.html'));
  const analyticsBtn = document.getElementById('nav-analytics');
  if (analyticsBtn) analyticsBtn.addEventListener('click', () => navigateTo('analytics.html'));
  const menuBtn = document.getElementById('nav-menu');
  if (menuBtn) menuBtn.addEventListener('click', () => navigateTo('menu.html'));
  const settingsBtn = document.getElementById('nav-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', () => navigateTo('settings.html'));

  if (typeof translateApp === 'function') {
    translateApp();
  }
});

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
  module.exports = { AnalyticsPage, getTranslatedSessionType, getTranslatedSeriesType };
}
