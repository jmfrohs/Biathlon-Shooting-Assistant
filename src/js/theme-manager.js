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
 * Theme Manager
 * Manages light/dark mode switching for the application
 */

const THEME_STORAGE_KEY = 'b_theme';
const LIGHT_THEME = 'light';
const DARK_THEME = 'dark';

/**
 * Get current theme from localStorage or default to dark
 */
function getTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || DARK_THEME;
}

/**
 * Set theme and apply to document
 */
function setTheme(theme) {
  const html = document.documentElement;

  if (theme === LIGHT_THEME) {
    html.classList.remove('dark');
    html.classList.add('light');
    localStorage.setItem(THEME_STORAGE_KEY, LIGHT_THEME);
  } else {
    html.classList.add('dark');
    html.classList.remove('light');
    localStorage.setItem(THEME_STORAGE_KEY, DARK_THEME);
  }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const currentTheme = getTheme();
  const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
  setTheme(newTheme);
  return newTheme;
}

/**
 * Update theme toggle UI in settings
 */
function updateThemeUI(theme) {
  const toggleBg = document.getElementById('theme-toggle-bg');
  const toggleKnob = document.getElementById('theme-toggle-knob');

  if (!toggleBg || !toggleKnob) {
    console.log('Theme toggle elements not found in DOM');
    return;
  }

  // Find parent containers for icon and label
  const parentDiv = toggleBg.closest('div.p-4');
  if (!parentDiv) {
    console.log('Parent container not found');
    return;
  }

  const modeIcon = parentDiv.querySelector('.material-symbols-outlined');
  const modeLabel = parentDiv.querySelector('.text-off-white.font-medium');

  if (theme === LIGHT_THEME) {
    // Light mode - toggle is OFF
    toggleBg.classList.remove('bg-primary');
    toggleBg.classList.add('bg-zinc-700');
    toggleKnob.classList.remove('right-1');
    toggleKnob.classList.add('left-1');

    // Update icon and label
    if (modeIcon) modeIcon.textContent = 'light_mode';
    if (modeLabel) modeLabel.textContent = 'Light Mode';
  } else {
    // Dark mode - toggle is ON
    toggleBg.classList.add('bg-primary');
    toggleBg.classList.remove('bg-zinc-700');
    toggleKnob.classList.add('right-1');
    toggleKnob.classList.remove('left-1');

    // Update icon and label
    if (modeIcon) modeIcon.textContent = 'dark_mode';
    if (modeLabel) modeLabel.textContent = 'Dark Mode';
  }
}

/**
 * Handle theme toggle button click
 */
function handleThemeToggle() {
  const newTheme = toggleTheme();
  updateThemeUI(newTheme);
}

// Initialize theme on page load
// --- Device Size Manager ---
const SIZE_STORAGE_KEY = 'b_device_size';

function getDeviceSize() {
  return localStorage.getItem(SIZE_STORAGE_KEY) || 'phone';
}

function setDeviceSizeAndReload(size) {
  localStorage.setItem(SIZE_STORAGE_KEY, size);
  window.location.reload();
}

function applyDeviceSize() {
  const size = getDeviceSize();
  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;

  // Clear relevant classes to avoid conflicts
  appContainer.className = appContainer.className
    .replace(
      /w-full|max-w-\[\d+px\]|h-\[\d+px\]|md:rounded-\[\d+px\]|md:border-\[\d+px\]|md:border-zinc-800/g,
      ''
    )
    .trim();

  // Base classes that should always be present
  appContainer.classList.add(
    'bg-deep-charcoal',
    'relative',
    'overflow-hidden',
    'flex',
    'flex-col',
    'shadow-2xl',
    'mx-auto'
  );

  if (size === 'tablet') {
    appContainer.style.width = '100%';
    appContainer.style.maxWidth = '1024px';
    appContainer.style.height = '1366px';
    appContainer.style.maxHeight = '100vh';
    appContainer.classList.add('md:rounded-[24px]', 'md:border-[4px]', 'md:border-zinc-800');
  } else if (size === 'pc') {
    appContainer.style.width = '100%';
    appContainer.style.height = '100vh';
    appContainer.style.maxWidth = '100%';
    appContainer.style.borderRadius = '0';
    appContainer.style.border = 'none';
  } else {
    // Default: Phone
    appContainer.style.width = '100%';
    appContainer.style.maxWidth = '430px';
    appContainer.style.height = '932px';
    appContainer.style.maxHeight = '100vh';
    appContainer.classList.add('md:rounded-[55px]', 'md:border-[8px]', 'md:border-zinc-800');
  }
}

function updateDeviceSizeDisplay() {
  const size = getDeviceSize();
  const display = document.getElementById('device-size-display');

  if (display) {
    const labels = { phone: 'Phone', tablet: 'Tablet', pc: 'PC' };
    display.textContent = labels[size] || 'Phone';
  }

  // Update checkmarks in modal
  ['phone', 'tablet', 'pc'].forEach((s) => {
    const check = document.getElementById(`check-${s}`);
    const btn = document.getElementById(`device-${s}-btn`);

    if (check) {
      if (s === size) check.classList.remove('hidden');
      else check.classList.add('hidden');
    }

    if (btn) {
      if (s === size) {
        btn.classList.remove('bg-off-white/5', 'border-subtle');
        btn.classList.add('bg-primary/20', 'border-primary');
      } else {
        btn.classList.add('bg-off-white/5', 'border-subtle');
        btn.classList.remove('bg-primary/20', 'border-primary');
      }
    }
  });
}

// Initialize theme and size on page load
document.addEventListener('DOMContentLoaded', function () {
  const currentTheme = getTheme();
  setTheme(currentTheme);
  applyDeviceSize();

  // Give DOM a chance to render before updating UI
  setTimeout(() => {
    updateThemeUI(currentTheme);
    updateDeviceSizeDisplay();
  }, 0);
});

// Also apply immediately before DOM is fully loaded to prevent flash
if (document.readyState === 'loading' || document.readyState === 'interactive') {
  const currentTheme = getTheme();
  setTheme(currentTheme);
  // Cannot apply device size comfortably here as #app-container might not exist yet
  // But we can try
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') applyDeviceSize();
  });
} else {
  applyDeviceSize();
}
