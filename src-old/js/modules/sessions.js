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

let currentSessionIndex = -1;
let currentSType = 'Training';

function renderSessions() {
  const list = document.getElementById('session-list');
  list.innerHTML = sessions.length
    ? ''
    : '<p class="text-center text-slate-500 py-10">Keine Einheiten vorhanden.</p>';
  sessions.forEach((s, i) => {
    const div = document.createElement('div');

    let bgColorStyle = 'rgba(79, 70, 229, 0.25)';
    let borderColorStyle = 'rgba(79, 70, 229, 0.5)';
    let badgeColor = 'bg-indigo-500/20 text-indigo-300';
    let emoji = '🎯';

    if (s.typ === 'Wettkampf') {
      bgColorStyle = 'rgba(239, 68, 68, 0.25)';
      borderColorStyle = 'rgba(239, 68, 68, 0.5)';
      badgeColor = 'bg-red-500/20 text-red-300';
      emoji = '🏆';
    } else if (s.typ === 'Anschießen') {
      bgColorStyle = 'rgba(34, 197, 94, 0.25)';
      borderColorStyle = 'rgba(34, 197, 94, 0.5)';
      badgeColor = 'bg-green-500/20 text-green-300';
      emoji = '🏹';
    }

    div.className = `swipe-item glass-card p-5 rounded-2xl flex justify-between items-center group cursor-pointer hover:border-opacity-100 transition-all`;
    div.style.backgroundColor = bgColorStyle;
    div.style.borderColor = borderColorStyle;
    div.style.borderWidth = '1px';
    div.style.borderStyle = 'solid';
    div.dataset.sessionIndex = i;
    div.onclick = () => showAthletesView(i);
    div.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="text-2xl">${emoji}</div>
        <div>
          <h3 class="font-bold text-lg">${s.ort} <span class="text-sm ml-2 px-2 py-1 rounded-full ${badgeColor} font-normal">${s.typ}</span></h3>
          <p class="text-xs text-slate-400">${new Date(s.datum).toLocaleDateString()} • ${s.athletes.length} Athlet(en) ${s.zusatz ? '• ' + s.zusatz : ''}</p>
        </div>
      </div>
      <button onclick="event.stopPropagation(); deleteSession(${i})" class="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all">🗑️</button>
    `;
    list.appendChild(div);
  });
}

function deleteSession(i) {
  if (confirm('Löschen?')) {
    sessions.splice(i, 1);
    saveSessions();
    renderSessions();
  }
}

function showAthletesView(sessionIndex) {
  currentSessionIndex = sessionIndex;
  const session = sessions[sessionIndex];
  document.getElementById('view-sessions').classList.add('hidden');
  document.getElementById('view-athlete-detail').classList.add('hidden');
  document.getElementById('view-athletes').classList.remove('hidden');
  document.getElementById('view-athletes-title').textContent = session.ort;
  document.getElementById('view-athletes-subtitle').textContent =
    `${new Date(session.datum).toLocaleDateString()} • ${session.zusatz || session.typ}`;
  const list = document.getElementById('athletes-in-session-list');
  list.innerHTML = session.athletes
    .map(
      (name, idx) => `
    <div onclick="showAthleteDetail('${name}')" class="swipe-item glass-card p-5 rounded-2xl flex items-center justify-between hover:bg-indigo-500/10 transition-all cursor-pointer" data-athlete-index="${idx}">
      <div class="flex items-center gap-4">
        <div class="bg-indigo-500/20 w-10 h-10 rounded-full flex items-center justify-center text-indigo-400 font-bold">
          ${name.charAt(0)}
        </div>
        <span class="text-lg font-semibold">${name}</span>
      </div>
      <span class="text-slate-500">→</span>
    </div>
  `
    )
    .join('');
}

function submitSessionForm() {
  const checked = Array.from(
    document.querySelectorAll('input[name="session-athletes"]:checked')
  ).map((el) => el.value);
  if (!checked.length) {
    alert('Wähle Athleten aus!');
    return;
  }

  // Globale Email-Einstellungen in die neue Session kopieren
  const autoSendEnabled = localStorage.getItem('b_auto_send_enabled') === 'true';
  const globalEmails = trainerEmails || [];

  sessions.push({
    ort: document.getElementById('s-ort').value,
    datum: document.getElementById('s-datum').value,
    zusatz: document.getElementById('s-zusatz').value,
    typ: currentSType,
    athletes: checked,
    history: {},
    emails: [...globalEmails], // Kopiere globale Emails in die Session
    autoSend: autoSendEnabled, // Kopiere Auto-Send Einstellung
  });
  saveSessions();
  document.getElementById('session-form').reset();
  closeModal('session-modal');
  showSessionsView();
}

function setSType(type) {
  currentSType = type;
  document.getElementById('s-btn-t').className =
    type === 'Training'
      ? 'p-3 rounded-lg border-2 border-indigo-500 bg-indigo-500/20 font-bold'
      : 'p-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-400';
  document.getElementById('s-btn-w').className =
    type === 'Wettkampf'
      ? 'p-3 rounded-lg border-2 border-red-500 bg-red-500/20 font-bold'
      : 'p-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-400';
  document.getElementById('s-btn-a').className =
    type === 'Anschießen'
      ? 'p-3 rounded-lg border-2 border-green-500 bg-green-500/20 font-bold'
      : 'p-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-400';
}

function showSessionsView() {
  document.getElementById('view-athletes').classList.add('hidden');
  document.getElementById('view-athlete-detail').classList.add('hidden');
  document.getElementById('view-sessions').classList.remove('hidden');
  renderSessions();
}
