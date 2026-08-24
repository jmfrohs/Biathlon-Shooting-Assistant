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
 * NotificationService — Manages in-app toasts, browser native notifications,
 * lock screen alerts, and audio chimes for real-time events.
 */

class NotificationService {
  constructor() {
    this.storageKey = 'b_notification_settings';
    this.audioContext = null;
    this.toastContainer = null;
    this.init();
  }

  init() {
    const settings = this.getSettings();
    if (settings.inAppEnabled === undefined) {
      this.saveSettings({
        inAppEnabled: true,
        desktopEnabled: false,
        soundEnabled: true,
        sessionJoinEnabled: true,
      });
    }
  }

  getSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    return updated;
  }

  getDesktopPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async requestDesktopPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.saveSettings({ desktopEnabled: true });
        this.showToast(
          t('notification_perm_granted_title') || 'Desktop-Benachrichtigungen aktiviert',
          t('notification_perm_granted_body') ||
            'Du erhältst nun Benachrichtigungen auch auf dem Sperrbildschirm.',
          'success',
          'notifications_active'
        );
      } else if (permission === 'denied') {
        this.saveSettings({ desktopEnabled: false });
        this.showToast(
          t('notification_perm_denied_title') || 'Benachrichtigungen abgelehnt',
          t('notification_perm_denied_body') ||
            'Bitte erlaube Benachrichtigungen in deinen Browser-Einstellungen.',
          'warning',
          'notifications_off'
        );
      }
      return permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return Notification.permission;
    }
  }

  playChime() {
    const settings = this.getSettings();
    if (settings.soundEnabled === false) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      const osc1 = this.audioContext.createOscillator();
      const gain1 = this.audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = this.audioContext.createOscillator();
      const gain2 = this.audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(this.audioContext.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.38);
    } catch (e) {
      console.warn('Audio chime playback failed:', e);
    }
  }

  ensureToastContainer() {
    if (this.toastContainer && document.body.contains(this.toastContainer)) {
      return this.toastContainer;
    }

    const container = document.createElement('div');
    container.id = 'app-notification-toast-container';
    container.className =
      'fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0';
    document.body.appendChild(container);
    this.toastContainer = container;
    return container;
  }

  showToast(title, message, type = 'info', iconName = 'group_add') {
    const settings = this.getSettings();
    if (settings.inAppEnabled === false) return;

    const container = this.ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto transform transition-all duration-300 translate-y-[-10px] opacity-0 flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-md border ${
      type === 'success'
        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
        : type === 'warning'
          ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
          : 'bg-zinc-900/90 border-accent-blue/40 text-off-white'
    }`;

    const iconColor =
      type === 'success'
        ? 'text-emerald-400'
        : type === 'warning'
          ? 'text-amber-400'
          : 'text-accent-blue';

    toast.innerHTML = `
      <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
        <span class="material-symbols-outlined ${iconColor} text-2xl">${iconName}</span>
      </div>
      <div class="flex-1 min-w-0 pr-2">
        <h4 class="text-sm font-semibold tracking-wide">${title}</h4>
        <p class="text-xs text-zinc-300 mt-0.5 leading-relaxed break-words">${message}</p>
      </div>
      <button class="flex-shrink-0 text-zinc-400 hover:text-white transition-colors p-1" aria-label="Schließen">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.onclick = () => this.dismissToast(toast);

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-[-10px]', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
      this.dismissToast(toast);
    }, 4500);
  }

  dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-10px]', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  showDesktopNotification(title, body, iconUrl = '/assets/icons/icon-192x192.png') {
    const settings = this.getSettings();
    if (settings.desktopEnabled === false) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        silent: false,
        tag: 'biathlon-session-event',
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Native desktop notification failed:', e);
    }
  }

  notifySessionJoin(data) {
    const settings = this.getSettings();
    if (settings.sessionJoinEnabled === false) return;

    const rawUser = data?.userEmail || 'Ein Teilnehmer';
    const displayName = rawUser.includes('@') ? rawUser.split('@')[0] : rawUser;

    const title =
      typeof t === 'function' ? t('notification_session_join_title') : 'Session-Beitritt';
    const template =
      typeof t === 'function'
        ? t('notification_session_join_body')
        : '{user} ist der Live-Session beigetreten.';
    const body = template.replace('{user}', displayName);

    this.showToast(title, body, 'info', 'person_add');
    this.showDesktopNotification(title, body);
    this.playChime();
  }

  notifySessionLeave(data) {
    const settings = this.getSettings();
    if (settings.sessionJoinEnabled === false) return;

    const rawUser = data?.userEmail || 'Ein Teilnehmer';
    const displayName = rawUser.includes('@') ? rawUser.split('@')[0] : rawUser;

    const title =
      typeof t === 'function' ? t('notification_session_leave_title') : 'Session verlassen';
    const template =
      typeof t === 'function'
        ? t('notification_session_leave_body')
        : '{user} hat die Live-Session verlassen.';
    const body = template.replace('{user}', displayName);

    this.showToast(title, body, 'warning', 'person_remove');
    this.showDesktopNotification(title, body);
    this.playChime();
  }
}

const notificationService = new NotificationService();
