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

function renderTrainerEmails() {
  const list = document.getElementById('email-list');
  if (!list) return;
  if (trainerEmails.length === 0) {
    list.innerHTML =
      '<p class="text-center text-slate-500 text-sm py-2">Keine Email-Adressen hinterlegt</p>';
    return;
  }
  list.innerHTML = trainerEmails
    .map(
      (email, i) => `
    <div class="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800">
      <span class="text-sm">${email}</span>
      <button onclick="removeTrainerEmail(${i})" class="text-red-500 hover:text-red-400 text-sm font-semibold">Löschen</button>
    </div>
  `
    )
    .join('');
}

function addTrainerEmail() {
  const input = document.getElementById('new-email-input');
  const email = input.value.trim();
  if (!email) return;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Ungültige Email-Adresse', 'error');
    return;
  }
  if (trainerEmails.includes(email)) {
    showToast('Email-Adresse bereits vorhanden', 'error');
    return;
  }
  trainerEmails.push(email);
  saveTrainerEmails();
  input.value = '';
  renderTrainerEmails();
  showToast('Email-Adresse hinzugefügt', 'success');
}

function removeTrainerEmail(index) {
  trainerEmails.splice(index, 1);
  saveTrainerEmails();
  renderTrainerEmails();
  showToast('Email-Adresse entfernt', 'success');
}

function saveEmailSettings() {
  const autoSend = document.getElementById('auto-send-checkbox').checked;
  localStorage.setItem('b_auto_send_enabled', autoSend);
  console.log('Email-Einstellungen gespeichert:', {
    autoSend,
  });
  return true;
}

async function sendEmailWithSeries(series, emailList = null) {
  if (!EMAILJS_ENABLED) return;

  const recipientEmails = emailList || trainerEmails;

  if (recipientEmails.length === 0) {
    console.log('Keine Email-Adressen hinterlegt. Versand übersprungen.');
    return;
  }
  try {
    const imageDataUri = await generateTargetImage(series.shots);
    const hDir =
      Math.round(series.corrH || 0) > 0
        ? 'rechts'
        : Math.round(series.corrH || 0) < 0
          ? 'links'
          : '';
    const hVal = Math.abs(Math.round(series.corrH || 0));
    const vDir =
      Math.round(series.corrV || 0) > 0 ? 'oben' : Math.round(series.corrV || 0) < 0 ? 'unten' : '';
    const vVal = Math.abs(Math.round(series.corrV || 0));

    const promises = recipientEmails.map((email) => {
      const templateParams = {
        to_email: email,
        trainer_name: getTrainerName(),
        athlete_name: currentAthleteName,
        date: series.timestamp.split(' ')[0],
        time: series.timestamp.split(' ')[1],
        location: sessions[currentSessionIndex].ort,
        position: series.position === 'Liegend' ? 'Liegend' : 'Stehend',
        hits: series.hits,
        total_score: series.totalScore,
        shooting_time: series.shootingTime || 0,
        corr_h: `${hVal} ${hDir}`,
        corr_v: `${vVal} ${vDir}`,
        shot_1: formatShotInfo(series.shots[0]),
        shot_2: formatShotInfo(series.shots[1]),
        shot_3: formatShotInfo(series.shots[2]),
        shot_4: formatShotInfo(series.shots[3]),
        shot_5: formatShotInfo(series.shots[4]),
        target_image: imageDataUri.split(',')[1],
      };
      return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    });
    await Promise.all(promises);
    console.log(`Email erfolgreich an ${recipientEmails.length} Empfänger gesendet`);
  } catch (error) {
    console.error('Fehler beim Email-Versand:', error);
    alert('Fehler beim Senden: ' + error.text);
  }
}

async function sendTestEmail() {
  if (trainerEmails.length === 0) {
    showToast('Bitte mindestens eine Email-Adresse hinzufügen', 'error');
    return;
  }
  if (!EMAILJS_ENABLED) {
    showToast('EmailJS nicht konfiguriert. Bitte API-Keys in der Datei setzen.', 'error');
    return;
  }
  showToast(`Sende Test-Email an ${trainerEmails.length} Empfänger...`, 'info');
  try {
    const promises = trainerEmails.map((email) => {
      const testParams = {
        to_email: email,
        athlete_name: currentAthleteName || 'Test-Athlet',
        date: new Date().toLocaleDateString('de-DE'),
        time: new Date().toLocaleTimeString('de-DE'),
        location: 'Test-Standort',
        position: 'Liegend',
        hits: 5,
        total_score: 50,
        shooting_time: 45,
        corr_h: '2 rechts',
        corr_v: '1 oben',
        shot_1: 'Ring 10 (Treffer)',
        shot_2: 'Ring 10 (Treffer)',
        shot_3: 'Ring 10 (Treffer)',
        shot_4: 'Ring 10 (Treffer)',
        shot_5: 'Ring 10 (Treffer)',
        target_image: '',
      };
      return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, testParams);
    });
    await Promise.all(promises);
    showToast(`Test-Email erfolgreich an ${trainerEmails.length} Empfänger gesendet!`, 'success');
    console.log('Test emails sent to:', trainerEmails);
  } catch (error) {
    console.error('Test email error:', error);
    let errorMessage = 'Test-Email Fehler: ';
    if (!EMAILJS_ENABLED) {
      errorMessage += 'EmailJS nicht konfiguriert.';
    } else if (error.text && error.text.includes('API public key')) {
      errorMessage += 'Ungültiger Public Key';
    } else if (error.text && error.text.includes('Service not found')) {
      errorMessage += 'Service ID nicht gefunden';
    } else if (error.text && error.text.includes('Template not found')) {
      errorMessage += 'Template ID nicht gefunden';
    } else {
      errorMessage += error.text || 'Bitte Konfiguration prüfen.';
    }
    showToast(errorMessage, 'error');
  }
}

function formatShotInfo(shot) {
  if (!shot) return '-';
  return `Ring: ${shot.ring} (${shot.hit ? 'Treffer' : 'Fehler'})`;
}

function renderSessionEmails() {
  const session = sessions[currentSessionIndex];
  if (!session.emails) {
    session.emails = [];
  }
  const list = document.getElementById('session-email-list');
  if (session.emails.length === 0) {
    list.innerHTML =
      '<p class="text-center text-slate-500 text-sm py-2">Keine Email-Adressen für diese Einheit</p>';
    return;
  }
  list.innerHTML = session.emails
    .map(
      (email, i) => `
    <div class="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800">
      <span class="text-sm">${email}</span>
      <button onclick="removeSessionEmail(${i})" class="text-red-500 hover:text-red-400 text-sm font-semibold">Löschen</button>
    </div>
  `
    )
    .join('');
}

function addSessionEmail() {
  const input = document.getElementById('session-email-input');
  const email = input.value.trim();
  if (!email) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Ungültige Email-Adresse', 'error');
    return;
  }

  const session = sessions[currentSessionIndex];
  if (!session.emails) {
    session.emails = [];
  }

  if (session.emails.includes(email)) {
    showToast('Email-Adresse bereits vorhanden', 'error');
    return;
  }

  session.emails.push(email);
  saveSessions();
  input.value = '';
  renderSessionEmails();
  showToast('Email-Adresse hinzugefügt', 'success');
}

function removeSessionEmail(index) {
  const session = sessions[currentSessionIndex];
  if (!session.emails) {
    session.emails = [];
  }
  session.emails.splice(index, 1);
  saveSessions();
  renderSessionEmails();
  showToast('Email-Adresse entfernt', 'success');
}

function renderSessionEmailSettings() {
  const session = sessions[currentSessionIndex];
  const checkbox = document.getElementById('session-auto-send-checkbox');
  checkbox.checked = session.autoSend || false;
}

function saveSessionEmailSettings() {
  const session = sessions[currentSessionIndex];
  const checkbox = document.getElementById('session-auto-send-checkbox');
  session.autoSend = checkbox.checked;
  saveSessions();
  showToast(checkbox.checked ? 'Email-Versand aktiviert' : 'Email-Versand deaktiviert', 'success');
}

async function sendEmailWithSeriesAndRecipient(series, recipientEmail) {
  if (!EMAILJS_ENABLED) return;

  try {
    const imageDataUri = await generateTargetImage(series.shots);
    const hDir =
      Math.round(series.corrH || 0) > 0
        ? 'rechts'
        : Math.round(series.corrH || 0) < 0
          ? 'links'
          : '';
    const hVal = Math.abs(Math.round(series.corrH || 0));
    const vDir =
      Math.round(series.corrV || 0) > 0 ? 'oben' : Math.round(series.corrV || 0) < 0 ? 'unten' : '';
    const vVal = Math.abs(Math.round(series.corrV || 0));

    const templateParams = {
      to_email: recipientEmail,
      trainer_name: getTrainerName(),
      athlete_name: currentAthleteName,
      date: series.timestamp.split(' ')[0],
      time: series.timestamp.split(' ')[1],
      location: sessions[currentSessionIndex].ort,
      position: series.position === 'Liegend' ? 'Liegend' : 'Stehend',
      hits: series.hits,
      total_score: series.totalScore,
      shooting_time: series.shootingTime || 0,
      corr_h: `${hVal} ${hDir}`,
      corr_v: `${vVal} ${vDir}`,
      shot_1: formatShotInfo(series.shots[0]),
      shot_2: formatShotInfo(series.shots[1]),
      shot_3: formatShotInfo(series.shots[2]),
      shot_4: formatShotInfo(series.shots[3]),
      shot_5: formatShotInfo(series.shots[4]),
      target_image: imageDataUri.split(',')[1],
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    showToast(`Email erfolgreich an ${recipientEmail} versendet!`, 'success');
    console.log(`Email erfolgreich an ${recipientEmail} versendet`);
  } catch (error) {
    console.error('Fehler beim Email-Versand:', error);
    showToast(`Fehler beim Versand: ${error.text || error.message}`, 'error');
  }
}
