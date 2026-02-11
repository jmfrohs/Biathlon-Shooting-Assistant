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
function initializeDynamicSelects() {
  const defaultAgeGroups = ['AK 16', 'AK 17', 'AK 18', 'Junioren', 'Senioren'];
  const defaultKaders = ['Nothing', 'LK1', 'LK2', 'NK2', 'NK1', 'OK', 'PK'];
  const ageGroups = JSON.parse(localStorage.getItem('ageGroups')) || defaultAgeGroups;
  const kaders = JSON.parse(localStorage.getItem('kaders')) || defaultKaders;
  const ageGroupSelect = document.getElementById('ageGroup');
  const squadSelect = document.getElementById('squad');
  if (ageGroupSelect) {
    const currentOptions = Array.from(ageGroupSelect.options).slice(1);
    currentOptions.forEach((option) => option.remove());
    ageGroups.forEach((group) => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      ageGroupSelect.appendChild(option);
    });
  }

if (squadSelect) {
    const currentOptions = Array.from(squadSelect.options).slice(1);
    currentOptions.forEach((option) => option.remove());
    kaders.forEach((kader) => {
      const option = document.createElement('option');
      option.value = kader;
      option.textContent = kader;
      squadSelect.appendChild(option);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDynamicSelects);
} else {
  initializeDynamicSelects();
}