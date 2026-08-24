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

var currentView = 'month';
var currentDate = new Date();
var sessionsCache = [];

function getIsoWeekNumber(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
}

function updateCurrentDate() {
  const dateToDisplay = currentDate;
  const dateEl = document.getElementById('currentDate');
  const weekEl = document.getElementById('currentWeek');
  const lang = getLanguage && getLanguage() ? getLanguage() : 'de';

  const formatter = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  dateEl.textContent = formatter.format(dateToDisplay);
  if (weekEl) {
    weekEl.textContent = `${lang === 'de' ? 'KW' : 'CW'} ${getIsoWeekNumber(dateToDisplay)}`;
  }
}

function setupViewSelector() {
  const viewSelectorBtn = document.getElementById('viewSelectorBtn');
  const viewDropdown = document.getElementById('viewDropdown');
  const viewOptions = document.querySelectorAll('.view-option');

  viewSelectorBtn.addEventListener('click', () => {
    viewDropdown.classList.toggle('hidden');
    const chevron = document.getElementById('view-chevron');
    chevron.classList.toggle('rotate-180');
  });

  viewOptions.forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const newView = option.dataset.view;

      viewOptions.forEach((opt) => opt.classList.remove('selected'));
      option.classList.add('selected');

      currentView = newView;
      localStorage.setItem('calendarView', newView);
      const viewNames = {
        day: t('calendar_day'),
        week: t('calendar_week'),
        month: t('calendar_month'),
        '3months': t('calendar_3months'),
      };
      document.getElementById('currentView').textContent = viewNames[currentView];
      viewDropdown.classList.add('hidden');
      const chevron = document.getElementById('view-chevron');
      chevron.classList.remove('rotate-180');

      currentDate = new Date();
      renderCalendar();
    });
  });

  document.addEventListener('click', (e) => {
    if (!viewSelectorBtn.contains(e.target) && !viewDropdown.contains(e.target)) {
      viewDropdown.classList.add('hidden');
      const chevron = document.getElementById('view-chevron');
      chevron.classList.remove('rotate-180');
    }
  });
}

function setupEventListeners() {
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => goBack());
  }

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  prevBtn.addEventListener('click', () => {
    if (currentView === 'month') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else if (currentView === 'week') {
      currentDate.setDate(currentDate.getDate() - 7);
    } else if (currentView === 'day') {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    renderCalendar();
  });

  nextBtn.addEventListener('click', () => {
    if (currentView === 'month') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (currentView === 'week') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (currentView === 'day') {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    renderCalendar();
  });

  const datePickerBtn = document.getElementById('datePickerBtn');
  const datePickerModal = document.getElementById('datePickerModal');
  const datePickerInput = document.getElementById('datePickerInput');
  const confirmDatePicker = document.getElementById('confirmDatePicker');
  const cancelDatePicker = document.getElementById('cancelDatePicker');
  const closeDatePicker = document.getElementById('closeDatePicker');

  if (datePickerBtn && datePickerModal) {
    datePickerBtn.addEventListener('click', () => {
      datePickerInput.value = currentDate.toISOString().split('T')[0];
      datePickerModal.classList.remove('hidden');
      datePickerInput.focus();
    });

    const closeModal = () => {
      datePickerModal.classList.add('hidden');
    };

    closeDatePicker?.addEventListener('click', closeModal);
    cancelDatePicker?.addEventListener('click', closeModal);

    confirmDatePicker?.addEventListener('click', () => {
      if (datePickerInput.value) {
        currentDate = new Date(datePickerInput.value);
        renderCalendar();
        updateCurrentDate();
        closeModal();
      }
    });

    datePickerModal.addEventListener('click', (e) => {
      if (e.target === datePickerModal) {
        closeModal();
      }
    });

    datePickerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmDatePicker.click();
      }
    });
  }

  setupViewSelector();
}

function goBack() {
  window.location.href = 'index.html';
}

function applyLanguage() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}

async function loadSessions() {
  try {
    sessionsCache = (await apiService.getSessions()) || [];
  } catch (e) {
    console.error('Failed to load sessions:', e);
    sessionsCache = [];
  }
}

function hasActivityOnDate(date) {
  const dateStr = date.toISOString().split('T')[0];

  return sessionsCache.some((session) => {
    const sessionDate = new Date(session.date).toISOString().split('T')[0];
    return sessionDate === dateStr;
  });
}

function getSessionsForDate(date) {
  const dateStr = date.toISOString().split('T')[0];
  return sessionsCache.filter((session) => {
    const sessionDate = new Date(session.date).toISOString().split('T')[0];
    return sessionDate === dateStr;
  });
}

function getSessionColor(sessionType) {
  const type = (sessionType || '').toLowerCase();
  if (type === 'competition') {
    return { bg: 'bg-neon-green', text: 'text-deep-charcoal' };
  } else if (type === 'test_competition') {
    return { bg: 'bg-neon-orange', text: 'text-deep-charcoal' };
  } else if (type === 'international_test') {
    return { bg: 'bg-neon-cyan', text: 'text-deep-charcoal' };
  } else if (type === 'training') {
    return { bg: 'bg-neon-cyan', text: 'text-deep-charcoal' };
  } else if (type === 'other') {
    return { bg: 'bg-neon-red', text: 'text-off-white' };
  } else if (type === 'testing') {
    return { bg: 'bg-neon-cyan', text: 'text-deep-charcoal' };
  }
  return { bg: 'bg-primary', text: 'text-off-white' };
}

/**
 * Berechnet die Endzeit einer Session basierend auf dem Timestamp der letzten Serie
 * @param {Object} session - Die Session
 * @returns {Date} Die Endzeit (Timestamp der letzten Serie oder Session-Zeit + 1 Stunde Fallback)
 */

function getSessionEndTime(session) {
  if (!session.series || session.series.length === 0) {
    const startDate = new Date(session.date);
    const [hours, minutes] = session.time.split(':');
    startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    return endDate;
  }

  let lastSeriesTime = null;

  for (const series of session.series) {
    if (series.timestamp) {
      const seriesTime =
        typeof series.timestamp === 'number'
          ? new Date(series.timestamp)
          : new Date(series.timestamp);
      if (!lastSeriesTime || seriesTime > lastSeriesTime) {
        lastSeriesTime = seriesTime;
      }
    }
  }

  if (lastSeriesTime) {
    return lastSeriesTime;
  }

  const startDate = new Date(session.date);
  const [hours, minutes] = session.time.split(':');
  startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);
  return endDate;
}

/**
 * Berechnet die Startzeit einer Session
 * @param {Object} session - Die Session
 * @returns {Date} Die Startzeit
 */

function getSessionStartTime(session) {
  const startDate = new Date(session.date);
  const [hours, minutes] = session.time.split(':');
  startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return startDate;
}

/**
 * Formatiert eine Dauer in Millisekunden als lesbaren String
 * @param {number} ms - Millisekunden
 * @returns {string} z.B. "1h 30m" oder "45m"
 */

function formatSessionDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Formatiert den Session-Typ in die Sprache des Benutzers
 * @param {string} sessionType - Der Session-Typ (z.B. "competition", "training", "testing")
 * @returns {string} Der formatierte Session-Typ in der aktuellen Sprache
 */

function formatSessionType(sessionType) {
  const type = (sessionType || '').toLowerCase();
  if (type === 'competition') {
    return t('competitions');
  } else if (type === 'test_competition') {
    return t('test_competition');
  } else if (type === 'training') {
    return t('training');
  } else if (type === 'international_test') {
    return t('international_test');
  } else if (type === 'other') {
    return t('other');
  } else if (type === 'testing') {
    return t('testing');
  }
  return type;
}

function renderMonthView() {
  document.getElementById('monthView').classList.remove('hidden');
  document.getElementById('dayView').classList.add('hidden');
  document.getElementById('weekView').classList.add('hidden');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const titleLabel = document.getElementById('titleLabel');
  const lang = getLanguage && getLanguage() ? getLanguage() : 'de';
  const formatter = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
  titleLabel.textContent = formatter.format(currentDate);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const daysGrid = document.getElementById('daysGrid');
  daysGrid.classList.remove('animate-pulse');
  daysGrid.innerHTML = '';

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = today.getDate();
  const todayWeekNumber = isCurrentMonth ? getIsoWeekNumber(today) : null;

  let currentWeekNumber = null;
  let weekContainer = null;
  let weekElements = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const weekNumber = getIsoWeekNumber(dayDate);
    const dayOfWeek = dayDate.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const isToday = isCurrentMonth && day === todayDay;

    if (currentWeekNumber !== weekNumber) {
      if (weekContainer && weekElements.length > 0) {
        weekElements.forEach((el) => weekContainer.appendChild(el));
        daysGrid.appendChild(weekContainer);
      }

      currentWeekNumber = weekNumber;
      const isCurrentWeek = weekNumber === todayWeekNumber;

      weekContainer = document.createElement('div');
      weekContainer.className = 'contents';
      weekElements = [];

      const weekCell = document.createElement('div');
      if (isCurrentWeek) {
        weekCell.className =
          'h-16 flex items-center justify-center text-xs font-semibold text-light-blue-info';
      } else {
        weekCell.className =
          'h-16 flex items-center justify-center text-xs font-semibold text-light-blue-info';
      }
      weekCell.textContent = weekNumber;
      weekCell.style.gridColumn = '1';
      weekElements.push(weekCell);
    }

    const dayCell = document.createElement('div');
    dayCell.className =
      'h-16 rounded-lg border border-subtle flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95';

    const hasActivity = hasActivityOnDate(dayDate);
    const isCurrentWeek = currentWeekNumber === todayWeekNumber;

    if (isToday) {
      dayCell.classList.add('bg-primary', 'text-deep-charcoal', 'font-semibold', 'border-primary');
      dayCell.style.borderColor = 'rgb(0, 122, 255)';
      dayCell.style.backgroundColor = 'rgb(0, 122, 255)';
    } else if (hasActivity) {
      const sessionsForDay = getSessionsForDate(dayDate);
      const firstSessionType = sessionsForDay.length > 0 ? sessionsForDay[0].type : null;
      const colors = getSessionColor(firstSessionType);
      dayCell.classList.add(colors.bg, colors.text, 'font-semibold');

      if (isCurrentWeek) {
        dayCell.style.borderColor = 'rgba(0, 122, 255, 0.5)';
        dayCell.style.boxShadow = 'inset 0 0 0 0.5px rgba(0, 122, 255, 0.3)';
      }
    } else {
      dayCell.classList.add('bg-card-dark', 'text-off-white', 'hover:bg-off-white/5');

      if (isCurrentWeek) {
        dayCell.style.borderColor = 'rgba(0, 122, 255, 0.5)';
        dayCell.style.backgroundColor = 'rgba(0, 122, 255, 0.05)';
      }
    }

    dayCell.innerHTML = `<span class="text-sm">${day}</span>`;

    dayCell.addEventListener('click', () => {
      currentDate = dayDate;
      currentView = 'day';
      localStorage.setItem('calendarView', 'day');
      document.querySelectorAll('.view-option').forEach((opt) => opt.classList.remove('selected'));
      document.querySelector('[data-view="day"]').classList.add('selected');
      document.getElementById('currentView').textContent = t('calendar_day');
      renderCalendar();
    });

    dayCell.style.gridColumn = adjustedDayOfWeek + 1;
    weekElements.push(dayCell);
  }

  if (weekContainer && weekElements.length > 0) {
    weekElements.forEach((el) => weekContainer.appendChild(el));
    daysGrid.appendChild(weekContainer);
  }
}

function renderDayView() {
  document.getElementById('monthView').classList.add('hidden');
  document.getElementById('dayView').classList.remove('hidden');
  document.getElementById('weekView').classList.add('hidden');

  const lang = getLanguage && getLanguage() ? getLanguage() : 'de';
  const formatter = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  document.getElementById('titleLabel').textContent = formatter.format(currentDate);

  const daySchedule = document.getElementById('daySchedule');
  daySchedule.innerHTML = '';

  const sessions = getSessionsForDate(currentDate);
  const hours = [];

  for (let h = 5; h <= 23; h++) {
    hours.push(h);
  }

  const HOUR_HEIGHT = 100;
  const QUARTER_HOUR_HEIGHT = HOUR_HEIGHT / 4;

  const timelineContainer = document.createElement('div');
  timelineContainer.className = 'relative flex-1';
  timelineContainer.style.position = 'relative';

  let dragState = {
    isActive: false,
    startQuarter: null,
    currentQuarter: null,
    startElement: null,
    selectionOverlay: null,
  };

  const createSelectionOverlay = () => {
    if (dragState.selectionOverlay) {
      dragState.selectionOverlay.remove();
    }
    dragState.selectionOverlay = document.createElement('div');
    dragState.selectionOverlay.className =
      'absolute left-14 right-2 bg-primary/30 rounded pointer-events-none z-20 border border-primary/50';
    daySchedule.appendChild(dragState.selectionOverlay);
  };

  const updateSelectionOverlay = (startQuarter, endQuarter) => {
    if (!dragState.selectionOverlay) return;
    const start = Math.min(startQuarter, endQuarter);
    const end = Math.max(startQuarter, endQuarter) + 1;
    const offsetFromTop = (start - 20) * QUARTER_HOUR_HEIGHT;
    const height = (end - start) * QUARTER_HOUR_HEIGHT;
    dragState.selectionOverlay.style.top = `${offsetFromTop}px`;
    dragState.selectionOverlay.style.height = `${height}px`;
  };

  const handleDragStart = (quarter, e) => {
    dragState.isActive = true;
    dragState.startQuarter = quarter;
    dragState.currentQuarter = quarter;
    dragState.startElement = e.currentTarget;
    createSelectionOverlay();
    updateSelectionOverlay(quarter, quarter);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
    e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!dragState.isActive) return;
    const dayScheduleRect = daySchedule.getBoundingClientRect();
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const relativeY = clientY - dayScheduleRect.top;
    const quarterOffset = Math.floor(relativeY / QUARTER_HOUR_HEIGHT);
    dragState.currentQuarter = Math.max(20, Math.min(92, 20 + quarterOffset));
    updateSelectionOverlay(dragState.startQuarter, dragState.currentQuarter);
  };

  const handleDragEnd = () => {
    if (!dragState.isActive) return;
    dragState.isActive = false;

    const startQuarter = Math.min(dragState.startQuarter, dragState.currentQuarter);
    const endQuarter = Math.max(dragState.startQuarter, dragState.currentQuarter) + 1;

    if (dragState.selectionOverlay) {
      dragState.selectionOverlay.remove();
      dragState.selectionOverlay = null;
    }

    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchend', handleDragEnd);

    const startHour = Math.floor(5 + startQuarter / 4);
    const startMinute = (startQuarter % 4) * 15;
    const endHour = Math.floor(5 + endQuarter / 4);
    const endMinute = (endQuarter % 4) * 15;

    const dateStr = currentDate.toISOString().split('T')[0];
    const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
    window.location.href = `./new-session.html?date=${dateStr}&startTime=${startTimeStr}&endTime=${endTimeStr}`;
  };

  hours.forEach((hour) => {
    const timeSlot = document.createElement('div');
    timeSlot.className = 'flex border-b border-subtle last:border-b-0';
    timeSlot.style.minHeight = `${HOUR_HEIGHT}px`;

    const timeLabel = document.createElement('div');
    timeLabel.className =
      'w-12 px-2 py-1 text-xs text-light-blue-info font-medium bg-off-white/5 flex-shrink-0 flex items-start pt-2';
    timeLabel.textContent = `${String(hour).padStart(2, '0')}:00`;

    const sessionContent = document.createElement('div');
    sessionContent.className =
      'flex-1 relative cursor-pointer hover:bg-off-white/5 transition-colors select-none';
    sessionContent.style.position = 'relative';
    sessionContent.style.minHeight = `${HOUR_HEIGHT}px`;
    sessionContent.style.userSelect = 'none';

    const quarterContainer = document.createElement('div');
    quarterContainer.className = 'flex flex-col h-full relative';

    for (let q = 0; q < 4; q++) {
      const quarter = document.createElement('div');
      quarter.className = 'flex-1 relative';

      if (q < 3) {
        quarter.style.borderBottom = '1px dashed rgba(142, 142, 147, 0.3)';
      }

      const quarterNum = hour * 4 + q;
      const quarterMinutes = q * 15;

      quarter.addEventListener('mousedown', (e) => handleDragStart(quarterNum, e));
      quarter.addEventListener('touchstart', (e) => handleDragStart(quarterNum, e));
      quarter.style.cursor = 'pointer';

      quarterContainer.appendChild(quarter);
    }

    sessionContent.appendChild(quarterContainer);
    timeSlot.appendChild(timeLabel);
    timeSlot.appendChild(sessionContent);
    daySchedule.appendChild(timeSlot);
  });

  const timelineContainerEl = daySchedule;

  sessions.forEach((session) => {
    const startTime = getSessionStartTime(session);
    const endTime = getSessionEndTime(session);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const startQuarters = (startHour - 5) * 4 + Math.floor(startMinute / 15);
    const endQuarters = (endHour - 5) * 4 + Math.floor(endMinute / 15);

    const offsetFromTop = startQuarters * QUARTER_HOUR_HEIGHT;
    const durationQuarters = endQuarters - startQuarters;
    const blockHeight = durationQuarters * QUARTER_HOUR_HEIGHT;

    const durationMs = endTime - startTime;

    const sessionBlock = document.createElement('div');
    const colors = getSessionColor(session.type);

    sessionBlock.className = `absolute left-14 right-2 ${colors.bg} ${colors.text} rounded px-3 py-2 text-sm font-semibold cursor-pointer active:scale-95 transition-transform overflow-hidden shadow-md`;
    sessionBlock.style.top = `${offsetFromTop}px`;
    sessionBlock.style.height = `${Math.max(56, blockHeight)}px`;
    sessionBlock.style.minHeight = '56px';
    sessionBlock.style.zIndex = '10';

    sessionBlock.innerHTML = `
      <div class="flex flex-col justify-between h-full w-full gap-1">
        <div class="flex flex-wrap gap-1 items-start text-xs leading-tight">
          <div class="font-semibold truncate">${session.name}</div>
          <div class="opacity-80">${formatSessionType(session.type)}</div>
          <div class="opacity-80">${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}</div>
        </div>
        <div class="text-xs leading-tight opacity-80 text-right whitespace-nowrap">${formatSessionDuration(durationMs)}</div>
      </div>
    `;

    sessionBlock.addEventListener('click', () => {
      window.location.href = `./session-detail.html?id=${session.id}`;
    });

    daySchedule.appendChild(sessionBlock);
  });
}

function getSessionStats(session) {
  let hits = 0;
  let total = 0;
  let duration = 0;

  if (session.series && session.series.length > 0) {
    for (const s of session.series) {
      hits += s.stats?.hitCount || (s.shots ? s.shots.filter((shot) => shot.hit).length : 0);
      total += s.stats?.totalShots || (s.shots ? s.shots.length : 0);
    }
  }

  const startTime = getSessionStartTime(session);
  const endTime = getSessionEndTime(session);
  if (startTime && endTime) {
    duration = endTime - startTime;
  }

  const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
  return { hits, total, hitRate, duration };
}

function getSessionBorderColor(sessionType) {
  const type = (sessionType || '').toLowerCase();
  if (type === 'competition') return 'border-l-neon-green';
  if (type === 'training') return 'border-l-neon-cyan';
  if (type === 'test_competition') return 'border-l-neon-orange';
  if (type === 'testing' || type === 'international_test') return 'border-l-neon-cyan';
  if (type === 'other') return 'border-l-neon-red';
  return 'border-l-red-500';
}

function renderWeekView() {
  document.getElementById('monthView').classList.add('hidden');
  document.getElementById('dayView').classList.add('hidden');
  document.getElementById('weekView').classList.remove('hidden');

  const referenceDate = new Date(currentDate);
  const dayOfWeek = referenceDate.getDay();
  const diff = referenceDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  const monday = new Date(referenceDate.setDate(diff));

  const lang = getLanguage && getLanguage() ? getLanguage() : 'de';
  const formatter = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
  });
  const endDate = new Date(monday);
  endDate.setDate(endDate.getDate() + 6);

  const startStr = formatter.format(monday);
  const endStr = formatter.format(endDate);
  const weekLabel = lang === 'de' ? 'KW' : 'CW';
  const weekNumber = getIsoWeekNumber(monday);
  document.getElementById('titleLabel').textContent =
    `${weekLabel} ${weekNumber} · ${startStr} - ${endStr}`;

  const weekSchedule = document.getElementById('weekSchedule');
  weekSchedule.innerHTML = '';

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    weekDays.push(day);
  }

  weekDays.forEach((day) => {
    const sessions = getSessionsForDate(day);
    const dayRow = document.createElement('div');
    dayRow.className =
      'flex items-start gap-4 py-3 border-b border-subtle/55 last:border-b-0 min-h-[72px]';

    const dayName = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
      weekday: 'short',
    }).format(day);
    const dayNum = day.getDate();
    const dateStr = day.toISOString().split('T')[0];

    const leftCol = document.createElement('div');
    leftCol.className = 'relative w-14 h-14 flex-shrink-0 flex items-center justify-center';

    const isToday = new Date().toDateString() === day.toDateString();
    const todayBadgeClass = isToday ? 'bg-primary text-deep-charcoal border-primary' : '';

    leftCol.innerHTML = `
      <div class="flex flex-col items-center justify-center z-10 w-10 h-10 rounded-full ${todayBadgeClass}">
        <span class="text-[9px] font-bold tracking-tight uppercase leading-none ${isToday ? 'text-deep-charcoal' : 'text-light-blue-info'}">${dayName}</span>
        <span class="text-sm font-extrabold leading-none mt-0.5 ${isToday ? 'text-deep-charcoal' : 'text-off-white'}">${dayNum}</span>
      </div>
    `;

    const rightCol = document.createElement('div');
    rightCol.className = 'flex-1 flex flex-col gap-2 min-w-0 self-center';

    if (sessions.length > 0) {
      sessions.forEach((session) => {
        const card = document.createElement('div');
        card.className =
          'w-full bg-card-dark border border-subtle rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer hover:bg-off-white/5';

        const typeColors = {
          training: 'bg-primary/10 text-primary border-primary/20',
          competition: 'bg-neon-green/10 text-neon-green border-neon-green/20',
          test_competition: 'bg-neon-orange/10 text-neon-orange border-neon-orange/20',
          international_test: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20',
          other: 'bg-neon-red/10 text-neon-red border-neon-red/20',
          testing: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20',
        };
        const normalizedType = (session.type || '').toLowerCase();
        const activeColor = typeColors[normalizedType] || typeColors.training;

        const startTimeStr = session.time || '09:00';
        const formattedType = formatSessionType(session.type);
        const athletesCount = session.athletes ? session.athletes.length : 0;
        const seriesCount = session.seriesCount || (session.series ? session.series.length : 0);

        card.innerHTML = `
          <!-- Header -->
          <div class="flex justify-between items-start mb-3">
              <div class="flex-1 min-w-0">
                  <h3 class="text-base font-bold text-off-white tracking-tight truncate">${session.name || (lang === 'de' ? 'Unbenannte Session' : 'Unnamed Session')}</h3>
                  <div class="flex items-center gap-1 mt-1">
                      <span class="material-symbols-outlined text-[14px] text-light-blue-info/60">location_on</span>
                      <p class="text-xs font-semibold text-light-blue-info/60 truncate">${session.location || '-'}</p>
                  </div>
              </div>
              <div class="${activeColor} border px-3 py-1 rounded-full ml-2 flex-shrink-0">
                <span class="text-[10px] font-black uppercase tracking-wider">${formattedType}</span>
              </div>
          </div>

          <!-- Footer -->
          <div class="mt-3 pt-3 border-t border-subtle/50 flex items-center justify-between text-xs font-bold text-light-blue-info/60">
              <div class="flex items-center gap-3">
                  <div class="flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[16px]">schedule</span>
                      <span>${startTimeStr}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[16px]">groups</span>
                      <span>${athletesCount} ${athletesCount === 1 ? 'Athlete' : 'Athletes'}</span>
                  </div>
                  ${
                    seriesCount
                      ? `<div class="flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[16px]">reorder</span>
                      <span>${seriesCount} ${seriesCount === 1 ? (lang === 'de' ? 'Serie' : 'Series') : lang === 'de' ? 'Serien' : 'Series'}</span>
                  </div>`
                      : ''
                  }
              </div>
              <span class="material-symbols-outlined text-[18px] text-light-blue-info/30">chevron_right</span>
          </div>
        `;

        card.addEventListener('click', () => {
          window.location.href = `./session-detail.html?id=${session.id}`;
        });

        rightCol.appendChild(card);
      });
    } else {
      const emptyState = document.createElement('div');
      emptyState.className =
        'flex items-center justify-between py-2 text-xs text-light-blue-info/40 italic';
      emptyState.innerHTML = `
        <span>${lang === 'de' ? 'Keine Einheiten' : 'No sessions'}</span>
        <button class="w-7 h-7 rounded-full border border-subtle/40 text-light-blue-info/60 hover:text-off-white hover:border-off-white/40 active:scale-90 transition-all flex items-center justify-center" title="${lang === 'de' ? 'Einheit hinzufügen' : 'Add session'}">
          <span class="material-symbols-outlined text-[16px]">add</span>
        </button>
      `;

      emptyState.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `./new-session.html?date=${dateStr}`;
      });

      rightCol.appendChild(emptyState);
    }

    dayRow.appendChild(leftCol);
    dayRow.appendChild(rightCol);
    weekSchedule.appendChild(dayRow);
  });
}

function renderCalendar() {
  updateCurrentDate();

  if (currentView === 'month') {
    renderMonthView();
  } else if (currentView === 'day') {
    renderDayView();
  } else if (currentView === 'week') {
    renderWeekView();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  updateCurrentDate();
  await loadSessions();
  setupEventListeners();
  applyLanguage();

  const savedView = localStorage.getItem('calendarView') || 'month';
  currentView = savedView;

  const viewNames = {
    day: t('calendar_day'),
    week: t('calendar_week'),
    month: t('calendar_month'),
    '3months': t('calendar_3months'),
  };
  document.getElementById('currentView').textContent = viewNames[currentView];

  const viewOptions = document.querySelectorAll('.view-option');
  viewOptions.forEach((opt) => opt.classList.remove('selected'));
  document.querySelector(`[data-view="${currentView}"]`)?.classList.add('selected');

  renderCalendar();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    get currentView() {
      return currentView;
    },
    set currentView(v) {
      currentView = v;
    },
    get currentDate() {
      return currentDate;
    },
    set currentDate(v) {
      currentDate = v;
    },
    renderWeekView,
  };
}
