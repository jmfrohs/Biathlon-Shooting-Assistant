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
const GUI_SCALE_STORAGE_KEY = 'b_gui_scale';
const DEFAULT_GUI_SCALE = 1.0;

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
    return;
  }

  const modeLabel =
    document.getElementById('theme-label') ||
    (toggleBg.closest('div')
      ? toggleBg.closest('div').querySelector('.text-off-white.font-medium')
      : null);

  if (theme === LIGHT_THEME) {
    toggleBg.classList.remove('bg-primary');
    toggleBg.classList.add('bg-amber-500/80');
    toggleKnob.classList.remove('right-1');
    toggleKnob.classList.add('left-1');
    toggleKnob.className =
      'absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 left-1 flex items-center justify-center overflow-hidden';
    toggleKnob.innerHTML =
      '<span id="theme-knob-icon" class="material-symbols-outlined text-[12px] text-amber-600 font-bold select-none">wb_sunny</span>';

    if (modeLabel) {
      modeLabel.textContent = typeof t === 'function' ? t('dark_mode') || 'Dark Mode' : 'Dark Mode';
    }
  } else {
    toggleBg.classList.add('bg-primary');
    toggleBg.classList.remove('bg-amber-500/80');
    toggleKnob.classList.add('right-1');
    toggleKnob.classList.remove('left-1');
    toggleKnob.className =
      'absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 right-1 flex items-center justify-center overflow-hidden';
    toggleKnob.innerHTML =
      '<span id="theme-knob-icon" class="material-symbols-outlined text-[12px] text-primary font-bold select-none">dark_mode</span>';

    if (modeLabel) {
      modeLabel.textContent =
        typeof t === 'function' ? t('light_mode') || 'Light Mode' : 'Light Mode';
    }
  }
}

/**
 * Handle theme toggle button click
 */

function handleThemeToggle() {
  const newTheme = toggleTheme();
  updateThemeUI(newTheme);
}

/**
 * Get current GUI scale from localStorage
 */

function getGuiScale() {
  const saved = localStorage.getItem(GUI_SCALE_STORAGE_KEY);
  return saved ? parseFloat(saved) : DEFAULT_GUI_SCALE;
}

/**
 * Set and apply GUI scale
 */

function setGuiScale(scale) {
  localStorage.setItem(GUI_SCALE_STORAGE_KEY, scale);
  applyGuiScale();
  updateGuiScaleUI(scale);
}

/**
 * Apply GUI scale to document
 */

function applyGuiScale() {
  const scale = getGuiScale();
  document.documentElement.style.fontSize = scale * 100 + '%';
}

/**
 * Update GUI scale UI display
 */

function updateGuiScaleUI(scale) {
  const display = document.getElementById('gui-scale-display');
  const slider = document.getElementById('gui-scale-slider');
  if (display) {
    display.textContent = Math.round(scale * 100) + '%';
  }

  if (slider) {
    slider.value = scale;
  }
}

const SIZE_STORAGE_KEY = 'b_device_size';

function detectPreferredDeviceSize() {
  const userAgent = navigator.userAgent || '';
  const isMobileUserAgent = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  );
  const isIpadLikeDevice =
    /iPad/i.test(userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent));
  const hasCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  if (isMobileUserAgent || isIpadLikeDevice || (hasCoarsePointer && window.innerWidth <= 1024)) {
    return 'phone';
  }

  return 'pc';
}

function getDeviceSize() {
  return localStorage.getItem(SIZE_STORAGE_KEY) || detectPreferredDeviceSize();
}

function setDeviceSizeAndReload(size) {
  localStorage.setItem(SIZE_STORAGE_KEY, size);
  window.location.reload();
}

function getPhoneContainerHeight() {
  const rawViewportHeight = window.visualViewport?.height || window.innerHeight;
  const fallbackHeight = window.innerHeight || window.screen?.height || 800;
  const viewportHeight = Number.isFinite(rawViewportHeight) ? rawViewportHeight : fallbackHeight;

  const bodyStyles = window.getComputedStyle(document.body);
  const paddingTop = parseFloat(bodyStyles.paddingTop || '0') || 0;
  const paddingBottom = parseFloat(bodyStyles.paddingBottom || '0') || 0;
  const verticalPadding = paddingTop + paddingBottom;

  return Math.max(320, Math.round(viewportHeight - verticalPadding));
}

function applyDeviceSize() {
  const size = getDeviceSize();
  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;
  const isLoginPage = window.location.pathname.toLowerCase().endsWith('/login.html');

  // Strip ALL layout/sizing classes that we re-apply dynamically.
  // This includes positioning (fixed, inset-0, relative, md:relative, md:inset-auto),
  // sizing (w-full, max-w-*, h-*), and frame decoration (md:rounded-*, md:border-*).
  appContainer.className = appContainer.className
    .replace(
      /(?:\s|^)(?:w-full|max-w-\[\d+px\]|h-\[\d+px\]|md:h-\[\d+px\]|md:h-screen|md:rounded-\[\d+px\]|md:border-\[\d+px\]|md:border-zinc-800|fixed|inset-0|relative|md:relative|md:inset-auto)(?=\s|$)/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  // Common classes for all modes
  appContainer.classList.add('overflow-hidden', 'flex', 'flex-col', 'shadow-2xl', 'mx-auto');
  if (!isLoginPage) {
    appContainer.classList.add('bg-deep-charcoal');
  }

  // Clear any inline styles from a previous mode
  appContainer.style.position = '';
  appContainer.style.inset = '';
  appContainer.style.top = '';
  appContainer.style.bottom = '';
  appContainer.style.left = '';
  appContainer.style.right = '';
  appContainer.style.transform = '';
  appContainer.style.marginLeft = '';
  appContainer.style.marginRight = '';
  appContainer.style.height = '';
  appContainer.style.maxHeight = '';
  appContainer.style.borderRadius = '';
  appContainer.style.border = '';

  if (size === 'tablet') {
    appContainer.classList.add('relative');
    appContainer.style.width = '100%';
    appContainer.style.maxWidth = '1024px';
    appContainer.style.height = Math.min(1366, window.innerHeight) + 'px';
    appContainer.style.maxHeight = '';
    appContainer.classList.add('md:rounded-[24px]', 'md:border-[4px]', 'md:border-zinc-800');
  } else if (size === 'pc') {
    appContainer.classList.add('relative');
    appContainer.style.width = '100%';
    appContainer.style.height = '100vh';
    appContainer.style.maxWidth = '100%';
    appContainer.style.borderRadius = '0';
    appContainer.style.border = 'none';
  } else {
    // Phone mode
    appContainer.style.width = '100%';
    appContainer.style.maxWidth = '430px';
    if (isLoginPage) {
      const phoneContainerHeight = getPhoneContainerHeight();
      appContainer.classList.add('relative');
      appContainer.style.height = phoneContainerHeight + 'px';
      appContainer.style.maxHeight = phoneContainerHeight + 'px';
      appContainer.style.border = 'none';
      appContainer.style.borderRadius = '0';
    } else {
      // Use fixed positioning so the browser derives the exact height from
      // the viewport edges.  No explicit height = no dvh mismatch.
      // Centred via left:0 + right:0 + margin:auto.
      // #bottom-nav is a flex item (not fixed), so it is always fully visible
      // at the bottom of the flex column on any phone height.
      appContainer.style.position = 'fixed';
      appContainer.style.top = '0';
      appContainer.style.bottom = '0';
      appContainer.style.left = '0';
      appContainer.style.right = '0';
      appContainer.style.marginLeft = 'auto';
      appContainer.style.marginRight = 'auto';
      appContainer.style.transform = '';
      appContainer.style.height = ''; // let top+bottom control it
      appContainer.style.maxHeight = '';
      appContainer.classList.add('md:rounded-[55px]', 'md:border-[8px]', 'md:border-zinc-800');
    }
  }

  if (size === 'pc') {
    document.body.classList.add('desktop-mode');
  } else {
    document.body.classList.remove('desktop-mode');
  }
}

function updateDeviceSizeDisplay() {
  const size = getDeviceSize();
  const display = document.getElementById('device-size-display');
  if (display) {
    const labels = { phone: 'Phone', tablet: 'Tablet', pc: 'PC' };
    display.textContent = labels[size] || 'Phone';
  }
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
function updateContainerHeight() {
  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;
  const size = getDeviceSize();
  const isLoginPage = window.location.pathname.toLowerCase().endsWith('/login.html');
  if (size === 'tablet') {
    appContainer.style.height = Math.min(1366, window.innerHeight) + 'px';
  } else if (size === 'phone' && !isLoginPage) {
    // Set --app-height from window.innerHeight (= visual viewport height,
    // excludes browser address bar / navigation bar). This is the most
    // reliable cross-browser approach for mobile full-screen apps.
    // Do NOT use an explicit px height on the container itself:
    // padding-top: env(safe-area-inset-top) + box-sizing: border-box
    // can push the bottom nav off-screen when height is set in px.
    const rawViewportHeight = window.visualViewport?.height || window.innerHeight;
    const fallbackHeight = window.innerHeight || window.screen?.height || 800;
    const screenHeight = window.screen?.height || fallbackHeight;
    // Guard against broken viewport values (seen on some emulators/webviews).
    const maxExpectedHeight = Math.max(1200, screenHeight * 1.5);
    let vh = Number(rawViewportHeight);
    if (!Number.isFinite(vh) || vh < 240 || vh > maxExpectedHeight) {
      vh = Number(fallbackHeight);
    }
    if (!Number.isFinite(vh) || vh < 240 || vh > maxExpectedHeight) {
      vh = Math.min(Math.max(screenHeight, 240), 1200);
    }

    document.documentElement.style.setProperty('--app-height', Math.round(vh) + 'px');
    appContainer.style.height = ''; // rely on top:0 + bottom:0
    appContainer.style.bottom = '0'; // restore bottom:0 if a previous mode changed it
  } else if (size === 'phone' && isLoginPage) {
    const phoneContainerHeight = getPhoneContainerHeight();
    appContainer.style.height = phoneContainerHeight + 'px';
    appContainer.style.maxHeight = phoneContainerHeight + 'px';
  }
}

window.addEventListener('resize', updateContainerHeight);
// visualViewport fires when the address bar appears/disappears or the
// soft keyboard opens — much more reliable than the plain 'resize' event.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateContainerHeight);
}

document.addEventListener('DOMContentLoaded', function () {
  const currentTheme = getTheme();
  setTheme(currentTheme);
  applyDeviceSize();
  updateContainerHeight();
  applyGuiScale();
  setTimeout(() => {
    updateThemeUI(currentTheme);
    updateDeviceSizeDisplay();
    updateGuiScaleUI(getGuiScale());
  }, 0);
});
if (document.readyState === 'loading' || document.readyState === 'interactive') {
  const currentTheme = getTheme();
  setTheme(currentTheme);
  applyGuiScale();
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      applyDeviceSize();
      updateContainerHeight();
      applyGuiScale();
    }
  });
} else {
  applyDeviceSize();
  updateContainerHeight();
  applyGuiScale();
}
