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

function getLanguage() {
  return localStorage.getItem('b_language') || 'de';
}

function setLanguage(lang) {
  localStorage.setItem('b_language', lang);
}

function translateApp() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  const navAthletes = document.querySelector('#nav-athletes span:last-child');
  const navSessions = document.querySelector('#nav-sessions span:last-child');
  const navAnalytics = document.querySelector('#nav-analytics span:last-child');
  const navSettings = document.querySelector('#nav-settings span:last-child');
  if (navAthletes) navAthletes.textContent = t('athletes');
  if (navSessions) navSessions.textContent = t('sessions');
  if (navAnalytics) navAnalytics.textContent = t('analytics');
  if (navSettings) navSettings.textContent = t('settings');
}
