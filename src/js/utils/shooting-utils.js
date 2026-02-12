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
 * Ported from src-old/js/modules/utils.js
 * Generates a biased angle based on the direction.
 *
 * @param {string} direction - Direction name (e.g., 'top', 'bottom', 'left', 'right', 'right_top', etc.)
 * @returns {number} Angle in radians
 */

function getBiasedAngle(direction) {
  let targetAngle = 0;
  let angleRange = Math.PI / 4;

  const dir = (direction || 'zentrum').toLowerCase().trim();

  if (dir.includes('zentrum') || dir.includes('center') || dir.includes('mitte')) {
    angleRange = 2 * Math.PI;
    targetAngle = 0;
  } else if (dir === 'hoch' || dir === 'oben' || dir === 'top') {
    targetAngle = -Math.PI / 2;
    angleRange = Math.PI / 4;
  } else if (dir === 'tief' || dir === 'unten' || dir === 'bottom' || dir === 'down') {
    targetAngle = Math.PI / 2;
    angleRange = Math.PI / 4;
  } else if (dir === 'links' || dir === 'left') {
    targetAngle = Math.PI;
    angleRange = Math.PI / 4;
  } else if (dir === 'rechts' || dir === 'right') {
    targetAngle = 0;
    angleRange = Math.PI / 4;
  } else if (
    dir.includes('rechts hoch') ||
    dir.includes('right_top') ||
    (dir.includes('right') && dir.includes('up'))
  ) {
    targetAngle = -Math.PI / 4;
    angleRange = Math.PI / 6;
  } else if (
    dir.includes('links hoch') ||
    dir.includes('left_top') ||
    (dir.includes('left') && dir.includes('up'))
  ) {
    targetAngle = (-3 * Math.PI) / 4;
    angleRange = Math.PI / 6;
  } else if (
    dir.includes('links unten') ||
    dir.includes('left_bottom') ||
    (dir.includes('left') && dir.includes('down'))
  ) {
    targetAngle = (3 * Math.PI) / 4;
    angleRange = Math.PI / 6;
  } else if (
    dir.includes('rechts unten') ||
    dir.includes('right_bottom') ||
    (dir.includes('right') && dir.includes('down'))
  ) {
    targetAngle = Math.PI / 4;
    angleRange = Math.PI / 6;
  } else {
    angleRange = 2 * Math.PI;
    targetAngle = 0;
  }

  const minAngle = targetAngle - angleRange / 2;
  const maxAngle = targetAngle + angleRange / 2;
  let angle = Math.random() * (maxAngle - minAngle) + minAngle;

  return angle;
}

/**
 * Calculates a random radius for a specific ring.
 *
 * @param {number} ring - Ring number (0-10)
 * @returns {number} Random radius in SVG units
 */

function getRandomRadiusForRing(ring) {
  let minRadius, maxRadius;

  if (ring === 10) {
    minRadius = 0;
    maxRadius = 10;
  } else if (ring >= 1 && ring <= 9) {
    minRadius = (10 - ring) * 10;
    maxRadius = (11 - ring) * 10;
  } else {
    minRadius = 105;
    maxRadius = 170;
  }

  return Math.random() * (maxRadius - minRadius - 2) + minRadius + 1;
}
