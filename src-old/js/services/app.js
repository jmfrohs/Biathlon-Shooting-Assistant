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

window.addEventListener('DOMContentLoaded', () => {
  const savedName = localStorage.getItem('b_trainer_name');
  if (savedName) {
    document.getElementById('trainer-name').value = savedName;
    document.getElementById('trainer-name-display').textContent = savedName;
  }

  targetElement = document.getElementById('biathlon-target');
  toggleButton = document.getElementById('toggle-button');
  buttonText = document.getElementById('button-text');
  statusMessage = document.getElementById('status-message');
  svgTarget = document.getElementById('biathlon-target');
  targetContainer = document.getElementById('target-container');
  shotCounterElement = document.getElementById('shot-counter');
  const transTarget = document.getElementById('transcription-target');
  if (transTarget) {
    transTarget.addEventListener('input', handleTextfieldInput);
  }

  if (EMAILJS_ENABLED) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  initializeDeviceType();
  initSwipeHandlers();
  setupSpeechRecognition();
  renderSessions();
  renderGlobalAthletes();

  document.getElementById('trainer-name').addEventListener('change', function () {
    localStorage.setItem('b_trainer_name', this.value.trim());
  });

  document.getElementById('trainer-name').addEventListener('input', function () {
    localStorage.setItem('b_trainer_name', this.value.trim());
  });

  document.getElementById('api-public-key').addEventListener('change', saveApiKeys);
  document.getElementById('api-service-id').addEventListener('change', saveApiKeys);
  document.getElementById('api-template-id').addEventListener('change', saveApiKeys);

  const permissionKey = 'biathlon_mic_permission_requested_v1';
  if (!localStorage.getItem(permissionKey)) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          audio: true,
        })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          localStorage.setItem(permissionKey, 'true');
        })
        .catch((err) => {
          localStorage.setItem(permissionKey, 'denied');
        });
    } else {
      localStorage.setItem(permissionKey, 'true');
    }
  } else {
    console.log('Microphone permission already cached - no new prompt');
  }
});

window.openSessionModal = openSessionModal;
window.openSettings = openSettings;
window.closeModal = closeModal;
window.showToast = showToast;
window.showAthleteDetail = showAthleteDetail;
window.backToAthletes = backToAthletes;
window.getAthleteHistory = getAthleteHistory;
window.renderAthleteHistory = renderAthleteHistory;
window.filterAthleteHistory = filterAthleteHistory;
window.filterHistoryByType = filterHistoryByType;
window.openHistoryViewer = openHistoryViewer;
window.toggleSeriesDetails = toggleSeriesDetails;
window.showSeriesCorrectionMarks = showSeriesCorrectionMarks;
window.hideSeriesCorrectionMarks = hideSeriesCorrectionMarks;
window.openTargetFullscreen = openTargetFullscreen;
window.deleteSeries = deleteSeries;
window.openSessionSettings = openSessionSettings;
window.renderSessionAthleteSelect = renderSessionAthleteSelect;
window.renderSessionAthletes = renderSessionAthletes;
window.addSessionAthlete = addSessionAthlete;
window.removeSessionAthlete = removeSessionAthlete;
window.openEmailSelectionModal = openEmailSelectionModal;
window.sendSeriesEmail = sendSeriesEmail;
window.saveApiKeys = saveApiKeys;
window.resetApiKeysToDefault = resetApiKeysToDefault;
window.renderGlobalAthletes = renderGlobalAthletes;
window.addGlobalAthlete = addGlobalAthlete;
window.removeGlobalAthlete = removeGlobalAthlete;
window.renderAthleteCheckboxes = renderAthleteCheckboxes;
window.toggleAllAthletes = toggleAllAthletes;
window.renderSessions = renderSessions;
window.deleteSession = deleteSession;
window.showAthletesView = showAthletesView;
window.submitSessionForm = submitSessionForm;
window.setSType = setSType;
window.showSessionsView = showSessionsView;
window.openShootingInterface = openShootingInterface;
window.closeShootingInterface = closeShootingInterface;
window.resetTargetVisuals = resetTargetVisuals;
window.setPosition = setPosition;
window.handleTargetClick = handleTargetClick;
window.updateShotCounter = updateShotCounter;
window.isValidShot = isValidShot;
window.updateStatusMessage = updateStatusMessage;
window.toggleSpeech = toggleSpeech;
window.renderTrainerEmails = renderTrainerEmails;
window.addTrainerEmail = addTrainerEmail;
window.removeTrainerEmail = removeTrainerEmail;
window.saveTrainerEmails = saveTrainerEmails;
window.saveEmailSettings = saveEmailSettings;
window.sendEmailWithSeries = sendEmailWithSeries;
window.sendTestEmail = sendTestEmail;
window.formatShotInfo = formatShotInfo;
window.sendEmailWithSeriesAndRecipient = sendEmailWithSeriesAndRecipient;
window.renderSessionEmails = renderSessionEmails;
window.addSessionEmail = addSessionEmail;
window.removeSessionEmail = removeSessionEmail;
window.renderSessionEmailSettings = renderSessionEmailSettings;
window.saveSessionEmailSettings = saveSessionEmailSettings;
window.renderTrainerName = renderTrainerName;
window.convertNumberWords = convertNumberWords;
window.getRandomArbitrary = getRandomArbitrary;
window.getRingFromDistance = getRingFromDistance;
window.getBiasedAngle = getBiasedAngle;
window.handleTextfieldInput = handleTextfieldInput;
window.initSwipeHandlers = initSwipeHandlers;
window.handleSwipeDelete = handleSwipeDelete;
window.getAverageShot = getAverageShot;
window.showCorrectionMarks = showCorrectionMarks;
window.hideCorrectionMarks = hideCorrectionMarks;
window.adjustCorrectionUp = adjustCorrectionUp;
window.adjustCorrectionDown = adjustCorrectionDown;
window.adjustCorrectionLeft = adjustCorrectionLeft;
window.adjustCorrectionRight = adjustCorrectionRight;
window.toggleAdjustment = toggleAdjustment;
window.saveDeviceType = saveDeviceType;
window.saveTargetSelection = saveTargetSelection;
window.getTargetSvgBase = getTargetSvgBase;
window.generateTargetSvg = generateTargetSvg;
window.generateTargetImage = generateTargetImage;
window.renderShots = renderShots;
window.toggleTranscriptionView = toggleTranscriptionView;
window.saveSessions = saveSessions;
window.saveAthletes = saveAthletes;
window.getTrainerName = getTrainerName;
window.saveTrainerName = saveTrainerName;
window.setupSpeechRecognition = setupSpeechRecognition;
