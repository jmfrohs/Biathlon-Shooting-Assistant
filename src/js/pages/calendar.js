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
 * Calendar Page Script
 * Handles calendar display and month navigation
 */

class CalendarPage {
  constructor() {
    this.backBtn = document.getElementById('backBtn');
    this.prevMonthBtn = document.getElementById('prevMonthBtn');
    this.nextMonthBtn = document.getElementById('nextMonthBtn');
    this.monthYearEl = document.getElementById('monthYear');
    this.calendarDaysEl = document.getElementById('calendarDays');
    this.currentDate = new Date();
    this.today = new Date();
    this.daysWithEvents = new Set();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadEventsFromStorage();
    this.renderCalendar();
  }

  setupEventListeners() {
    this.backBtn.addEventListener('click', () => this.goBack());
    this.prevMonthBtn.addEventListener('click', () => this.previousMonth());
    this.nextMonthBtn.addEventListener('click', () => this.nextMonth());
  }

  loadEventsFromStorage() {
    try {
      const sessionsData = localStorage.getItem('sessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        sessions.forEach((session) => {
          const date = new Date(session.date);
          const dateString = date.toISOString().split('T')[0];
          this.daysWithEvents.add(dateString);
        });
      }
    } catch (e) {
    }
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthName = this.getMonthName(month);
    this.monthYearEl.textContent = `${monthName} ${year}`;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.calendarDaysEl.innerHTML = '';
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      this.calendarDaysEl.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      const dayDate = new Date(year, month, day);
      const dateString = dayDate.toISOString().split('T')[0];
      dayCell.className = 'calendar-day';
      dayCell.textContent = day;
      if (this.isToday(dayDate)) {
        dayCell.classList.add('today');
      }

      if (this.daysWithEvents.has(dateString)) {
        dayCell.classList.add('has-event');
      }
      dayCell.addEventListener('click', () => this.selectDay(dayDate));
      this.calendarDaysEl.appendChild(dayCell);
    }
  }

  isToday(date) {
    return (
      date.getDate() === this.today.getDate() &&
      date.getMonth() === this.today.getMonth() &&
      date.getFullYear() === this.today.getFullYear()
    );
  }

  getMonthName(month) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month];
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }

  selectDay(date) {
    const dateString = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  goBack() {
    window.location.href = 'index.html';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  new CalendarPage();
});
