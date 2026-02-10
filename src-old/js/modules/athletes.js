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

function renderGlobalAthletes() {
  document.getElementById('global-athlete-list').innerHTML = globalAthletes
    .map(
      (name, i) => `
    <div class="swipe-item flex justify-between bg-slate-900 p-2 rounded-lg border border-slate-800" data-athlete-index="${i}">
      <span>${name}</span>
      <button onclick="removeGlobalAthlete(${i})" class="text-red-500 text-sm">Löschen</button>
    </div>
  `
    )
    .join('');
  renderAthleteCheckboxes();
}

function addGlobalAthlete() {
  const input = document.getElementById('new-athlete-name');
  if (input.value.trim()) {
    globalAthletes.push(input.value.trim());
    saveAthletes();
    input.value = '';
    renderGlobalAthletes();
  }
}

function removeGlobalAthlete(i) {
  globalAthletes.splice(i, 1);
  saveAthletes();
  renderGlobalAthletes();
}

function renderAthleteCheckboxes() {
  document.getElementById('athlete-checkboxes').innerHTML = globalAthletes
    .map(
      (name) => `
    <label class="flex items-center gap-2 p-2 hover:bg-slate-800 rounded text-sm cursor-pointer">
      <input type="checkbox" name="session-athletes" value="${name}" class="accent-indigo-500">
      <span>${name}</span>
    </label>
  `
    )
    .join('');
}

function toggleAllAthletes() {
  const cbs = document.querySelectorAll('input[name="session-athletes"]');
  const allSelected = Array.from(cbs).every((cb) => cb.checked);
  const newState = !allSelected;
  cbs.forEach((cb) => (cb.checked = newState));
  document.getElementById('toggle-all-btn').textContent = newState
    ? 'Alle abwählen'
    : 'Alle auswählen';
}
