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
 * Athlete Detail Page Script
 * Handles athlete information display
 */

class AthleteDetailPage {
  constructor() {
    this.backBtn = document.getElementById('backBtn');
    this.athleteNameEl = document.getElementById('athleteName');
    this.connectBtn = document.getElementById('connectBtn');
    this.menuDotsBtn = document.getElementById('menuDotsBtn');
    this.genderValue = document.getElementById('genderValue');
    this.proneDirection = document.getElementById('proneDirection');
    this.standingDirection = document.getElementById('standingDirection');
    this.correctionValue = document.getElementById('correctionValue');
    this.athlete = null;
    this.athleteId = this.getAthleteIdFromUrl();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadAthleteData();
    this.renderAthleteData();
  }

  setupEventListeners() {
    this.backBtn.addEventListener('click', () => this.goBack());
    this.connectBtn.addEventListener('click', () => this.connectToAthlete());
    this.menuDotsBtn.addEventListener('click', () => this.showMenu());
  }

  getAthleteIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 1;
  }

  loadAthleteData() {
    try {
      const athletesData = localStorage.getItem('athletes');
      if (athletesData) {
        const athletes = JSON.parse(athletesData);
        this.athlete = athletes.find((a) => a.id == this.athleteId);
      }
    } catch (e) {
      this.athlete = null;
    }

    if (!this.athlete) {
      this.athlete = this.getMockAthlete();
    }
  }

  getMockAthlete() {
    const mockAthletes = {
      1: {
        id: 1,
        name: 'Julius',
        gender: 'Male',
        birthDate: '1995-03-15',
        country: 'AUT',
        proneDirection: 'Left to right',
        standingDirection: 'Right to left',
        sightCorrection: '3.0 mm',
      },
      2: {
        id: 2,
        name: 'Anna',
        gender: 'Female',
        birthDate: '1998-07-22',
        country: 'AUT',
        proneDirection: 'Right to left',
        standingDirection: 'Left to right',
        sightCorrection: '2.5 mm',
      },
    };
    return mockAthletes[this.athleteId] || mockAthletes[1];
  }

  renderAthleteData() {
    if (!this.athlete) return;
    this.athleteNameEl.textContent = this.athlete.name;
    this.genderValue.textContent = this.athlete.gender || 'Not set';
    this.proneDirection.textContent = this.athlete.proneDirection || 'Not set';
    this.standingDirection.textContent = this.athlete.standingDirection || 'Not set';
    this.correctionValue.textContent = this.athlete.sightCorrection || '3.0 mm';
  }

  connectToAthlete() {
    alert(`Connecting to athlete: ${this.athlete.name}\n\nThis would open a connection dialog.`);
  }

  showMenu() {
    alert(`Menu for ${this.athlete.name}\n\nEdit | Delete | Export`);
  }

  goBack() {
    window.location.href = 'athletes.html';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  new AthleteDetailPage();
});
