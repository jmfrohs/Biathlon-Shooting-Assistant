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
 * API Service — Central server communication layer
 * Handles all API calls, token management, and offline sync queue
 */

class ApiService {
  constructor() {
    this.baseUrl = this.detectBaseUrl();
    this.token = localStorage.getItem('b_auth_token') || null;
    this.csrfToken = null;
    this.syncQueue = JSON.parse(localStorage.getItem('b_sync_queue') || '[]');
    this.isOnline = false;
    this.runtimeMode = 'server';
    this.networkMonitorId = null;
    this.badChecks = 0;
    this.goodChecks = 0;
    this.badConnectionThreshold = 3;
    this.goodConnectionThreshold = 3;
    this.monitorIntervalMs = 8000;
    if (this.isServerMode()) {
      this.checkConnection();
      this.startNetworkMonitor();
    }
  }

  detectBaseUrl() {
    const savedUrl = localStorage.getItem('b_server_url');
    const currentOrigin = window.location.origin;
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isFileProtocol = window.location.protocol === 'file:';

    if (savedUrl) {
      return savedUrl.includes('://') ? savedUrl : `http://${savedUrl}`;
    }

    if (!isLocalhost && !isFileProtocol) {
      return currentOrigin;
    }

    return 'http://91.99.192.176';
  }

  isServerMode() {
    return !!localStorage.getItem('b_server_url');
  }

  setServerUrl(url) {
    if (url && !url.includes('://')) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
    localStorage.setItem('b_server_url', url);
    this.runtimeMode = 'server';
    this.badChecks = 0;
    this.goodChecks = 0;
    this.startNetworkMonitor();
  }

  clearServerUrl() {
    this.stopNetworkMonitor();
    localStorage.removeItem('b_server_url');
    this.baseUrl = this.detectBaseUrl();
    this.isOnline = false;
    this.runtimeMode = 'server';
  }

  stopNetworkMonitor() {
    if (this.networkMonitorId) {
      clearInterval(this.networkMonitorId);
      this.networkMonitorId = null;
    }
  }

  startNetworkMonitor() {
    this.stopNetworkMonitor();
    if (!this.isServerMode()) return;

    const probe = async () => {
      const online = await this.checkConnection();

      if (online) {
        this.goodChecks += 1;
        this.badChecks = 0;
        if (this.isInLocalFallback() && this.goodChecks >= this.goodConnectionThreshold) {
          await this.recoverFromLocalFallback('connection-restored');
        }
      } else {
        this.badChecks += 1;
        this.goodChecks = 0;
        if (
          !this.isInLocalFallback() &&
          this.isAutoNetworkFallbackEnabled() &&
          this.badChecks >= this.badConnectionThreshold
        ) {
          this.enterLocalFallback('connection-unstable');
        }
      }
    };

    probe();
    this.networkMonitorId = setInterval(probe, this.monitorIntervalMs);
  }

  emitNetworkModeChange(reason = '') {
    window.dispatchEvent(
      new CustomEvent('b-network-mode-change', {
        detail: {
          mode: this.runtimeMode,
          reason,
          isOnline: this.isOnline,
          queueLength: this.syncQueue.length,
        },
      })
    );
  }

  isAutoNetworkFallbackEnabled() {
    return localStorage.getItem('b_auto_network_fallback') === 'true';
  }

  setAutoNetworkFallbackEnabled(enabled) {
    localStorage.setItem('b_auto_network_fallback', enabled ? 'true' : 'false');
    if (!enabled && this.isInLocalFallback()) {
      this.recoverFromLocalFallback('fallback-disabled').catch((err) => {
        console.warn('[ApiService] Recover after disabling fallback failed:', err.message);
      });
    }
  }

  isInLocalFallback() {
    return this.runtimeMode === 'local_fallback';
  }

  enterLocalFallback(reason = 'network-offline') {
    if (this.isInLocalFallback()) return;
    this.runtimeMode = 'local_fallback';
    this.emitNetworkModeChange(reason);
  }

  async recoverFromLocalFallback(reason = 'network-online') {
    if (!this.isServerMode()) return;

    this.runtimeMode = 'server';
    this.emitNetworkModeChange(reason);

    await this.checkConnection();
    if (!this.isOnline) return;

    await this.processSyncQueue();
    await this.refreshWorkData({ skipQueueProcessing: true });
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('b_auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('b_auth_token');
  }

  isLoggedIn() {
    return !!this.token;
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(3000),
      });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
    return this.isOnline;
  }

  isOfflineNetworkError(err) {
    return (
      !!err &&
      (err.code === 'LOCAL_FALLBACK' || err.name === 'AbortError' || err.name === 'TypeError')
    );
  }

  shouldQueueOfflineWrite(err) {
    return (
      this.isServerMode() && this.isAutoNetworkFallbackEnabled() && this.isOfflineNetworkError(err)
    );
  }

  getCollectionKey(entityType) {
    return entityType === 'athlete' ? 'athletes' : 'sessions';
  }

  getLocalCollection(entityType) {
    const key = this.getCollectionKey(entityType);
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  setLocalCollection(entityType, data) {
    const key = this.getCollectionKey(entityType);
    localStorage.setItem(key, JSON.stringify(data));
  }

  generateLocalId() {
    return -(Date.now() + Math.floor(Math.random() * 1000));
  }

  createLocalEntity(entityType, data) {
    const list = this.getLocalCollection(entityType);
    const entity = {
      ...data,
      id: this.generateLocalId(),
      _localOnly: true,
      _localUpdatedAt: new Date().toISOString(),
    };
    list.push(entity);
    this.setLocalCollection(entityType, list);
    return entity;
  }

  updateLocalEntity(entityType, id, data) {
    const list = this.getLocalCollection(entityType);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index < 0) return null;

    list[index] = {
      ...list[index],
      ...data,
      _localUpdatedAt: new Date().toISOString(),
    };
    this.setLocalCollection(entityType, list);
    return list[index];
  }

  deleteLocalEntity(entityType, id) {
    const list = this.getLocalCollection(entityType);
    const filtered = list.filter((item) => String(item.id) !== String(id));
    this.setLocalCollection(entityType, filtered);
  }

  resolveSyncPath(action, tempIdMap) {
    if (!action.pathTemplate || action.entityId == null || !action.entityType) {
      return action.path;
    }

    const mapKey = `${action.entityType}:${action.entityId}`;
    const resolvedId = tempIdMap[mapKey] != null ? tempIdMap[mapKey] : action.entityId;
    return action.pathTemplate.replace(':id', String(resolvedId));
  }

  replaceLocalEntityId(entityType, tempId, newId) {
    const list = this.getLocalCollection(entityType);
    const index = list.findIndex((item) => String(item.id) === String(tempId));
    if (index < 0) return;

    list[index].id = newId;
    list[index]._localOnly = false;
    this.setLocalCollection(entityType, list);

    if (entityType === 'athlete') {
      const personalAthleteId = localStorage.getItem('b_personal_athlete_id');
      if (String(personalAthleteId) === String(tempId)) {
        localStorage.setItem('b_personal_athlete_id', String(newId));
      }
    }

    if (entityType === 'session') {
      const oldSettingsKey = `b_session_settings_${tempId}`;
      const newSettingsKey = `b_session_settings_${newId}`;
      const settingsValue = localStorage.getItem(oldSettingsKey);
      if (settingsValue != null) {
        localStorage.setItem(newSettingsKey, settingsValue);
        localStorage.removeItem(oldSettingsKey);
      }
    }
  }

  async fetchCsrfToken() {
    if (window.location.protocol === 'file:') {
      this.csrfToken = null;
      return null;
    }
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrfToken;
        return this.csrfToken;
      }
    } catch (err) {
      console.warn('Failed to fetch CSRF token:', err);
    }
    return null;
  }

  async request(method, path, body = null) {
    if (!this.isServerMode()) {
      console.warn(`[Local Mode] API call blocked: ${method} ${path}`);
      throw new Error('API not available in local mode');
    }

    if (this.isInLocalFallback()) {
      const fallbackErr = new Error('Server temporarily in local fallback mode');
      fallbackErr.code = 'LOCAL_FALLBACK';
      throw fallbackErr;
    }

    // Dynamically fetch CSRF token for state-changing requests if not already cached and not running via file://
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
      if (!this.csrfToken && window.location.protocol !== 'file:') {
        await this.fetchCsrfToken();
      }
    }

    try {
      const options = {
        method,
        headers: this.getAuthHeaders(),
        credentials: 'include',
        signal: AbortSignal.timeout(10000),
      };

      if (this.csrfToken) {
        options.headers['x-csrf-token'] = this.csrfToken;
      }

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${path}`, options);

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: `Server error ${response.status}` };
        }
      }

      if (!response.ok) {
        if (response.status === 401 && this.isServerMode()) {
          this.clearToken();
          if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
            return null;
          }
        }
        throw new Error((data && data.error) || `HTTP ${response.status}`);
      }

      this.isOnline = true;
      return data;
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TypeError') {
        this.isOnline = false;
        this.badChecks += 1;
        this.goodChecks = 0;
        if (this.isAutoNetworkFallbackEnabled()) {
          this.enterLocalFallback('request-failed');
        }
      }
      throw err;
    }
  }

  async register(email, password, trainerName, role = 'coach') {
    const data = await this.request('POST', '/api/auth/register', {
      email,
      password,
      trainerName,
      role,
    });
    if (data && data.token) {
      this.setToken(data.token);
      if (data.user && data.user.role) {
        localStorage.setItem('b_user_role', data.user.role);
      }
    }
    return data;
  }

  async login(email, password) {
    const data = await this.request('POST', '/api/auth/login', {
      email,
      password,
    });
    if (data && data.token) {
      this.setToken(data.token);
      if (data.user && data.user.role) {
        localStorage.setItem('b_user_role', data.user.role);
      }
    }
    return data;
  }

  async demoStart() {
    const data = await this.request('POST', '/api/auth/demo-start', {});
    if (data && data.token) {
      this.setToken(data.token);
      if (data.user && data.user.role) {
        localStorage.setItem('b_user_role', data.user.role);
      }
    }
    return data;
  }

  async getProfile() {
    return this.request('GET', '/api/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('PUT', '/api/auth/password', {
      currentPassword,
      newPassword,
    });
  }

  async changeEmail(newEmail, password) {
    const data = await this.request('PUT', '/api/auth/email', {
      newEmail,
      password,
    });
    if (data && data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async updateTrainerName(trainerName) {
    return this.request('PUT', '/api/auth/trainer-name', { trainerName });
  }

  async updateRole(role) {
    const data = await this.request('PUT', '/api/auth/role', { role });
    if (data && data.role) {
      localStorage.setItem('b_user_role', data.role);
    }
    return data;
  }

  async deleteAccount(password) {
    const data = await this.request('DELETE', '/api/auth/account', { password });
    if (data) {
      this.clearToken();
      this.clearWorkData();
    }
    return data;
  }

  /**
   * Clear only work data (athletes, sessions, settings) but preserve auth tokens
   * Used when syncing fresh data from server without logging out user
   */
  clearWorkData() {
    localStorage.removeItem('athletes');
    localStorage.removeItem('sessions');
    localStorage.removeItem('b_custom_analytics');
    localStorage.removeItem('b_personal_athlete_id');
    localStorage.removeItem('b_is_demo');
    localStorage.removeItem('b_user_email');
    localStorage.removeItem('b_user_trainer_name');
    localStorage.removeItem('b_user_profile_image');
    localStorage.removeItem('b_profile_settings');
  }

  /**
   * Full logout: clears ALL data including auth and redirects to login
   */
  logout() {
    if (this.isServerMode() && window.location.protocol !== 'file:') {
      this.request('POST', '/api/auth/logout', {}).catch(() => {});
    }
    this.clearToken();
    this.clearWorkData();
    window.location.href = 'login.html';
  }

  /**
   * Refresh work data from server without losing auth state
   * Called on app startup if user is logged in
   */
  async refreshWorkData(options = {}) {
    const { skipQueueProcessing = false } = options;

    if (!this.isLoggedIn() || !this.isServerMode()) {
      return { success: false };
    }

    try {
      if (!skipQueueProcessing) {
        await this.processSyncQueue();
      }

      const athletes = await this.getAthletes();
      if (athletes) {
        localStorage.setItem('athletes', JSON.stringify(athletes));
      }

      const sessions = await this.getSessions();
      if (sessions) {
        localStorage.setItem('sessions', JSON.stringify(sessions));
      }

      const settings = await this.getSettings();
      if (settings) {
        for (const [key, value] of Object.entries(settings)) {
          localStorage.setItem(`b_${key}`, value);
        }
      }
      return { success: true };
    } catch (err) {
      console.warn('[ApiService] Data refresh failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async getAthletes() {
    return this.request('GET', '/api/athletes');
  }

  async getAthlete(id) {
    return this.request('GET', `/api/athletes/${id}`);
  }

  async createAthlete(data) {
    try {
      return await this.request('POST', '/api/athletes', data);
    } catch (err) {
      if (!this.shouldQueueOfflineWrite(err)) throw err;

      const localAthlete = this.createLocalEntity('athlete', data);
      this.addToSyncQueue({
        method: 'POST',
        path: '/api/athletes',
        body: data,
        entityType: 'athlete',
        tempId: localAthlete.id,
      });
      return localAthlete;
    }
  }

  async updateAthlete(id, data) {
    try {
      return await this.request('PUT', `/api/athletes/${id}`, data);
    } catch (err) {
      if (!this.shouldQueueOfflineWrite(err)) throw err;

      const localAthlete = this.updateLocalEntity('athlete', id, data);
      this.addToSyncQueue({
        method: 'PUT',
        pathTemplate: '/api/athletes/:id',
        body: data,
        entityType: 'athlete',
        entityId: id,
      });
      return localAthlete || { success: true, offlineQueued: true };
    }
  }

  async deleteAthlete(id) {
    try {
      return await this.request('DELETE', `/api/athletes/${id}`);
    } catch (err) {
      if (!this.shouldQueueOfflineWrite(err)) throw err;

      this.deleteLocalEntity('athlete', id);
      this.addToSyncQueue({
        method: 'DELETE',
        pathTemplate: '/api/athletes/:id',
        entityType: 'athlete',
        entityId: id,
      });
      return { success: true, offlineQueued: true };
    }
  }

  async getSessions() {
    return this.request('GET', '/api/sessions');
  }

  async getSession(id) {
    return this.request('GET', `/api/sessions/${id}`);
  }

  async createSession(data) {
    try {
      return await this.request('POST', '/api/sessions', data);
    } catch (err) {
      if (!this.shouldQueueOfflineWrite(err)) throw err;

      const localSession = this.createLocalEntity('session', data);
      this.addToSyncQueue({
        method: 'POST',
        path: '/api/sessions',
        body: data,
        entityType: 'session',
        tempId: localSession.id,
      });
      return localSession;
    }
  }

  async updateSession(id, data) {
    try {
      return await this.request('PUT', `/api/sessions/${id}`, data);
    } catch (err) {
      if (!this.shouldQueueOfflineWrite(err)) throw err;

      const localSession = this.updateLocalEntity('session', id, data);
      this.addToSyncQueue({
        method: 'PUT',
        pathTemplate: '/api/sessions/:id',
        body: data,
        entityType: 'session',
        entityId: id,
      });
      return localSession || { success: true, offlineQueued: true };
    }
  }

  async deleteSession(id) {
    try {
      return await this.request('DELETE', `/api/sessions/${id}`);
    } catch (err) {
      if (!this.shouldQueueOfflineWrite(err)) throw err;

      this.deleteLocalEntity('session', id);
      this.addToSyncQueue({
        method: 'DELETE',
        pathTemplate: '/api/sessions/:id',
        entityType: 'session',
        entityId: id,
      });
      return { success: true, offlineQueued: true };
    }
  }

  async shareSession(id) {
    return this.request('POST', `/api/sessions/${id}/share`);
  }

  async createShareLink(id) {
    try {
      return await this.request('POST', `/api/sessions/${id}/share-link`);
    } catch (err) {
      // Backward compatibility: older servers do not yet expose /share-link.
      if (err && typeof err.message === 'string' && err.message.includes('404')) {
        return this.request('POST', `/api/sessions/${id}/share`);
      }
      throw err;
    }
  }

  async resolveInvite(token) {
    return this.request('POST', '/api/sessions/invite/resolve', { token });
  }

  getSessionInviteLink(sessionId, inviteToken) {
    const base = (this.baseUrl || window.location.origin || '').replace(/\/+$/, '');
    return `${base}/session-detail.html?id=${encodeURIComponent(sessionId)}&invite=${encodeURIComponent(inviteToken)}`;
  }

  async unshareSession(id) {
    return this.request('POST', `/api/sessions/${id}/unshare`);
  }

  async joinSession(code) {
    return this.request('POST', '/api/sessions/join', { code });
  }

  async sendSeriesEmail(series, sessionName, recipients) {
    return this.request('POST', '/api/email/send-series', { series, sessionName, recipients });
  }

  async getSettings() {
    return this.request('GET', '/api/settings');
  }

  async saveSettings(data) {
    try {
      return await this.request('PUT', '/api/settings', data);
    } catch (err) {
      if (!this.shouldQueueOfflineWrite(err)) throw err;

      Object.entries(data || {}).forEach(([key, value]) => {
        localStorage.setItem(`b_${key}`, value);
      });
      this.addToSyncQueue({
        method: 'PUT',
        path: '/api/settings',
        body: data,
      });
      return { success: true, offlineQueued: true };
    }
  }

  addToSyncQueue(action) {
    this.syncQueue.push({
      ...action,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('b_sync_queue', JSON.stringify(this.syncQueue));
  }

  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0 || this.isInLocalFallback()) return;

    const queue = [...this.syncQueue];
    const tempIdMap = {};
    this.syncQueue = [];
    localStorage.setItem('b_sync_queue', '[]');

    for (const action of queue) {
      try {
        const path = this.resolveSyncPath(action, tempIdMap);
        const data = await this.request(action.method, path, action.body);

        if (action.method === 'POST' && action.entityType && action.tempId != null && data?.id) {
          const mapKey = `${action.entityType}:${action.tempId}`;
          tempIdMap[mapKey] = data.id;
          this.replaceLocalEntityId(action.entityType, action.tempId, data.id);
        }
      } catch {
        if (action.pathTemplate && action.entityType && action.entityId != null) {
          const mapKey = `${action.entityType}:${action.entityId}`;
          if (tempIdMap[mapKey] != null) {
            action.entityId = tempIdMap[mapKey];
          }
        }
        this.syncQueue.push(action);
      }
    }

    if (this.syncQueue.length > 0) {
      localStorage.setItem('b_sync_queue', JSON.stringify(this.syncQueue));
    }
  }

  async syncAfterLogin() {
    try {
      await this.checkConnection();
      await this.processSyncQueue();

      const athletes = await this.getAthletes();
      if (athletes) {
        localStorage.setItem('athletes', JSON.stringify(athletes));
      }

      const sessions = await this.getSessions();
      if (sessions) {
        localStorage.setItem('sessions', JSON.stringify(sessions));
      }

      const role = localStorage.getItem('b_user_role');
      if (role === 'athlete') {
        let athleteId = localStorage.getItem('b_personal_athlete_id');
        if (!athleteId) {
          const name = localStorage.getItem('b_user_trainer_name') || 'Ich';
          const newAthlete = await this.createAthlete({ name, club: '' });
          if (newAthlete && newAthlete.id) {
            localStorage.setItem('b_personal_athlete_id', newAthlete.id);
            const updatedAthletes = await this.getAthletes();
            localStorage.setItem('athletes', JSON.stringify(updatedAthletes));
          }
        }
      }

      const settings = await this.getSettings();
      if (settings) {
        for (const [key, value] of Object.entries(settings)) {
          localStorage.setItem(`b_${key}`, value);
        }
      }
      return { success: true, athleteId: localStorage.getItem('b_personal_athlete_id') };
    } catch (err) {
      console.warn('Sync after login failed:', err.message);
      return { success: false, error: err.message };
    }
  }
}

const apiService = new ApiService();
