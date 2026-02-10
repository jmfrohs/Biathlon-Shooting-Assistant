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

// Settings Page Logic

// Age Groups configuration
const defaultAgeGroups = ['AK 16', 'AK 17', 'AK 18', 'Junioren', 'Senioren'];
const defaultKaders = ['Nothing', 'LK1', 'LK2', 'NK2', 'NK1', 'OK', 'PK'];

function loadAgeGroups() {
  return JSON.parse(localStorage.getItem('ageGroups')) || defaultAgeGroups;
}

function loadKaders() {
  return JSON.parse(localStorage.getItem('kaders')) || defaultKaders;
}

function saveAgeGroups(groups) {
  localStorage.setItem('ageGroups', JSON.stringify(groups));
}

function saveKaders(kaders) {
  localStorage.setItem('kaders', JSON.stringify(kaders));
}

document.addEventListener('DOMContentLoaded', () => {
  const editAgeGroupBtn = document.getElementById('editAgeGroupBtn');
  const editKaderBtn = document.getElementById('editKaderBtn');

  if (editAgeGroupBtn) {
    editAgeGroupBtn.addEventListener('click', () => {
      showAgeGroupModal();
    });
  }

  if (editKaderBtn) {
    editKaderBtn.addEventListener('click', () => {
      showKaderModal();
    });
  }
});

function showAgeGroupModal() {
  const ageGroups = loadAgeGroups();
  let athletes = JSON.parse(localStorage.getItem('athletes')) || [];

  let html = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="ageGroupModal">
      <div class="bg-card-dark rounded-3xl p-6 w-[95%] max-w-4xl max-h-[85vh] flex flex-col border border-white/10">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-off-white">Age Group Management</h2>
          <button class="text-white/50 hover:text-white" id="closeAgeGroupModalBtn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4" id="ageGroupContainer">
  `;

  ageGroups.forEach((group) => {
    const groupAthletes = athletes.filter((a) => a.ageGroup === group);
    html += `
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-bold text-primary">${group} (${groupAthletes.length})</h3>
          <button class="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-500/20" data-delete-age="${group}">Delete</button>
        </div>
        <div class="space-y-2 min-h-[50px] bg-white/3 rounded-lg p-2" data-age-group="${group}">
    `;

    if (groupAthletes.length === 0) {
      html += `<p class="text-xs text-light-blue-info/60 italic px-2 py-1">Keine Athletes in dieser Gruppe</p>`;
    } else {
      groupAthletes.forEach((athlete) => {
        html += `
          <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 cursor-move hover:bg-white/10 transition-colors active:opacity-70" draggable="true" data-athlete-id="${athlete.id}">
            <span class="text-sm text-off-white">${athlete.firstName} ${athlete.lastName}</span>
            <span class="text-xs text-light-blue-info">${athlete.squad}</span>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `
        </div>
        <div class="flex gap-2">
          <button class="flex-1 bg-primary text-white font-semibold py-3 rounded-xl" id="addAgeGroupBtn">+ Add Age Group</button>
          <button class="flex-1 bg-white/10 text-white font-semibold py-3 rounded-xl" id="closeAgeGroupBtn">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('ageGroupModal');
  const container = document.getElementById('ageGroupContainer');

  // Delete age group
  modal.querySelectorAll('[data-delete-age]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ageToDelete = btn.getAttribute('data-delete-age');
      const groupAthletes = athletes.filter((a) => a.ageGroup === ageToDelete);

      if (groupAthletes.length > 0) {
        alert('Cannot delete age group with athletes. Move or delete athletes first.');
        return;
      }

      const updatedGroups = ageGroups.filter((g) => g !== ageToDelete);
      saveAgeGroups(updatedGroups);
      modal.remove();
      showAgeGroupModal();
    });
  });

  // Add new age group
  document.getElementById('addAgeGroupBtn').addEventListener('click', () => {
    const newName = prompt('Enter new age group name:');
    if (newName && newName.trim()) {
      if (!ageGroups.includes(newName.trim())) {
        ageGroups.push(newName.trim());
        saveAgeGroups(ageGroups);
        modal.remove();
        showAgeGroupModal();
      } else {
        alert('Age group already exists!');
      }
    }
  });

  // Drag and drop setup
  let draggedElement = null;

  container.querySelectorAll('[draggable="true"]').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      draggedElement = el;
      el.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', () => {
      if (draggedElement) {
        draggedElement.style.opacity = '1';
      }
      draggedElement = null;
    });
  });

  container.querySelectorAll('[data-age-group]').forEach((dropZone) => {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('bg-primary/20', 'border-primary');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('bg-primary/20', 'border-primary');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-primary/20', 'border-primary');

      if (draggedElement) {
        const athleteId = parseInt(draggedElement.getAttribute('data-athlete-id'));
        const targetAgeGroup = dropZone.getAttribute('data-age-group');

        // Reload athletes from storage
        athletes = JSON.parse(localStorage.getItem('athletes')) || [];
        const athlete = athletes.find((a) => a.id === athleteId);

        if (athlete && athlete.ageGroup !== targetAgeGroup) {
          athlete.ageGroup = targetAgeGroup;
          localStorage.setItem('athletes', JSON.stringify(athletes));
          draggedElement.style.opacity = '1';
          draggedElement = null;
          modal.remove();
          showAgeGroupModal();
        }
      }
    });
  });

  document.getElementById('closeAgeGroupBtn').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('closeAgeGroupModalBtn').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function showKaderModal() {
  const kaders = loadKaders();
  let athletes = JSON.parse(localStorage.getItem('athletes')) || [];

  let html = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="kaderModal">
      <div class="bg-card-dark rounded-3xl p-6 w-[95%] max-w-4xl max-h-[85vh] flex flex-col border border-white/10">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-off-white">Squad/Kader Management</h2>
          <button class="text-white/50 hover:text-white" id="closeKaderModalBtn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4" id="kaderContainer">
  `;

  kaders.forEach((kader) => {
    const kaderAthletes = athletes.filter((a) => a.squad === kader);
    html += `
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-bold text-primary">${kader} (${kaderAthletes.length})</h3>
          <button class="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-500/20" data-delete-kader="${kader}">Delete</button>
        </div>
        <div class="space-y-2 min-h-[50px] bg-white/3 rounded-lg p-2" data-kader="${kader}">
    `;

    if (kaderAthletes.length === 0) {
      html += `<p class="text-xs text-light-blue-info/60 italic px-2 py-1">Keine Athletes in diesem Squad</p>`;
    } else {
      kaderAthletes.forEach((athlete) => {
        html += `
          <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 cursor-move hover:bg-white/10 transition-colors active:opacity-70" draggable="true" data-athlete-id="${athlete.id}">
            <span class="text-sm text-off-white">${athlete.firstName} ${athlete.lastName}</span>
            <span class="text-xs text-light-blue-info">${athlete.ageGroup}</span>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `
        </div>
        <div class="flex gap-2">
          <button class="flex-1 bg-primary text-white font-semibold py-3 rounded-xl" id="addKaderBtn">+ Add Squad/Kader</button>
          <button class="flex-1 bg-white/10 text-white font-semibold py-3 rounded-xl" id="closeKaderBtn">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('kaderModal');
  const container = document.getElementById('kaderContainer');

  // Delete kader
  modal.querySelectorAll('[data-delete-kader]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kaderToDelete = btn.getAttribute('data-delete-kader');
      const kaderAthletes = athletes.filter((a) => a.squad === kaderToDelete);

      if (kaderAthletes.length > 0) {
        alert('Cannot delete squad with athletes. Move or delete athletes first.');
        return;
      }

      const updatedKaders = kaders.filter((k) => k !== kaderToDelete);
      saveKaders(updatedKaders);
      modal.remove();
      showKaderModal();
    });
  });

  // Add new kader
  document.getElementById('addKaderBtn').addEventListener('click', () => {
    const newName = prompt('Enter new squad/kader name:');
    if (newName && newName.trim()) {
      if (!kaders.includes(newName.trim())) {
        kaders.push(newName.trim());
        saveKaders(kaders);
        modal.remove();
        showKaderModal();
      } else {
        alert('Squad already exists!');
      }
    }
  });

  // Drag and drop setup
  let draggedElement = null;

  container.querySelectorAll('[draggable="true"]').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      draggedElement = el;
      el.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', () => {
      if (draggedElement) {
        draggedElement.style.opacity = '1';
      }
      draggedElement = null;
    });
  });

  container.querySelectorAll('[data-kader]').forEach((dropZone) => {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('bg-primary/20', 'border-primary');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('bg-primary/20', 'border-primary');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-primary/20', 'border-primary');

      if (draggedElement) {
        const athleteId = parseInt(draggedElement.getAttribute('data-athlete-id'));
        const targetKader = dropZone.getAttribute('data-kader');

        // Reload athletes from storage
        athletes = JSON.parse(localStorage.getItem('athletes')) || [];
        const athlete = athletes.find((a) => a.id === athleteId);

        if (athlete && athlete.squad !== targetKader) {
          athlete.squad = targetKader;
          localStorage.setItem('athletes', JSON.stringify(athletes));
          draggedElement.style.opacity = '1';
          draggedElement = null;
          modal.remove();
          showKaderModal();
        }
      }
    });
  });

  document.getElementById('closeKaderBtn').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('closeKaderModalBtn').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function toggleVoiceCommands() {
  const content = document.getElementById('vc-content');
  const chevron = document.getElementById('vc-chevron');
  if (!content || !chevron) return;

  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

function toggleApiConfig() {
  const content = document.getElementById('api-content');
  const chevron = document.getElementById('api-chevron');
  if (!content || !chevron) return;

  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}
