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
    this.syncQueue = JSON.parse(localStorage.getItem('b_sync_queue') || '[]');
    this.isOnline = false;
    if (this.isServerMode()) {
      this.checkConnection();
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
  }

  clearServerUrl() {
    localStorage.removeItem('b_server_url');
    this.baseUrl = this.detectBaseUrl();
    this.isOnline = false;
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
        signal: AbortSignal.timeout(3000),
      });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
    return this.isOnline;
  }

  async request(method, path, body = null) {
    try {
      const options = {
        method,
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${path}`, options);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = 'login.html';
          return null;
        }
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      this.isOnline = true;
      return data;
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TypeError') {
        this.isOnline = false;
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
      localStorage.clear();
    }
    return data;
  }

  logout() {
    this.clearToken();
    localStorage.removeItem('b_user_email');
    localStorage.removeItem('b_user_trainer_name');
    localStorage.removeItem('b_user_role');
    window.location.href = 'login.html';
  }

  async getAthletes() {
    return this.request('GET', '/api/athletes');
  }

  async getAthlete(id) {
    return this.request('GET', `/api/athletes/${id}`);
  }

  async createAthlete(data) {
    return this.request('POST', '/api/athletes', data);
  }

  async updateAthlete(id, data) {
    return this.request('PUT', `/api/athletes/${id}`, data);
  }

  async deleteAthlete(id) {
    return this.request('DELETE', `/api/athletes/${id}`);
  }

  async getSessions() {
    return this.request('GET', '/api/sessions');
  }

  async getSession(id) {
    return this.request('GET', `/api/sessions/${id}`);
  }

  async createSession(data) {
    return this.request('POST', '/api/sessions', data);
  }

  async updateSession(id, data) {
    return this.request('PUT', `/api/sessions/${id}`, data);
  }

  async deleteSession(id) {
    return this.request('DELETE', `/api/sessions/${id}`);
  }

  async shareSession(id) {
    return this.request('POST', `/api/sessions/${id}/share`);
  }

  async unshareSession(id) {
    return this.request('POST', `/api/sessions/${id}/unshare`);
  }

  async joinSession(code) {
    return this.request('POST', '/api/sessions/join', { code });
  }

  async getSettings() {
    return this.request('GET', '/api/settings');
  }

  async saveSettings(data) {
    return this.request('PUT', '/api/settings', data);
  }

  addToSyncQueue(action) {
    this.syncQueue.push({
      ...action,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('b_sync_queue', JSON.stringify(this.syncQueue));
  }

  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];
    localStorage.setItem('b_sync_queue', '[]');

    for (const action of queue) {
      try {
        await this.request(action.method, action.path, action.body);
      } catch {
        this.syncQueue.push(action);
      }
    }

    if (this.syncQueue.length > 0) {
      localStorage.setItem('b_sync_queue', JSON.stringify(this.syncQueue));
    }
  }

  async syncAfterLogin() {
    try {
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

      await this.processSyncQueue();
      return { success: true, athleteId: localStorage.getItem('b_personal_athlete_id') };
    } catch (err) {
      console.warn('Sync after login failed:', err.message);
      return { success: false, error: err.message };
    }
  }
}

const apiService = new ApiService();
