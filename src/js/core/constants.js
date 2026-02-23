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

const SCHEIBE_1_NAME = 'Scheibe 1 (Default)';
const SCHEIBE_1_SVG = `
  <svg viewBox="0 0 200 200" class="w-full h-full" style="background-color: #f3f4f6; border-radius: 50%;">
    <style>
      .ring-number-white { font-size: 4px; fill: white; text-anchor: middle; dominant-baseline: central; }
      .ring-number-black { font-size: 4px; fill: #000; text-anchor: middle; dominant-baseline: central; }
      .hit-mark { fill: #ef4444; opacity: 0.8; stroke: #FFFFFF; stroke-width: 1.5px; }
      .miss-mark { fill: #3b82f6; opacity: 0.6; stroke: #FFFFFF; stroke-width: 1.5px; }
      .shot-number { fill: white; font-size: 5px; text-anchor: middle; dominant-baseline: central; }
    </style>
    <circle cx="100" cy="100" r="100" fill="white" stroke="#000"></circle>
    <text x="195" y="100" class="ring-number-black" text-anchor="end">1</text>
    <text x="5" y="100" class="ring-number-black" text-anchor="start">1</text>
    <text x="100" y="5" class="ring-number-black">1</text>
    <text x="100" y="195" class="ring-number-black">1</text>

    <circle cx="100" cy="100" r="90" fill="white" stroke="#000"></circle>
    <text x="185" y="100" class="ring-number-black" text-anchor="end">2</text>
    <text x="15" y="100" class="ring-number-black" text-anchor="start">2</text>
    <text x="100" y="15" class="ring-number-black">2</text>
    <text x="100" y="185" class="ring-number-black">2</text>

    <circle cx="100" cy="100" r="80" fill="white" stroke="#000"></circle>
    <text x="175" y="100" class="ring-number-black" text-anchor="end">3</text>
    <text x="25" y="100" class="ring-number-black" text-anchor="start">3</text>
    <text x="100" y="25" class="ring-number-black">3</text>
    <text x="100" y="175" class="ring-number-black">3</text>

    <circle cx="100" cy="100" r="70" fill="#000" stroke="white"></circle>
    <text x="165" y="100" class="ring-number-white" text-anchor="end">4</text>
    <text x="35" y="100" class="ring-number-white" text-anchor="start">4</text>
    <text x="100" y="35" class="ring-number-white">4</text>
    <text x="100" y="165" class="ring-number-white">4</text>

    <circle cx="100" cy="100" r="60" fill="#000" stroke="white"></circle>
    <text x="155" y="100" class="ring-number-white" text-anchor="end">5</text>
    <text x="45" y="100" class="ring-number-white" text-anchor="start">5</text>
    <text x="100" y="45" class="ring-number-white">5</text>
    <text x="100" y="155" class="ring-number-white">5</text>

    <circle cx="100" cy="100" r="50" fill="#000" stroke="white"></circle>
    <text x="145" y="100" class="ring-number-white" text-anchor="end">6</text>
    <text x="55" y="100" class="ring-number-white" text-anchor="start">6</text>
    <text x="100" y="55" class="ring-number-white">6</text>
    <text x="100" y="145" class="ring-number-white">6</text>

    <circle cx="100" cy="100" r="40" fill="#000" stroke="white"></circle>
    <text x="135" y="100" class="ring-number-white" text-anchor="end">7</text>
    <text x="65" y="100" class="ring-number-white" text-anchor="start">7</text>
    <text x="100" y="65" class="ring-number-white">7</text>
    <text x="100" y="135" class="ring-number-white">7</text>

    <circle cx="100" cy="100" r="30" fill="#000" stroke="white" stroke-width="3"></circle>
    <text x="125" y="100" class="ring-number-white" text-anchor="end">8</text>
    <text x="75" y="100" class="ring-number-white" text-anchor="start">8</text>
    <text x="100" y="75" class="ring-number-white">8</text>
    <text x="100" y="125" class="ring-number-white">8</text>

    <circle cx="100" cy="100" r="20" fill="#000" stroke="white"></circle>
    <circle cx="100" cy="100" r="10" fill="#000" stroke="white"></circle>
    <circle cx="100" cy="100" r="2" fill="white" stroke="none"></circle>
`;
const SCHEIBE_2_NAME = 'Scheibe 2';
const SCHEIBE_2_SVG = `
  <svg viewBox="0 0 200 200" class="w-full h-full" style="background-color: #f3f4f6; border-radius: 50%;">
    <style>
      .ring-number-white { font-size: 4px; fill: white; text-anchor: middle; dominant-baseline: central; }
      .ring-number-black { font-size: 4px; fill: #000; text-anchor: middle; dominant-baseline: central; }
      .hit-mark { fill: #ef4444; opacity: 0.8; stroke: #FFFFFF; stroke-width: 1.5px; }
      .miss-mark { fill: #3b82f6; opacity: 0.6; stroke: #FFFFFF; stroke-width: 1.5px; }
      .shot-number { fill: white; font-size: 5px; text-anchor: middle; dominant-baseline: central; }
      .crosshair-line { stroke: #000000; stroke-width: 3px; opacity: 1.0; }
    </style>
    <circle cx="100" cy="100" r="100" fill="white" stroke="#000" stroke-width="2"></circle>

    <circle cx="100" cy="100" r="70" fill="#000" stroke="white" stroke-width="1"></circle>
    <circle cx="100" cy="100" r="50" fill="#000" stroke="white" stroke-width="1"></circle>
    <circle cx="100" cy="100" r="30" fill="#000" stroke="white" stroke-width="3"></circle>
    <circle cx="100" cy="100" r="15" fill="#000" stroke="white" stroke-width="1"></circle>
    <circle cx="100" cy="100" r="7.5" fill="#000" stroke="white" stroke-width="1"></circle>

    <line x1="100" y1="0" x2="100" y2="200" class="crosshair-line"></line>
    <line x1="0" y1="100" x2="200" y2="100" class="crosshair-line"></line>
`;
const NumberMap = {
  eins: '1',
  zwei: '2',
  drei: '3',
  vier: '4',
  fünf: '5',
  sechs: '6',
  sieben: '7',
  acht: '8',
  neun: '9',
  zehn: '10',
  null: '0',
  fehler: '0',
  X: '10',
};
const numberPattern =
  '(?:\\b(10|[0-9])\\b|\\b(zehn|neun|acht|sieben|sechs|fünf|vier|drei|zwei|eins|null|fehler)\\b)';
const directionPattern =
  '(?:\\s+(?:und)?\\s*(hoch\\s+links|hoch\\s+rechts|unten\\s+links|unten\\s+rechts|oben\\s+links|oben\\s+rechts|tief\\s+links|tief\\s+rechts|links|rechts|oben|hoch|unten|tief|zentrum|mitte))?';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const EMAILJS_PUBLIC_KEY_DEFAULT = 'Wj5cO9CPcDl-gLArc';
const EMAILJS_SERVICE_ID_DEFAULT = 'service_ui10vh8';
const EMAILJS_TEMPLATE_ID_DEFAULT = 'template_75id7pc';
const EMAILJS_ENABLED = true;

function getTargetConstants() {
  const type = localStorage.getItem('b_target_type') || 'scheibe1';
  if (typeof targetManager !== 'undefined') {
    const target = targetManager.getTargetById(type);
    return {
      svg: targetManager.generateSvg(type),
      name: target ? target.name : 'Unknown Target',
    };
  }
  return {
    svg: type === 'scheibe2' ? SCHEIBE_2_SVG : SCHEIBE_1_SVG,
    name: type === 'scheibe2' ? SCHEIBE_2_NAME : SCHEIBE_1_NAME,
  };
}

function getShotSize() {
  return parseFloat(localStorage.getItem('b_shot_size')) || 6;
}

function getHitColor() {
  return localStorage.getItem('b_hit_color') || '#32D74B';
}

function getHitLabelColor() {
  return localStorage.getItem('b_hit_label_color') || '#FFFFFF';
}

function getMissColor() {
  return localStorage.getItem('b_miss_color') || '#FF453A';
}

function getMissLabelColor() {
  return localStorage.getItem('b_miss_label_color') || '#FFFFFF';
}

function getGhostShotColor() {
  return localStorage.getItem('b_ghost_shot_color') || '#007AFF';
}

function getGhostLabelColor() {
  return localStorage.getItem('b_ghost_label_color') || '#FFFFFF';
}

function getShotLabelContent() {
  return localStorage.getItem('b_shot_label_content') || 'number';
}

function getClickValue(athlete) {
  if (athlete && athlete.clickValue) {
    return parseFloat(athlete.clickValue);
  }
  return parseFloat(localStorage.getItem('b_click_value') || '6.0');
}

function getAutoSaveEnabled() {
  return localStorage.getItem('b_auto_save_enabled') === 'true';
}
