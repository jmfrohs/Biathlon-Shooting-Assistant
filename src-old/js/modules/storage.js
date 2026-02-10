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

let sessions = JSON.parse(localStorage.getItem('b_sessions') || '[]');
let globalAthletes = JSON.parse(localStorage.getItem('b_athletes')) || [''];
let trainerEmails = JSON.parse(localStorage.getItem('b_trainer_emails')) || [];

let EMAILJS_PUBLIC_KEY = localStorage.getItem('b_emailjs_public_key') || EMAILJS_PUBLIC_KEY_DEFAULT;
let EMAILJS_SERVICE_ID = localStorage.getItem('b_emailjs_service_id') || EMAILJS_SERVICE_ID_DEFAULT;
let EMAILJS_TEMPLATE_ID =
  localStorage.getItem('b_emailjs_template_id') || EMAILJS_TEMPLATE_ID_DEFAULT;

let deviceType = localStorage.getItem('b_device_type') || 'auto';

function saveSessions() {
  localStorage.setItem('b_sessions', JSON.stringify(sessions));
}

function saveAthletes() {
  localStorage.setItem('b_athletes', JSON.stringify(globalAthletes));
}

function saveTrainerEmails() {
  localStorage.setItem('b_trainer_emails', JSON.stringify(trainerEmails));
}

function getTrainerName() {
  return localStorage.getItem('b_trainer_name') || '';
}

function saveTrainerName(name) {
  localStorage.setItem('b_trainer_name', name.trim());
}

function getDeviceType() {
  return localStorage.getItem('b_device_type') || 'auto';
}

function setDeviceType(type) {
  localStorage.setItem('b_device_type', type);
  deviceType = type;
}

function getSelectedTarget() {
  return localStorage.getItem('b_selected_target') || 'scheibe1';
}

function setSelectedTarget(target) {
  localStorage.setItem('b_selected_target', target);
}

function getTargetConstants(target = null) {
  const targetType = target || getSelectedTarget();

  if (targetType === 'scheibe2') {
    return {
      name: SCHEIBE_2_NAME,
      svg: SCHEIBE_2_SVG,
    };
  }

  // Standard: Scheibe 1
  return {
    name: SCHEIBE_1_NAME,
    svg: SCHEIBE_1_SVG,
  };
}

function getDetectedDeviceType() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isPhone = /iphone|android|mobile|phone/.test(userAgent) && !/ipad|tablet/.test(userAgent);
  const isTablet = /ipad|android|tablet|kindle|playbook/.test(userAgent);

  if (isPhone) return 'phone';
  if (isTablet) return 'tablet';
  return 'pc';
}

function getEffectiveDeviceType() {
  const saved = getDeviceType();
  return saved === 'auto' ? getDetectedDeviceType() : saved;
}

function saveHistory() {
  const hits = currentShots.filter((shot) => shot.hit).length;
  const totalScore = currentShots.reduce((sum, shot) => sum + shot.ring, 0);
  let shootingTime = 0;
  if (currentShots.length > 1) {
    const firstShotTime = currentShots[0].timestamp;
    const lastShotTime = currentShots[currentShots.length - 1].timestamp;
    const shootingDuration = (lastShotTime - firstShotTime) / 1000;
    const prepBuffer = currentPosition === 'Liegend' ? 20 : 10;
    shootingTime = Math.round(shootingDuration + prepBuffer);
  }
  const history = getAthleteHistory();
  const session = sessions[currentSessionIndex];
  const seriesData = {
    timestamp: new Date().toLocaleString('de-DE'),
    position: currentPosition,
    hits: hits,
    totalScore: totalScore,
    corrH: Math.round(corrH * 10) / 10,
    corrV: Math.round(corrV * 10) / 10,
    shootingTime: shootingTime,
    shots: [...currentShots],
    sessionInfo: {
      typ: session.typ || 'Training',
      ort: session.ort || '',
      datum: session.datum || '',
    },
  };
  history.unshift(seriesData);
  saveSessions();
  renderAthleteHistory();

  const sessionAutoSendEnabled = session.autoSend === true;
  const sessionEmails = session.emails || [];

  if (sessionAutoSendEnabled && sessionEmails.length > 0 && EMAILJS_ENABLED) {
    sendEmailWithSeries(seriesData, sessionEmails);
  } else if (!sessionAutoSendEnabled) {
    const autoSendEnabled = localStorage.getItem('b_auto_send_enabled') === 'true';
    if (autoSendEnabled && trainerEmails.length > 0 && EMAILJS_ENABLED) {
      sendEmailWithSeries(seriesData, trainerEmails);
    }
  }
}
