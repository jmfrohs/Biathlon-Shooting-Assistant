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

function navigateBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = 'settings.html';
}

function getLanguage() {
  return localStorage.getItem('b_language') || 'de';
}

function setLanguage(lang) {
  localStorage.setItem('b_language', lang);
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.textContent = isHidden ? 'visibility_off' : 'visibility';
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

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  const navAthletes = document.querySelector('#nav-athletes span:last-child');
  const navCalendar = document.querySelector('#nav-calendar span:last-child');
  const navSessions = document.querySelector('#nav-sessions span:last-child');
  const navAnalytics = document.querySelector('#nav-analytics span:last-child');
  const navMenu = document.querySelector('#nav-menu span:last-child');
  const navSettings = document.querySelector('#nav-settings span:last-child');
  if (navAthletes) navAthletes.textContent = t('athletes');
  if (navCalendar) navCalendar.textContent = t('calendar_title');
  if (navSessions) navSessions.textContent = t('sessions');
  if (navAnalytics) navAnalytics.textContent = t('analytics');
  if (navMenu) navMenu.textContent = t('more');
  if (navSettings) navSettings.textContent = t('settings');
}

/**
 * Global toast notification
 */

function showToast(message, type = 'success') {
  const toast = document.getElementById('success-toast');
  if (!toast) return;

  const label = toast.querySelector('[data-i18n]') || toast.querySelector('span:last-child');
  if (label) label.textContent = message;

  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.add('opacity-0', 'pointer-events-none');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 3000);
}

/**
 * Computes Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }
  return dp[m][n];
}

/**
 * Returns suggestions for a query from a list of candidates
 */
function getBestSuggestions(query, candidates, limit = 3) {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const qWords = q.split(/\s+/).filter(Boolean);

  const scored = candidates.map((item) => {
    const text = item.toLowerCase().trim();
    if (!text) return { item, score: 0 };
    if (text === q) return { item, score: 0 };

    if (text.includes(q) || q.includes(text)) {
      return { item, score: 0.9 };
    }

    const tWords = text.split(/\s+/).filter(Boolean);

    let totalWordScore = 0;
    qWords.forEach((qw) => {
      let bestWordScore = 0;
      tWords.forEach((tw) => {
        if (tw.includes(qw) || qw.includes(tw)) {
          bestWordScore = Math.max(bestWordScore, 0.85);
        } else {
          const dist = levenshteinDistance(qw, tw);
          const maxLen = Math.max(qw.length, tw.length);
          const wordScore = 1 - dist / maxLen;
          bestWordScore = Math.max(bestWordScore, wordScore);
        }
      });
      totalWordScore += bestWordScore;
    });

    const averageWordScore = totalWordScore / qWords.length;

    const wholeDist = levenshteinDistance(q, text);
    const wholeMaxLen = Math.max(q.length, text.length);
    const wholeScore = 1 - wholeDist / wholeMaxLen;

    const finalScore = Math.max(averageWordScore, wholeScore);

    return { item, score: finalScore };
  });

  return scored
    .filter((x) => x.score > 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    navigateBack,
    getLanguage,
    setLanguage,
    translateApp,
    levenshteinDistance,
    getBestSuggestions,
  };
}
