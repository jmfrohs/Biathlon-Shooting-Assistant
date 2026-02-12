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

let currentDate = new Date(2025, 10);
const sessions = [
  {
    date: 5,
    name: 'Shooting Drill B',
    type: 'Training',
    location: 'Vuokatti, Finland',
    time: '10:00 AM',
  },
  {
    date: 6,
    name: 'Regional Cup Finals',
    type: 'Competition',
    location: 'Vuokatti, Finland',
    time: '02:15 PM',
  },
  {
    date: 9,
    name: 'World Cup Warmup',
    type: 'Training',
    location: 'Kontiolahti, Finland',
    time: '09:30 AM',
  },
];

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  document.getElementById('monthYear').textContent = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
  let html = '';
  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div class="aspect-square"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const hasSession = sessions.some((s) => s.date === day);
    const isToday = new Date().getDate() === day && new Date().getMonth() === month;
    html += `
      <button class="aspect-square rounded-lg text-sm font-semibold transition-all ${
        isToday
          ? 'bg-primary text-off-white'
          : hasSession
            ? 'bg-primary/30 text-primary border border-primary/50'
            : 'bg-white/5 text-light-blue-info hover:bg-white/10'
      }">
        ${day}
      </button>
    `;
  }
  document.getElementById('calendarDays').innerHTML = html;
  renderSessions();
}

function renderSessions() {
  const month = currentDate.getMonth();
  const monthSessions = sessions.filter((s) => true);
  let html = '';
  if (monthSessions.length === 0) {
    html =
      '<p class="text-light-blue-info/40 text-sm italic text-center py-4">No sessions scheduled</p>';
  } else {
    monthSessions.forEach((session) => {
      const typeColor =
        session.type === 'Competition'
          ? 'border-neon-green/40 bg-neon-green/10 text-neon-green'
          : 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan';
      html += `
        <div class="bg-card-dark rounded-2xl p-4 border border-white/5 cursor-pointer active:scale-[0.97] transition-all">
          <div class="flex items-start justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 border ${typeColor} text-[10px] font-bold uppercase rounded-md tracking-wider">${session.type}</span>
                <h3 class="font-bold text-off-white">${session.name}</h3>
              </div>
              <div class="flex items-center gap-1 text-light-blue-info text-sm">
                <span class="material-symbols-outlined text-[18px]">location_on</span>
                <span>${session.location}</span>
              </div>
              <div class="text-light-blue-info/60 text-xs">Nov ${session.date}, 2025 • ${session.time}</div>
            </div>
            <span class="material-symbols-outlined text-white/30 text-[20px]">chevron_right</span>
          </div>
        </div>
      `;
    });
  }
  document.getElementById('sessionsList').innerHTML = html;
}
document.getElementById('prevMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});
renderCalendar();
