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
 * Auth Guard — Checks authentication on every page load.
 * If no valid token exists and server is reachable, redirects to login.html.
 * If server is unreachable, allows offline access with localStorage data.
 *
 * Include this script on EVERY page (except login.html).
 */

(function () {
  const token = localStorage.getItem('b_auth_token');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // Don't guard the login page itself
  if (currentPage === 'login.html') return;

  if (!token) {
    // No token at all — must login
    window.location.href = 'login.html';
    return;
  }

  // Verify token with server (non-blocking)
  async function verifyToken() {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('b_auth_token');
        window.location.href = 'login.html';
      }
    } catch {
      // Server unreachable — allow offline access with cached data
      console.log('Server offline — using cached data');
    }
  }

  verifyToken();
})();
