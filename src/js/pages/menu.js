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

let isMenuEditMode = false;
const PROFILE_SYNC_CHANNEL = 'b_profile_sync_channel';
let profileSyncChannel = null;
if (typeof BroadcastChannel !== 'undefined') {
  profileSyncChannel = new BroadcastChannel(PROFILE_SYNC_CHANNEL);
}

function navigateTo(url) {
  if (isMenuEditMode) return;
  window.location.href = url;
}

const MENU_SELECTION_ORDER_KEY = 'b_menu_selection_order';
let draggedSelectionItem = null;
let touchDragState = null;
let currentDropTarget = null;
let dragPreviewElement = null;
let dragPreviewSource = null;
let dragPreviewOffsetX = 0;
let dragPreviewOffsetY = 0;
let dragAutoScrollRaf = null;
let dragAutoScrollTarget = null;
let dragAutoScrollVelocity = 0;

function getSelectionListElement() {
  return document.getElementById('selection-list');
}

function getSelectionItems() {
  const list = getSelectionListElement();
  if (!list) return [];
  return Array.from(list.children).filter((item) => item.classList.contains('menu-selection-item'));
}

function saveSelectionOrder() {
  const itemIds = getSelectionItems()
    .map((item) => item.dataset.orderId)
    .filter(Boolean);
  localStorage.setItem(MENU_SELECTION_ORDER_KEY, JSON.stringify(itemIds));
}

function getDragAfterElement(list, y) {
  const items = getSelectionItems().filter((item) => item !== draggedSelectionItem);
  let closest = {
    offset: Number.NEGATIVE_INFINITY,
    element: null,
  };
  items.forEach((item) => {
    const box = item.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = {
        offset,
        element: item,
      };
    }
  });
  return closest.element;
}

function setDropHighlight(targetItem) {
  if (currentDropTarget && currentDropTarget !== targetItem) {
    currentDropTarget.classList.remove('drop-highlight');
  }
  currentDropTarget = targetItem || null;
  if (currentDropTarget) {
    currentDropTarget.classList.add('drop-highlight');
  }
}

function clearDragVisuals() {
  if (draggedSelectionItem) {
    draggedSelectionItem.classList.remove('is-dragging');
  }
  if (currentDropTarget) {
    currentDropTarget.classList.remove('drop-highlight');
    currentDropTarget = null;
  }
  removeTouchDragPreview();
}

function getScrollableAncestor(element) {
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

function stopDragAutoScroll() {
  if (dragAutoScrollRaf) {
    window.cancelAnimationFrame(dragAutoScrollRaf);
    dragAutoScrollRaf = null;
  }
  dragAutoScrollTarget = null;
  dragAutoScrollVelocity = 0;
}

function maybeAutoScrollWhileDragging(sourceElement, pointerY) {
  const scrollTarget = getScrollableAncestor(sourceElement);
  if (!scrollTarget) {
    stopDragAutoScroll();
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
    stopDragAutoScroll();
    return;
  }

  dragAutoScrollTarget = scrollTarget;
  dragAutoScrollVelocity = velocity;

  if (dragAutoScrollRaf) return;

  const tick = () => {
    if (!dragAutoScrollTarget || dragAutoScrollVelocity === 0) {
      stopDragAutoScroll();
      return;
    }
    dragAutoScrollTarget.scrollTop += dragAutoScrollVelocity;
    dragAutoScrollRaf = window.requestAnimationFrame(tick);
  };

  dragAutoScrollRaf = window.requestAnimationFrame(tick);
}

function createTouchDragPreview(sourceElement, pointerX, pointerY) {
  removeTouchDragPreview();
  if (!sourceElement) return;

  const rect = sourceElement.getBoundingClientRect();
  const clone = sourceElement.cloneNode(true);
  clone.classList.add('drag-floating-preview');
  clone.style.width = `${Math.max(120, Math.round(rect.width))}px`;
  clone.style.height = `${Math.max(48, Math.round(rect.height))}px`;
  clone.style.opacity = '0.98';

  dragPreviewOffsetX = Math.min(rect.width * 0.5, Math.max(28, pointerX - rect.left));
  dragPreviewOffsetY = Math.min(rect.height * 0.5, Math.max(18, pointerY - rect.top));
  dragPreviewElement = clone;
  dragPreviewSource = sourceElement;
  sourceElement.classList.add('drag-source-active');

  document.body.appendChild(clone);
  updateTouchDragPreviewPosition(pointerX, pointerY);
}

function updateTouchDragPreviewPosition(pointerX, pointerY) {
  if (!dragPreviewElement) return;
  const x = pointerX - dragPreviewOffsetX;
  const y = pointerY - dragPreviewOffsetY;
  dragPreviewElement.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.03)`;
}

function removeTouchDragPreview() {
  if (dragPreviewSource) {
    dragPreviewSource.classList.remove('drag-source-active');
  }
  dragPreviewSource = null;
  if (dragPreviewElement && dragPreviewElement.parentElement) {
    dragPreviewElement.parentElement.removeChild(dragPreviewElement);
  }
  dragPreviewElement = null;
}

function handleSelectionDragStart(event) {
  if (!isMenuEditMode) {
    event.preventDefault();
    return;
  }
  draggedSelectionItem = event.currentTarget;
  draggedSelectionItem.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    try {
      event.dataTransfer.setData('text/plain', draggedSelectionItem.dataset.orderId || '');
    } catch {}
  }
}

function handleSelectionDragOver(event) {
  if (!isMenuEditMode || !draggedSelectionItem) return;
  event.preventDefault();
  const list = getSelectionListElement();
  if (!list) return;
  maybeAutoScrollWhileDragging(list, event.clientY);
  const afterElement = getDragAfterElement(list, event.clientY);
  setDropHighlight(afterElement);
  if (afterElement) {
    list.insertBefore(draggedSelectionItem, afterElement);
  } else {
    list.appendChild(draggedSelectionItem);
  }
}

function handleSelectionDrop(event) {
  if (!isMenuEditMode) return;
  event.preventDefault();
  stopDragAutoScroll();
  saveSelectionOrder();
}

function handleSelectionDragEnd(event) {
  event.currentTarget.classList.remove('is-dragging');
  stopDragAutoScroll();
  clearDragVisuals();
  draggedSelectionItem = null;
  saveSelectionOrder();
}

function startTouchHoldDrag(event) {
  if (!isMenuEditMode) return;
  if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
  const item = event.currentTarget;
  if (!item) return;
  touchDragState = {
    item,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    active: false,
    timerId: window.setTimeout(() => {
      if (!touchDragState || touchDragState.item !== item) return;
      touchDragState.active = true;
      item.classList.add('is-dragging');
      createTouchDragPreview(item, touchDragState.lastX, touchDragState.lastY);
    }, 220),
  };
  if (item.setPointerCapture) {
    try {
      item.setPointerCapture(event.pointerId);
    } catch {}
  }
}

function moveTouchHoldDrag(event) {
  if (!touchDragState) return;
  if (event.pointerId !== touchDragState.pointerId) return;
  touchDragState.lastX = event.clientX;
  touchDragState.lastY = event.clientY;
  if (!touchDragState.active) return;
  event.preventDefault();
  const list = getSelectionListElement();
  if (!list) return;
  maybeAutoScrollWhileDragging(list, event.clientY);
  updateTouchDragPreviewPosition(event.clientX, event.clientY);
  draggedSelectionItem = touchDragState.item;
  const afterElement = getDragAfterElement(list, event.clientY);
  setDropHighlight(afterElement);
  if (afterElement) {
    list.insertBefore(touchDragState.item, afterElement);
  } else {
    list.appendChild(touchDragState.item);
  }
}

function endTouchHoldDrag(event) {
  if (!touchDragState) return;
  if (event.pointerId !== touchDragState.pointerId) return;
  window.clearTimeout(touchDragState.timerId);
  touchDragState.item.classList.remove('is-dragging');
  if (touchDragState.active) {
    event.preventDefault();
    saveSelectionOrder();
  }
  if (touchDragState.item.releasePointerCapture) {
    try {
      touchDragState.item.releasePointerCapture(event.pointerId);
    } catch {}
  }
  stopDragAutoScroll();
  clearDragVisuals();
  touchDragState = null;
  draggedSelectionItem = null;
}

function setMenuEditMode(isEditing) {
  isMenuEditMode = Boolean(isEditing);
  const editButton = document.getElementById('menu-edit-toggle-btn');
  const list = getSelectionListElement();
  if (editButton) {
    editButton.textContent = isMenuEditMode ? 'Fertig' : t('edit');
    editButton.classList.toggle('bg-primary/20', isMenuEditMode);
    editButton.classList.toggle('border-primary/60', isMenuEditMode);
  }
  if (list) {
    list.classList.toggle('menu-edit-active', isMenuEditMode);
  }
  getSelectionItems().forEach((item) => {
    const handle = item.querySelector('.menu-drag-handle');
    const chevron = item.querySelector('.menu-chevron');
    item.setAttribute('draggable', isMenuEditMode ? 'true' : 'false');
    item.classList.toggle('bg-off-white/5', isMenuEditMode);
    item.classList.toggle('cursor-grab', isMenuEditMode);
    if (handle) {
      handle.classList.toggle('hidden', !isMenuEditMode);
      handle.classList.toggle('flex', isMenuEditMode);
    }
    if (chevron) {
      chevron.classList.toggle('hidden', isMenuEditMode);
    }
  });
  if (!isMenuEditMode) {
    stopDragAutoScroll();
    removeTouchDragPreview();
  }
}

function initializeSelectionReordering() {
  const list = getSelectionListElement();
  if (!list) return;
  getSelectionItems().forEach((item, index) => {
    if (!item.dataset.orderId) {
      item.dataset.orderId = `selection-item-${index + 1}`;
    }
    if (!item.dataset.dragBound) {
      item.dataset.dragBound = 'true';
      item.addEventListener('dragstart', handleSelectionDragStart);
      item.addEventListener('dragend', handleSelectionDragEnd);
      item.addEventListener('pointerdown', startTouchHoldDrag);
      item.addEventListener('pointermove', moveTouchHoldDrag);
      item.addEventListener('pointerup', endTouchHoldDrag);
      item.addEventListener('pointercancel', endTouchHoldDrag);
    }
    if (!item.querySelector('.menu-drag-handle')) {
      const chevron = item.querySelector('.menu-chevron');
      const rightSlot = document.createElement('div');
      rightSlot.className = 'flex items-center gap-1';
      const handle = document.createElement('div');
      handle.className =
        'menu-drag-handle hidden items-center justify-center p-1.5 rounded-md border border-subtle text-light-blue-info';
      handle.innerHTML =
        '<span class="material-symbols-outlined text-[18px]">drag_indicator</span>';
      rightSlot.appendChild(handle);
      if (chevron) {
        rightSlot.appendChild(chevron);
      }
      item.appendChild(rightSlot);
    }
  });
  list.addEventListener('dragover', handleSelectionDragOver);
  list.addEventListener('drop', handleSelectionDrop);
  try {
    const storedOrder = JSON.parse(localStorage.getItem(MENU_SELECTION_ORDER_KEY) || '[]');
    if (Array.isArray(storedOrder) && storedOrder.length) {
      const mapById = new Map(getSelectionItems().map((item) => [item.dataset.orderId, item]));
      storedOrder.forEach((id) => {
        const item = mapById.get(id);
        if (item) {
          list.appendChild(item);
          mapById.delete(id);
        }
      });
      mapById.forEach((item) => list.appendChild(item));
    }
  } catch {
    localStorage.removeItem(MENU_SELECTION_ORDER_KEY);
  }
  saveSelectionOrder();
  const editButton = document.getElementById('menu-edit-toggle-btn');
  if (editButton) {
    editButton.addEventListener('click', () => {
      setMenuEditMode(!isMenuEditMode);
    });
  }
  setMenuEditMode(false);
}

function loadMenuProfile() {
  const profileImageKey = 'b_user_profile_image';
  const defaultProfileImage = 'assets/icons/app-icon.png';
  const avatarEl = document.getElementById('menu-profile-avatar');
  const nameEl = document.getElementById('menu-profile-name');
  const emailEl = document.getElementById('menu-profile-email');
  const statusEl = document.getElementById('menu-profile-status-text');
  const sinceEl = document.getElementById('menu-profile-since-text');
  const dot = document.getElementById('menu-account-dot');
  const name = localStorage.getItem('b_user_trainer_name') || 'Coach Name';
  const email = localStorage.getItem('b_user_email') || 'coach@example.com';
  const profileImage = localStorage.getItem(profileImageKey) || defaultProfileImage;
  if (avatarEl) avatarEl.src = profileImage;
  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;
  if (typeof apiService !== 'undefined' && apiService.isLoggedIn()) {
    apiService
      .getProfile()
      .then((profile) => {
        if (!profile) return;
        if (profile.createdAt && sinceEl) {
          const date = new Date(profile.createdAt);
          sinceEl.textContent = `Seit ${date.toLocaleDateString('de')}`;
        }
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-green-500';
        if (statusEl) {
          statusEl.textContent = 'Online';
          statusEl.className = 'text-green-400 text-xs';
        }
      })
      .catch(() => {
        if (sinceEl) sinceEl.textContent = 'Offline-Modus';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-500';
        if (statusEl) {
          statusEl.textContent = 'Offline';
          statusEl.className = 'text-red-400 text-xs';
        }
      });
  } else {
    if (statusEl) {
      statusEl.textContent = 'Offline';
      statusEl.className = 'text-light-blue-info/50 text-xs';
    }
    if (sinceEl) {
      sinceEl.textContent = '';
    }
    if (dot) {
      dot.className = 'w-2 h-2 rounded-full bg-zinc-600';
    }
  }

  // Show or hide admin panel link
  const adminItem = document.getElementById('admin-menu-item');
  if (adminItem) {
    const role = localStorage.getItem('b_user_role');
    if (role === 'admin') {
      adminItem.classList.remove('hidden');
      adminItem.classList.add('flex');
    } else {
      adminItem.classList.remove('flex');
      adminItem.classList.add('hidden');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof t !== 'function') return;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (translated && translated !== key) {
      el.textContent = translated;
    }
  });
  loadMenuProfile();
  initializeSelectionReordering();
});

window.addEventListener('storage', (event) => {
  if (
    event.key === 'b_user_trainer_name' ||
    event.key === 'b_user_email' ||
    event.key === 'b_user_profile_image'
  ) {
    loadMenuProfile();
  }
});

window.addEventListener('profile-data-updated', () => {
  loadMenuProfile();
});

window.addEventListener('pageshow', () => {
  loadMenuProfile();
});

window.addEventListener('focus', () => {
  loadMenuProfile();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadMenuProfile();
  }
});

if (profileSyncChannel) {
  profileSyncChannel.addEventListener('message', () => {
    loadMenuProfile();
  });
}
