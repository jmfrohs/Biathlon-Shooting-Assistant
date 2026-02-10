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

const SYSTEM_SCHEIBE_1_SVG = `
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
  </svg>
`;

const SYSTEM_SCHEIBE_2_SVG = `
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
  </svg>
`;

class TargetManager {
  constructor() {
    this.systemTargets = [
      {
        id: 'scheibe1',
        name: 'Scheibe 1 (Standard)',
        svg: SYSTEM_SCHEIBE_1_SVG,
      },
      {
        id: 'scheibe2',
        name: 'Scheibe 2 (Präzision)',
        svg: SYSTEM_SCHEIBE_2_SVG,
      },
    ];

    this.customTargets = this.loadCustomTargets();
  }

  loadCustomTargets() {
    try {
      return JSON.parse(localStorage.getItem('custom_targets')) || [];
    } catch (e) {
      console.error('Failed to load custom targets', e);
      return [];
    }
  }

  saveCustomTargets() {
    localStorage.setItem('custom_targets', JSON.stringify(this.customTargets));
  }

  getAllTargets() {
    return [...this.systemTargets, ...this.customTargets];
  }

  getTargetById(id) {
    return this.getAllTargets().find((t) => t.id === id) || this.systemTargets[0];
  }

  createTarget(name) {
    const newTarget = {
      id: 'custom_' + Date.now(),
      name: name,
      background: '#f3f4f6',
      rings: [
        { r: 100, fill: 'white', stroke: '#000', strokeWidth: 1, text: '1', textColor: 'black' },
        { r: 10, fill: 'black', stroke: 'none', strokeWidth: 0, text: 'X', textColor: 'white' },
      ],
      crosshair: { visible: true, color: '#ef4444', width: 1, opacity: 0.8 },
    };
    this.customTargets.push(newTarget);
    this.saveCustomTargets();
    return newTarget;
  }

  updateTarget(id, updates) {
    const idx = this.customTargets.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.customTargets[idx] = { ...this.customTargets[idx], ...updates };
      this.saveCustomTargets();
      return true;
    }
    return false;
  }

  deleteTarget(id) {
    this.customTargets = this.customTargets.filter((t) => t.id !== id);
    this.saveCustomTargets();

    // If deleted target was selected, revert to default
    if (localStorage.getItem('b_target_type') === id) {
      localStorage.setItem('b_target_type', 'scheibe1');
    }
  }

  generateSvg(targetId) {
    const target = this.getTargetById(targetId);
    return this.generateSvgFromObject(target);
  }

  generateSvgFromObject(target) {
    // Return pre-defined SVG for system targets
    if (target.svg) {
      return target.svg;
    }

    // Generate SVG for custom targets
    let svgContent = '';

    // Styles
    svgContent += `
        <style>
          .ring-number { font-size: 5px; text-anchor: middle; dominant-baseline: central; font-weight: bold; font-family: sans-serif; }
          .crosshair-line { stroke: ${target.crosshair.color}; stroke-width: ${target.crosshair.width}px; opacity: ${target.crosshair.opacity}; }
          .hit-mark { fill: #ef4444; opacity: 0.8; stroke: #FFFFFF; stroke-width: 1.5px; }
          .shot-number { fill: white; font-size: 5px; text-anchor: middle; dominant-baseline: central; }
        </style>
        `;

    // Rings
    // Sort rings by radius descending to ensure correct layering
    // Clone array to avoid mutating the original
    const sortedRings = [...(target.rings || [])].sort((a, b) => b.r - a.r);

    sortedRings.forEach((ring) => {
      svgContent += `<circle cx="100" cy="100" r="${ring.r}" fill="${ring.fill}" stroke="${ring.stroke}" stroke-width="${ring.strokeWidth}"></circle>`;

      if (ring.text && ring.text.trim() !== '') {
        const textR = ring.r - 2.5;
        // Only render text if ring is large enough
        if (textR > 5) {
          svgContent += `<text x="100" y="${100 - textR}" class="ring-number" fill="${ring.textColor}">${ring.text}</text>`;
          svgContent += `<text x="100" y="${100 + textR}" class="ring-number" fill="${ring.textColor}">${ring.text}</text>`;
          svgContent += `<text x="${100 - textR}" y="100" class="ring-number" fill="${ring.textColor}">${ring.text}</text>`;
          svgContent += `<text x="${100 + textR}" y="100" class="ring-number" fill="${ring.textColor}">${ring.text}</text>`;
        }
      }
    });

    // Crosshair
    if (target.crosshair && target.crosshair.visible) {
      svgContent += `
                <line x1="100" y1="0.5" x2="100" y2="199.5" class="crosshair-line"></line>
                <line x1="0.5" y1="100" x2="199.5" y2="100" class="crosshair-line"></line>
             `;
    }

    return `
            <svg viewBox="0 0 200 200" class="w-full h-full" style="background-color: ${target.background || '#f3f4f6'}; border-radius: 50%;">
                ${svgContent}
            </svg>
        `;
  }
}

const targetManager = new TargetManager();
