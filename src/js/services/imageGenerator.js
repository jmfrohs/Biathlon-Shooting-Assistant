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

function getTargetSvgBase() {
  const targetConstants = getTargetConstants();
  return targetConstants.svg;
}

function generateTargetSvg(shots, seriesIndex = null) {
  let hitMarks = '';
  shots.forEach((shot) => {
    if (shot) {
      const fill_color = shot.hit ? '#228B22' : '#ef4444';
      const opacity = 1;
      const number_fill = shot.ring >= 4 ? 'white' : 'black';
      const text_font_size = shot.ring === 0 ? '7px' : '6px';
      hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="6" class="hit-mark" style="fill: ${fill_color}; opacity: ${opacity};"></circle>`;
      hitMarks += `<text x="${shot.x}" y="${shot.y + 0.5}" class="shot-number" style="fill: ${number_fill}; font-size: ${text_font_size};">${shot.shot}</text>`;
    }
  });
  const svgId = seriesIndex !== null ? `history-svg-${seriesIndex}` : 'biathlon-target';
  const targetSvg = getTargetSvgBase();

  let result = targetSvg.replace(/viewBox="0 0 200 200"/, `viewBox="0 0 200 200" id="${svgId}"`);

  if (result.endsWith('</svg>')) {
    result = result.slice(0, -6);
  }

  return result + hitMarks + `</svg>`;
}

function generateTargetImage(shots) {
  return new Promise((resolve) => {
    try {
      // Verwende die richtige SVG mit Schüssen
      const svgString = generateTargetSvg(shots);

      // Erstelle Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      // Weißer Hintergrund
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Erstelle ein Image Element aus der SVG
      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      img.onload = function () {
        // Zeichne die SVG ins Canvas (skaliert)
        // SVG ist 200x200, Canvas ist 400x400, also 2x größer
        ctx.drawImage(img, 0, 0, 400, 400);
        URL.revokeObjectURL(url);

        // Konvertiere zu JPEG
        const imageData = canvas.toDataURL('image/jpeg', 0.5);
        resolve(imageData);
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        // Fallback: Zeichne Standard-Scheibe in Canvas
        ctx.fillStyle = '#ccc';
        ctx.fillText('Fehler beim Laden der Scheibe', 50, 200);
        const imageData = canvas.toDataURL('image/jpeg', 0.5);
        resolve(imageData);
      };

      // Erstelle SVG mit xmlns Attribut für Blob
      const svgWithNS = svgString.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      img.src = url;
      const blobWithNS = new Blob([svgWithNS], { type: 'image/svg+xml' });
      const urlWithNS = URL.createObjectURL(blobWithNS);
      img.src = urlWithNS;
    } catch (error) {
      console.error('Fehler in generateTargetImage:', error);
      resolve(null);
    }
  });
}

function generateSessionTargetSvg(allSessionShots) {
  let hitMarks = '';
  allSessionShots.forEach((shot) => {
    const fill_color = shot.hit ? '#228B22' : '#ef4444';
    const opacity = 0.7;
    hitMarks += `<circle cx="${shot.x}" cy="${shot.y}" r="5" class="hit-mark" style="fill: ${fill_color}; opacity: ${opacity};"></circle>`;
  });
  const targetSvg = getTargetSvgBase();
  return targetSvg + hitMarks + `</svg>`;
}

function generateHeatmapTargetSvg(allSessionShots) {
  const center = { x: 100, y: 100 };

  let countZone1 = 0;
  let countZone2 = 0;
  let countZone3 = 0;
  let countZone4Total = 0;
  let countZone4TopRight = 0;
  let countZone4BottomRight = 0;
  let countZone4BottomLeft = 0;
  let countZone4TopLeft = 0;

  allSessionShots.forEach((shot) => {
    const dx = shot.x - center.x;
    const dy = shot.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 15) {
      countZone1++;
    } else if (distance <= 30) {
      countZone2++;
    } else if (distance <= 70) {
      countZone3++;
    } else {
      countZone4Total++;
      if (dx > 0 && dy < 0) {
        countZone4TopRight++;
      } else if (dx > 0 && dy > 0) {
        countZone4BottomRight++;
      } else if (dx < 0 && dy > 0) {
        countZone4BottomLeft++;
      } else if (dx < 0 && dy < 0) {
        countZone4TopLeft++;
      }
    }
  });

  const totalShots = allSessionShots.length;
  const percentZone1 = totalShots > 0 ? ((countZone1 / totalShots) * 100).toFixed(0) : 0;
  const percentZone2 = totalShots > 0 ? ((countZone2 / totalShots) * 100).toFixed(0) : 0;
  const percentZone3 = totalShots > 0 ? ((countZone3 / totalShots) * 100).toFixed(0) : 0;
  const percentZone4TopRight =
    totalShots > 0 ? ((countZone4TopRight / totalShots) * 100).toFixed(0) : 0;
  const percentZone4BottomRight =
    totalShots > 0 ? ((countZone4BottomRight / totalShots) * 100).toFixed(0) : 0;
  const percentZone4BottomLeft =
    totalShots > 0 ? ((countZone4BottomLeft / totalShots) * 100).toFixed(0) : 0;
  const percentZone4TopLeft =
    totalShots > 0 ? ((countZone4TopLeft / totalShots) * 100).toFixed(0) : 0;
  const percentZone4Total = totalShots > 0 ? ((countZone4Total / totalShots) * 100).toFixed(0) : 0;

  let zoneSvg = `
    <svg viewBox="0 0 200 200" class="w-full h-full" style="background-color: #f3f4f6; border-radius: 50%;">
      <style>
        .zone-percentage { font-size: 11px; text-anchor: middle; dominant-baseline: central; font-weight: bold; }
        .crosshair-line { stroke: #ffffff; stroke-width: 1px; opacity: 0.9; }
      </style>
  `;

  zoneSvg += `<circle cx="100" cy="100" r="100" fill="#560101" opacity="1"></circle>`;
  zoneSvg += `<circle cx="100" cy="100" r="70" fill="#034286" opacity="1"></circle>`;
  zoneSvg += `<circle cx="100" cy="100" r="30" opacity="1" fill="#226b03" stroke="#ffff" stroke-width="3"></circle>`;
  zoneSvg += `<circle cx="100" cy="100" r="15" fill="#fbbf24"></circle>`;
  zoneSvg += `<line x1="100" y1="0" x2="100" y2="200" class="crosshair-line"></line>`;
  zoneSvg += `<line x1="0" y1="100" x2="200" y2="100" class="crosshair-line"></line>`;

  const positions = [
    { x: 100, y: 100, percent: percentZone1 },
    { x: 100, y: 80, percent: percentZone2 },
    { x: 100, y: 50, percent: percentZone3 },
    { x: 165, y: 40, percent: percentZone4TopRight },
    { x: 165, y: 160, percent: percentZone4BottomRight },
    { x: 35, y: 160, percent: percentZone4BottomLeft },
    { x: 35, y: 40, percent: percentZone4TopLeft },
    { x: 100, y: 15, percent: percentZone4Total },
  ];

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    zoneSvg += `<text x="${pos.x}" y="${pos.y}" class="zone-percentage" style="fill: #000;">${pos.percent}%</text>`;
  }

  zoneSvg += `</svg>`;

  return zoneSvg;
}

function renderShots() {
  const oldMarks = svgTarget.querySelectorAll('.hit-mark, .shot-number');
  oldMarks.forEach((m) => m.remove());
  currentShots.forEach((shot, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', shot.x);
    circle.setAttribute('cy', shot.y);
    circle.setAttribute('r', '5');
    circle.setAttribute('class', 'hit-mark');
    svgTarget.appendChild(circle);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', shot.x);
    text.setAttribute('y', shot.y);
    text.setAttribute('class', 'shot-number');
    text.style.fontSize = '6px';
    text.textContent = index + 1;
    svgTarget.appendChild(text);
  });
}
