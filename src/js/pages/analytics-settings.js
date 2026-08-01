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
  window.location.href = 'menu.html';
}

function toggleAnalysisSetting(type) {
  const key = `b_analysis_${type}`;
  const currentValue = localStorage.getItem(key) !== 'false';
  const newValue = !currentValue;
  localStorage.setItem(key, newValue);
  updateAnalysisToggleUI(type, newValue);
}

function updateAnalysisToggleUI(type, visible) {
  const checkEl = document.getElementById(`check-analysis-${type}`);
  if (!checkEl) return;
  if (visible) {
    checkEl.className =
      'w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all bg-primary text-white shadow-sm';
  } else {
    checkEl.className =
      'w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all border-2 border-subtle/80 bg-off-white/5 text-transparent';
  }
}

function initAnalysisSettings() {
  const types = ['heatmap', 'combined', 'trend', 'mean-shot', 'direction'];
  types.forEach((type) => {
    const visible = localStorage.getItem(`b_analysis_${type}`) !== 'false';
    updateAnalysisToggleUI(type, visible);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof translateApp === 'function') {
    translateApp();
  } else if (typeof t === 'function') {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val && val !== key) el.textContent = val;
    });
  }
  initAnalysisSettings();
});
