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

function calculateRing(x, y, centerX = 100, centerY = 100) {
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= 10) return 8; // Zentrum / Zehnring
  if (distance <= 20) return 7; // Neunring
  if (distance <= 30) return 6; // Achtring
  if (distance <= 40) return 5; // Siebenring
  if (distance <= 50) return 4; // Sechsring
  if (distance <= 60) return 3; // Fünfring
  if (distance <= 80) return 2; // Vierring
  if (distance <= 90) return 1; // Dreiring
  if (distance <= 100) return 0; // Außen / Fehler
  return -1; // Komplett außen
}

function isHit(ring) {
  return ring >= 4;
}
