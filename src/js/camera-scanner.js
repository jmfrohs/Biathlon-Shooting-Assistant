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

export function openCameraAndScan() {
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.style.width = '100%';
  const isMobileViewport = window.matchMedia('(max-width: 640px)').matches;
  const previewMaxWidth = isMobileViewport ? '92vw' : '400px';
  const previewMaxHeight = isMobileViewport ? '50vh' : '300px';
  const primaryButtonPadding = isMobileViewport ? '14px 18px' : '12px 24px';
  const secondaryButtonPadding = isMobileViewport ? '12px 16px' : '8px 16px';
  video.style.maxWidth = previewMaxWidth;
  video.style.maxHeight = previewMaxHeight;
  video.style.objectFit = 'contain';
  video.style.borderRadius = '16px';
  video.style.marginBottom = '12px';

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = isMobileViewport ? '16px' : '24px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.overflowY = 'auto';

  const snapBtn = document.createElement('button');
  snapBtn.textContent = 'Foto aufnehmen';
  snapBtn.className = 'px-6 py-3 bg-primary text-white rounded-xl font-bold mt-4';
  snapBtn.style.width = isMobileViewport ? '100%' : 'auto';
  snapBtn.style.maxWidth = previewMaxWidth;
  snapBtn.style.padding = primaryButtonPadding;
  snapBtn.style.fontSize = isMobileViewport ? '16px' : '1rem';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.className = 'px-4 py-2 mt-2 bg-card-dark text-off-white rounded-xl';
  cancelBtn.style.width = isMobileViewport ? '100%' : 'auto';
  cancelBtn.style.maxWidth = previewMaxWidth;
  cancelBtn.style.padding = secondaryButtonPadding;
  cancelBtn.style.fontSize = isMobileViewport ? '15px' : '1rem';

  overlay.appendChild(video);
  overlay.appendChild(snapBtn);
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);

  let stream = null;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert(
      'Dein Browser unterstützt keinen Kamera-Zugriff (mediaDevices.getUserMedia). Bitte öffne die Seite über http://localhost:... und nutze einen aktuellen Browser.'
    );
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
    return;
  }

  const cameraConstraints = [
    { video: { facingMode: { exact: 'environment' } } },
    { video: { facingMode: 'environment' } },
    { video: true },
  ];

  const openPreferredCamera = async () => {
    for (const constraints of cameraConstraints) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        if (error.name !== 'OverconstrainedError' && error.name !== 'NotFoundError') {
          throw error;
        }
      }
    }

    throw new Error('Keine passende Kamera gefunden.');
  };

  const waitForImageReady = (img) =>
    new Promise((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        cleanupListeners();
        reject(new Error('Das aufgenommene Bild konnte nicht geladen werden.'));
      }, 3000);

      const onLoad = () => {
        cleanupListeners();
        resolve();
      };

      const onError = () => {
        cleanupListeners();
        reject(new Error('Das aufgenommene Bild ist fehlerhaft.'));
      };

      const cleanupListeners = () => {
        window.clearTimeout(timeoutId);
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };

      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
    });

  openPreferredCamera()
    .then((s) => {
      stream = s;
      video.srcObject = stream;
      return video.play().catch(() => {});
    })
    .catch((err) => {
      alert('Kamera konnte nicht geöffnet werden: ' + err);
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
    });

  const waitForVideoFrame = () =>
    new Promise((resolve, reject) => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        cleanupListeners();
        reject(new Error('Die Kamera liefert noch kein Bild.'));
      }, 3000);

      const onReady = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          cleanupListeners();
          resolve();
        }
      };

      const cleanupListeners = () => {
        window.clearTimeout(timeoutId);
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('playing', onReady);
      };

      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('playing', onReady);
    });

  const waitForOpenCv = () =>
    new Promise((resolve, reject) => {
      if (window.cv && cv.imread) {
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        window.clearInterval(intervalId);
        reject(new Error('OpenCV wurde nicht rechtzeitig geladen.'));
      }, 10000);

      const intervalId = window.setInterval(() => {
        if (window.cv && cv.imread) {
          window.clearTimeout(timeoutId);
          window.clearInterval(intervalId);
          resolve();
        }
      }, 100);
    });

  const renderPointMarkers = (layer, points) => {
    layer.innerHTML = '';

    points.forEach((point) => {
      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.style.left = `${point.xPercent}%`;
      marker.style.top = `${point.yPercent}%`;
      marker.style.transform = 'translate(-50%, -50%)';
      marker.style.width = isMobileViewport ? '30px' : '26px';
      marker.style.height = isMobileViewport ? '30px' : '26px';
      marker.style.borderRadius = '999px';
      marker.style.background = 'transparent';
      marker.style.border = isMobileViewport ? '3px solid #ef4444' : '2px solid #ef4444';
      marker.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
      marker.style.pointerEvents = 'none';
      layer.appendChild(marker);
    });
  };

  const scoreDetections = (manualPoints, detections, tolerance) => {
    const usedDetections = new Set();
    let matched = 0;
    let totalDistance = 0;
    let matchedCircularity = 0;
    let matchedRatio = 0;

    const nearestDistanceSum = manualPoints.reduce((sum, point) => {
      let nearest = Number.POSITIVE_INFINITY;

      detections.forEach((detection) => {
        const dx = detection.cx - point.pixelX;
        const dy = detection.cy - point.pixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < nearest) {
          nearest = distance;
        }
      });

      return sum + nearest;
    }, 0);

    for (const point of manualPoints) {
      let bestIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;

      detections.forEach((detection, index) => {
        if (usedDetections.has(index)) {
          return;
        }

        const dx = detection.cx - point.pixelX;
        const dy = detection.cy - point.pixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      if (bestIndex !== -1 && bestDistance <= tolerance) {
        usedDetections.add(bestIndex);
        matched += 1;
        totalDistance += bestDistance;
        matchedCircularity += detections[bestIndex].circularity || 0;
        matchedRatio += detections[bestIndex].ratio || 0;
      }
    }

    const missed = manualPoints.length - matched;
    const extras = Math.max(0, detections.length - matched);
    const countDelta = Math.abs(detections.length - manualPoints.length);
    const averageDistance = matched > 0 ? totalDistance / matched : Number.POSITIVE_INFINITY;
    const averageNearestDistance =
      manualPoints.length > 0 && detections.length > 0
        ? nearestDistanceSum / manualPoints.length
        : Number.POSITIVE_INFINITY;
    const averageCircularity = matched > 0 ? matchedCircularity / matched : 0;
    const averageRatio = matched > 0 ? matchedRatio / matched : Number.POSITIVE_INFINITY;

    return {
      matched,
      missed,
      extras,
      totalDistance,
      countDelta,
      averageDistance,
      averageNearestDistance,
      averageCircularity,
      averageRatio,
    };
  };

  const mapManualPointsToDetections = (
    manualPoints,
    detections,
    maxDistance = Number.POSITIVE_INFINITY
  ) => {
    const usedDetectionIndices = new Set();
    const assignments = [];

    manualPoints.forEach((point, pointIndex) => {
      let bestDetectionIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;

      detections.forEach((detection, detectionIndex) => {
        if (usedDetectionIndices.has(detectionIndex)) {
          return;
        }

        const dx = detection.cx - point.pixelX;
        const dy = detection.cy - point.pixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestDetectionIndex = detectionIndex;
        }
      });

      if (bestDetectionIndex !== -1 && bestDistance <= maxDistance) {
        usedDetectionIndices.add(bestDetectionIndex);
        assignments.push({
          pointIndex,
          detectionIndex: bestDetectionIndex,
          distance: bestDistance,
        });
      }
    });

    const extraDetectionIndices = detections
      .map((_, index) => index)
      .filter((index) => !usedDetectionIndices.has(index));

    return { assignments, usedDetectionIndices, extraDetectionIndices };
  };

  const isBetterScore = (nextScore, currentScore) => {
    if (!currentScore) {
      return true;
    }

    if (nextScore.matched !== currentScore.matched) {
      return nextScore.matched > currentScore.matched;
    }

    if (nextScore.missed !== currentScore.missed) {
      return nextScore.missed < currentScore.missed;
    }

    if (nextScore.averageNearestDistance !== currentScore.averageNearestDistance) {
      return nextScore.averageNearestDistance < currentScore.averageNearestDistance;
    }

    if (nextScore.countDelta !== currentScore.countDelta) {
      return nextScore.countDelta < currentScore.countDelta;
    }

    if (nextScore.extras !== currentScore.extras) {
      return nextScore.extras < currentScore.extras;
    }

    if (nextScore.averageDistance !== currentScore.averageDistance) {
      return nextScore.averageDistance < currentScore.averageDistance;
    }

    if (nextScore.averageCircularity !== currentScore.averageCircularity) {
      return nextScore.averageCircularity > currentScore.averageCircularity;
    }

    if (nextScore.averageRatio !== currentScore.averageRatio) {
      return nextScore.averageRatio < currentScore.averageRatio;
    }

    return nextScore.totalDistance < currentScore.totalDistance;
  };

  const prepareImageForDetection = (imageElement) => {
    const source = cv.imread(imageElement);
    const gray = new cv.Mat();
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.medianBlur(gray, gray, 5);

    const equalized = new cv.Mat();
    cv.equalizeHist(gray, equalized);
    gray.delete();

    return { source, equalized };
  };

  const detectHitsWithParams = (preparedImage, params, shouldRender = false) => {
    const thresh = new cv.Mat();
    cv.adaptiveThreshold(
      preparedImage.equalized,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      params.blockSize,
      params.offset
    );

    const morphKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    cv.morphologyEx(thresh, thresh, cv.MORPH_OPEN, morphKernel);
    cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, morphKernel);
    morphKernel.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const centerX = Math.round(preparedImage.source.cols / 2);
    const centerY = Math.round(preparedImage.source.rows / 2);
    const maxDistanceFromCenter =
      Math.min(preparedImage.source.cols, preparedImage.source.rows) * params.maxDistanceFactor;

    const detections = [];
    const resultImage = shouldRender ? preparedImage.source.clone() : null;
    const threshPreview = shouldRender ? new cv.Mat() : null;

    if (threshPreview) {
      cv.cvtColor(thresh, threshPreview, cv.COLOR_GRAY2RGBA);
    }

    for (let i = 0; i < contours.size(); i += 1) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      const perimeter = cv.arcLength(cnt, true);
      const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
      const ratio = area > 0 ? (perimeter * perimeter) / area : Number.POSITIVE_INFINITY;

      if (
        area > params.minArea &&
        area < params.maxArea &&
        circularity > params.minCircularity &&
        ratio < params.maxRatio
      ) {
        const moments = cv.moments(cnt);

        if (moments.m00 !== 0) {
          const cx = Math.round(moments.m10 / moments.m00);
          const cy = Math.round(moments.m01 / moments.m00);
          const dx = cx - centerX;
          const dy = cy - centerY;
          const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

          if (distanceFromCenter < maxDistanceFromCenter) {
            detections.push({ cx, cy, area, circularity, ratio });
          }
        }
      }

      cnt.delete();
    }

    thresh.delete();
    contours.delete();
    hierarchy.delete();

    return { detections, resultImage, threshPreview };
  };

  const AUTO_DETECTION_PARAMS = {
    blockSize: 19,
    offset: 3,
    minArea: 50,
    maxArea: 1400,
    minCircularity: 0.3,
    maxRatio: 1200,
    maxDistanceFactor: 0.4,
  };

  const selectAutoDetections = (detections, preparedImage) => {
    const minShotDistance = Math.max(
      16,
      Math.min(preparedImage.source.cols, preparedImage.source.rows) * 0.055
    );
    const maxAutoHits = 5;
    const areaCenter = (AUTO_DETECTION_PARAMS.minArea + AUTO_DETECTION_PARAMS.maxArea) / 2;
    const areaRange = Math.max(1, AUTO_DETECTION_PARAMS.maxArea - AUTO_DETECTION_PARAMS.minArea);

    const scored = detections.map((detection) => {
      const circularityScore = Math.min(1.5, Math.max(0, detection.circularity || 0));
      const ratioPenalty = Math.min(
        2,
        (detection.ratio || Number.POSITIVE_INFINITY) / AUTO_DETECTION_PARAMS.maxRatio
      );
      const areaPenalty = Math.abs((detection.area || 0) - areaCenter) / areaRange;
      const score = circularityScore * 2.2 - ratioPenalty * 1.1 - areaPenalty * 0.45;
      return { detection, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const selected = [];
    scored.forEach((entry) => {
      if (selected.length >= maxAutoHits) {
        return;
      }

      const isTooClose = selected.some((picked) => {
        const dx = picked.cx - entry.detection.cx;
        const dy = picked.cy - entry.detection.cy;
        return Math.sqrt(dx * dx + dy * dy) < minShotDistance;
      });

      if (!isTooClose) {
        selected.push(entry.detection);
      }
    });

    return selected;
  };

  const logAutoDetectionResult = (params, allDetections, selectedDetections) => {
    console.groupCollapsed('[camera-scanner] Automatische Treffererkennung');
    console.log('Parameter:', params);
    console.log('Zusammenfassung:', {
      detectedPoints: allDetections.length,
      selectedPoints: selectedDetections.length,
      rejectedPoints: Math.max(0, allDetections.length - selectedDetections.length),
    });
    console.log('Ausgewählte Treffer (Pixel):', selectedDetections);
    console.groupEnd();
  };

  const findBestTemporaryParameters = (manualPoints, preparedImage) => {
    const blockSizes = [11, 15, 19, 23];
    const offsets = [1, 2, 3, 4];
    const minAreas = [10, 20, 35, 50];
    const maxAreas = [600, 1000, 1400, 1800, 2400];
    const minCircularities = [0.1, 0.15, 0.2, 0.25, 0.3];
    const maxRatios = [1200, 1600, 2000, 2600];
    const tolerance = Math.max(
      28,
      Math.min(preparedImage.source.cols, preparedImage.source.rows) * 0.07
    );

    let bestResult = null;

    for (const blockSize of blockSizes) {
      for (const offset of offsets) {
        for (const minArea of minAreas) {
          for (const maxArea of maxAreas) {
            for (const minCircularity of minCircularities) {
              for (const maxRatio of maxRatios) {
                const params = {
                  blockSize,
                  offset,
                  minArea,
                  maxArea,
                  minCircularity,
                  maxRatio,
                  maxDistanceFactor: 0.4,
                };

                const detectionResult = detectHitsWithParams(preparedImage, params, false);
                const score = scoreDetections(manualPoints, detectionResult.detections, tolerance);

                if (!bestResult || isBetterScore(score, bestResult.score)) {
                  bestResult = { params, score, detections: detectionResult.detections, tolerance };
                }
              }
            }
          }
        }
      }
    }

    return bestResult;
  };

  const logDetectionAnalysisResult = (result, manualPoints) => {
    if (!result) {
      console.warn('[camera-scanner] Analyseergebnis fehlt.');
      return;
    }

    const summary = {
      manualPoints: manualPoints.length,
      detectedPoints: result.detections.length,
      matched: result.score.matched,
      missed: result.score.missed,
      extras: result.score.extras,
      matchingTolerance: result.tolerance,
      averageDistance: Number.isFinite(result.score.averageDistance)
        ? Number(result.score.averageDistance.toFixed(2))
        : 'n/a',
      averageNearestDistance: Number.isFinite(result.score.averageNearestDistance)
        ? Number(result.score.averageNearestDistance.toFixed(2))
        : 'n/a',
      averageCircularity: Number(result.score.averageCircularity.toFixed(4)),
      averageRatio: Number.isFinite(result.score.averageRatio)
        ? Number(result.score.averageRatio.toFixed(2))
        : 'n/a',
    };

    console.groupCollapsed('[camera-scanner] Scheibenanalyse Parameter');
    console.log('Parameter:', result.params);
    console.log('Zusammenfassung:', summary);
    console.log('Detections (Pixel):', result.detections);
    console.groupEnd();
  };

  function cleanup() {
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
    if (stream)
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
  }

  snapBtn.onclick = async () => {
    try {
      await waitForVideoFrame();
    } catch (error) {
      alert(error.message);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx || canvas.width === 0 || canvas.height === 0) {
      alert('Foto konnte nicht aufgenommen werden. Bitte erneut versuchen.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    video.pause();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    const originalCaptureDataUrl = img.src;
    const sourceImg = document.createElement('img');
    sourceImg.src = originalCaptureDataUrl;
    img.style.width = '100%';
    img.style.maxWidth = previewMaxWidth;
    img.style.maxHeight = isMobileViewport ? '50vh' : '60vh';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '16px';
    img.style.marginTop = '16px';

    if (img.src === 'data:,') {
      alert('Foto konnte nicht verarbeitet werden. Bitte erneut versuchen.');
      return;
    }

    overlay.innerHTML = '';
    overlay.appendChild(img);

    const evalBtn = document.createElement('button');
    evalBtn.textContent = 'Auswertung starten';
    evalBtn.className = 'px-6 py-3 mt-4 bg-primary text-white rounded-xl font-bold';
    evalBtn.style.width = isMobileViewport ? '100%' : 'auto';
    evalBtn.style.maxWidth = previewMaxWidth;
    evalBtn.style.padding = primaryButtonPadding;
    evalBtn.style.fontSize = isMobileViewport ? '16px' : '1rem';
    overlay.appendChild(evalBtn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Schließen';
    closeBtn.className = 'px-4 py-2 mt-2 bg-card-dark text-off-white rounded-xl';
    closeBtn.style.width = isMobileViewport ? '100%' : 'auto';
    closeBtn.style.maxWidth = previewMaxWidth;
    closeBtn.style.padding = secondaryButtonPadding;
    closeBtn.style.fontSize = isMobileViewport ? '15px' : '1rem';
    overlay.appendChild(closeBtn);
    closeBtn.onclick = cleanup;

    evalBtn.onclick = async () => {
      try {
        await waitForImageReady(img);
        await waitForOpenCv();
      } catch (error) {
        alert(error.message);
        return;
      }

      overlay.innerHTML = '';

      const zoomViewport = document.createElement('div');
      zoomViewport.style.width = '100%';
      zoomViewport.style.maxWidth = previewMaxWidth;
      zoomViewport.style.maxHeight = isMobileViewport ? '52vh' : '60vh';
      zoomViewport.style.overflow = 'auto';
      zoomViewport.style.borderRadius = '16px';
      zoomViewport.style.background = 'rgba(0,0,0,0.25)';

      const imageStage = document.createElement('div');
      imageStage.style.position = 'relative';
      imageStage.style.width = '100%';
      imageStage.style.maxWidth = 'none';

      img.style.display = 'block';
      img.style.marginTop = '0';
      img.style.cursor = 'crosshair';
      img.style.width = '100%';
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.style.height = 'auto';
      imageStage.appendChild(img);

      const markerLayer = document.createElement('div');
      markerLayer.style.position = 'absolute';
      markerLayer.style.inset = '0';
      markerLayer.style.pointerEvents = 'none';
      imageStage.appendChild(markerLayer);

      zoomViewport.appendChild(imageStage);

      const hint = document.createElement('p');
      hint.textContent = 'Automatische Treffererkennung mit den zuletzt validierten Parametern.';
      hint.style.color = '#fff';
      hint.style.textAlign = 'center';
      hint.style.maxWidth = previewMaxWidth;
      hint.style.margin = '12px 0 8px';
      hint.style.fontSize = isMobileViewport ? '14px' : '15px';

      const status = document.createElement('div');
      status.style.color = '#cbd5e1';
      status.style.textAlign = 'center';
      status.style.maxWidth = previewMaxWidth;
      status.style.marginBottom = '8px';
      status.style.fontSize = isMobileViewport ? '13px' : '14px';

      const zoomRow = document.createElement('div');
      zoomRow.style.display = 'flex';
      zoomRow.style.alignItems = 'center';
      zoomRow.style.justifyContent = 'center';
      zoomRow.style.gap = '8px';
      zoomRow.style.width = '100%';
      zoomRow.style.maxWidth = previewMaxWidth;

      const zoomOutBtn = document.createElement('button');
      zoomOutBtn.textContent = '-';
      zoomOutBtn.className = 'px-4 py-2 bg-card-dark text-off-white rounded-xl';
      zoomOutBtn.style.padding = secondaryButtonPadding;

      const zoomLabel = document.createElement('span');
      zoomLabel.style.color = '#e2e8f0';
      zoomLabel.style.fontSize = isMobileViewport ? '14px' : '15px';
      zoomLabel.style.minWidth = '90px';
      zoomLabel.style.textAlign = 'center';

      const zoomInBtn = document.createElement('button');
      zoomInBtn.textContent = '+';
      zoomInBtn.className = 'px-4 py-2 bg-card-dark text-off-white rounded-xl';
      zoomInBtn.style.padding = secondaryButtonPadding;

      const zoomResetBtn = document.createElement('button');
      zoomResetBtn.textContent = '100%';
      zoomResetBtn.className = 'px-4 py-2 bg-card-dark text-off-white rounded-xl';
      zoomResetBtn.style.padding = secondaryButtonPadding;

      zoomRow.appendChild(zoomOutBtn);
      zoomRow.appendChild(zoomLabel);
      zoomRow.appendChild(zoomInBtn);
      zoomRow.appendChild(zoomResetBtn);

      const actionRow = document.createElement('div');
      actionRow.style.display = 'flex';
      actionRow.style.flexDirection = isMobileViewport ? 'column' : 'row';
      actionRow.style.gap = '8px';
      actionRow.style.width = '100%';
      actionRow.style.maxWidth = previewMaxWidth;

      const autoDetectBtn = document.createElement('button');
      autoDetectBtn.textContent = 'Automatisch erkennen';
      autoDetectBtn.className = 'px-6 py-3 bg-primary text-white rounded-xl font-bold';
      autoDetectBtn.style.width = isMobileViewport ? '100%' : 'auto';
      autoDetectBtn.style.padding = primaryButtonPadding;

      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Originalbild';
      resetBtn.className = 'px-4 py-2 bg-card-dark text-off-white rounded-xl';
      resetBtn.style.width = isMobileViewport ? '100%' : 'auto';
      resetBtn.style.padding = secondaryButtonPadding;

      actionRow.appendChild(autoDetectBtn);
      actionRow.appendChild(resetBtn);

      overlay.appendChild(zoomViewport);
      overlay.appendChild(hint);
      overlay.appendChild(status);
      overlay.appendChild(zoomRow);
      overlay.appendChild(actionRow);
      overlay.appendChild(closeBtn);

      let threshCanvas = null;
      let zoomLevel = 1;

      const applyZoom = () => {
        imageStage.style.width = `${Math.round(zoomLevel * 100)}%`;
        zoomLabel.textContent = `Zoom ${Math.round(zoomLevel * 100)}%`;
      };

      zoomInBtn.onclick = () => {
        zoomLevel = Math.min(4, zoomLevel + 0.25);
        applyZoom();
      };

      zoomOutBtn.onclick = () => {
        zoomLevel = Math.max(1, zoomLevel - 0.25);
        applyZoom();
      };

      zoomResetBtn.onclick = () => {
        zoomLevel = 1;
        applyZoom();
      };

      applyZoom();

      const updateStatus = (text) => {
        status.textContent = text;
      };

      resetBtn.onclick = () => {
        if (threshCanvas && overlay.contains(threshCanvas)) {
          overlay.removeChild(threshCanvas);
          threshCanvas = null;
        }
        img.src = originalCaptureDataUrl;
        updateStatus('Originalbild wiederhergestellt.');
      };

      closeBtn.onclick = cleanup;
      markerLayer.style.display = 'none';
      img.style.cursor = 'default';
      updateStatus('Bereit für automatische Erkennung.');

      autoDetectBtn.onclick = async () => {
        updateStatus('Automatische Erkennung läuft...');
        autoDetectBtn.disabled = true;
        resetBtn.disabled = true;

        await new Promise((resolve) => window.setTimeout(resolve, 0));

        await waitForImageReady(sourceImg);
        const preparedImage = prepareImageForDetection(sourceImg);

        try {
          const detectionResult = detectHitsWithParams(preparedImage, AUTO_DETECTION_PARAMS, true);
          const selectedDetections = selectAutoDetections(
            detectionResult.detections,
            preparedImage
          );

          logAutoDetectionResult(
            AUTO_DETECTION_PARAMS,
            detectionResult.detections,
            selectedDetections
          );

          if (!threshCanvas) {
            threshCanvas = document.createElement('canvas');
            threshCanvas.style.width = '100%';
            threshCanvas.style.maxWidth = previewMaxWidth;
            threshCanvas.style.maxHeight = isMobileViewport ? '35vh' : '40vh';
            threshCanvas.style.objectFit = 'contain';
            threshCanvas.style.border = '2px solid #0af';
            threshCanvas.style.margin = '8px 0';
            overlay.insertBefore(threshCanvas, hint);
          }

          selectedDetections.forEach((detection) => {
            cv.circle(
              detectionResult.resultImage,
              new cv.Point(detection.cx, detection.cy),
              18,
              [255, 0, 0, 255],
              3
            );
            cv.circle(
              detectionResult.threshPreview,
              new cv.Point(detection.cx, detection.cy),
              6,
              [0, 128, 255, 255],
              -1
            );
          });

          const rejectedCount = Math.max(
            0,
            detectionResult.detections.length - selectedDetections.length
          );
          if (selectedDetections.length === 0) {
            updateStatus('Keine Treffer erkannt. Bitte Licht/Abstand prüfen und erneut versuchen.');
          } else {
            updateStatus(
              `Automatisch erkannt: ${selectedDetections.length}${rejectedCount > 0 ? `, verworfen: ${rejectedCount}` : ''}. ` +
                `block=${AUTO_DETECTION_PARAMS.blockSize}, offset=${AUTO_DETECTION_PARAMS.offset}, area=${AUTO_DETECTION_PARAMS.minArea}-${AUTO_DETECTION_PARAMS.maxArea}, circularity>${AUTO_DETECTION_PARAMS.minCircularity}, ratio<${AUTO_DETECTION_PARAMS.maxRatio}`
            );
          }

          cv.imshow(canvas, detectionResult.resultImage);
          img.src = canvas.toDataURL('image/png');
          cv.imshow(threshCanvas, detectionResult.threshPreview);
          detectionResult.resultImage.delete();
          detectionResult.threshPreview.delete();
        } finally {
          preparedImage.source.delete();
          preparedImage.equalized.delete();
          autoDetectBtn.disabled = false;
          resetBtn.disabled = false;
        }
      };
    };
  };
  cancelBtn.onclick = cleanup;
}

if (typeof window !== 'undefined') {
  window.openCameraAndScan = openCameraAndScan;
}
