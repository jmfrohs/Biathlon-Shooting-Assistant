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
 * SocketClient — Handles real-time communication with the server
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.currentSessionId = null;
    this.onUpdateCallback = null;
  }

  connect() {
    if (this.socket) return;

    if (typeof io === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = () => this.initialize();
      document.head.appendChild(script);
    } else {
      this.initialize();
    }
  }

  initialize() {
    const baseUrl = apiService.baseUrl;
    this.socket = io(baseUrl);

    this.socket.on('connect', () => {
      console.log('  📡 Socket connected:', this.socket.id);
      if (this.currentSessionId) {
        this.joinSession(this.currentSessionId);
      }
    });

    this.socket.on('session_updated', (data) => {
      console.log('  🔄 Session updated received:', data.id);
      if (this.onUpdateCallback) {
        this.onUpdateCallback(data);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('  📡 Socket disconnected');
    });
  }

  joinSession(sessionId) {
    this.currentSessionId = sessionId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_session', sessionId);
    }
  }

  leaveSession(sessionId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_session', sessionId);
    }
    this.currentSessionId = null;
  }

  onUpdate(callback) {
    this.onUpdateCallback = callback;
  }
}

const socketClient = new SocketClient();
