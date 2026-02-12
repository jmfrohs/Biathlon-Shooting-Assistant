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
 * Email Service Module
 * Handles email sending via EmailJS with target image generation
 */

class EmailService {
  constructor() {
    this.publicKey = localStorage.getItem('b_emailjs_public_key') || EMAILJS_PUBLIC_KEY_DEFAULT;
    this.serviceId = localStorage.getItem('b_emailjs_service_id') || EMAILJS_SERVICE_ID_DEFAULT;
    this.templateId = localStorage.getItem('b_emailjs_template_id') || EMAILJS_TEMPLATE_ID_DEFAULT;
    this.trainerName = localStorage.getItem('b_trainer_name') || '';
    this.initialize();
  }

  initialize() {
    if (typeof emailjs !== 'undefined' && this.publicKey) {
      emailjs.init(this.publicKey);
    }
  }

  updateCredentials(publicKey, serviceId, templateId) {
    this.publicKey = publicKey;
    this.serviceId = serviceId;
    this.templateId = templateId;
    localStorage.setItem('b_emailjs_public_key', publicKey);
    localStorage.setItem('b_emailjs_service_id', serviceId);
    localStorage.setItem('b_emailjs_template_id', templateId);
    this.initialize();
  }

  updateTrainerName(name) {
    this.trainerName = name;
    localStorage.setItem('b_trainer_name', name);
  }

  getTrainerName() {
    return this.trainerName || 'Trainer';
  }

  /**
   * Convert SVG element to PNG base64
   */
  async svgToPng(svgElement, width = 300, height = 300) {
    return new Promise((resolve, reject) => {
      try {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const pngData = canvas.toDataURL('image/jpeg', 0.7);
          resolve(pngData);
        };
        img.onerror = reject;
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.src = url;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate target image from shots
   */
  async generateTargetImage(shots) {
    try {
      const targetConfig = getTargetConstants();
      const svgString = targetConfig.svg;

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svg = svgDoc.querySelector('svg');

      if (!svg) throw new Error('Failed to parse target SVG');

      svg.setAttribute('width', '300');
      svg.setAttribute('height', '300');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      svg.classList.remove('w-full', 'h-full');

      const shotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(shotsGroup);

      shots.forEach((shot, index) => {
        if (shot && shot.x !== undefined && shot.y !== undefined) {
          const color = shot.hit ? '#32D74B' : '#FF453A';
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', shot.x);
          circle.setAttribute('cy', shot.y);
          circle.setAttribute('r', '6');
          circle.setAttribute('fill', color);
          circle.setAttribute('stroke', '#FFFFFF');
          circle.setAttribute('stroke-width', '1.5');
          g.appendChild(circle);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', shot.x);
          text.setAttribute('y', shot.y + 0.5);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'central');
          text.setAttribute('fill', 'white');
          text.setAttribute('font-size', '7');
          text.setAttribute('font-weight', 'bold');
          text.textContent = index + 1;
          g.appendChild(text);

          shotsGroup.appendChild(g);
        }
      });

      const pngData = await this.svgToPng(svg);
      return pngData;
    } catch (error) {
      return '';
    }
  }

  /**
   * Format shot information for email
   */
  formatShotInfo(shot) {
    if (!shot) return '-';
    const hitText = shot.hit ? t('hit') : t('miss');
    return `${t('ring')} ${shot.ring} (${hitText})`;
  }

  /**
   * Send email for a shooting series
   */
  async sendSeriesEmail(sessionData, seriesData, recipientEmail) {
    if (!this.isConfigured()) {
      throw new Error(t('email_not_configured'));
    }

    if (typeof emailjs === 'undefined') {
      throw new Error(t('emailjs_not_loaded'));
    }
    try {
      const targetImage = await this.generateTargetImage(seriesData.shots);
      const validShots = seriesData.shots.filter((s) => s && s.x !== undefined);
      let corrH = 0,
        corrV = 0;
      if (validShots.length > 0) {
        const avgX = validShots.reduce((sum, s) => sum + s.x, 0) / validShots.length;
        const avgY = validShots.reduce((sum, s) => sum + s.y, 0) / validShots.length;
        const clickRatio = 2.5;
        corrH = Math.round((100 - avgX) / clickRatio);
        corrV = Math.round((100 - avgY) / clickRatio);
      }

      const hDir = corrH > 0 ? t('right_short') : corrH < 0 ? t('left_short') : '';
      const vDir = corrV > 0 ? t('up_short') : corrV < 0 ? t('down_short') : '';
      const corrHText = corrH !== 0 ? `${Math.abs(corrH)} ${hDir}` : t('none');
      const corrVText = corrV !== 0 ? `${Math.abs(corrV)} ${vDir}` : t('none');
      const templateParams = {
        to_email: recipientEmail,
        trainer_name: this.getTrainerName(),
        athlete_name: seriesData.athleteName || t('unknown_athlete'),
        date: new Date(sessionData.date).toLocaleDateString(),
        location: sessionData.location || '',
        position: seriesData.stance || '',
        hits: seriesData.shots.filter((s) => s && s.hit).length,
        total_score: seriesData.shots.reduce((sum, s) => (s ? sum + s.ring : sum), 0),
        corr_h: corrHText,
        corr_v: corrVText,
        shot_1: this.formatShotInfo(seriesData.shots[0]),
        shot_2: this.formatShotInfo(seriesData.shots[1]),
        shot_3: this.formatShotInfo(seriesData.shots[2]),
        shot_4: this.formatShotInfo(seriesData.shots[3]),
        shot_5: this.formatShotInfo(seriesData.shots[4]),
        target_image: targetImage.split(',')[1] || '',
      };
      await emailjs.send(this.serviceId, this.templateId, templateParams);
      return true;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(recipientEmail) {
    if (!this.isConfigured()) {
      throw new Error(t('email_not_configured'));
    }

    if (typeof emailjs === 'undefined') {
      throw new Error(t('emailjs_not_loaded'));
    }

    const testParams = {
      to_email: recipientEmail,
      trainer_name: this.getTrainerName(),
      athlete_name: 'Test Athlet',
      date: new Date().toLocaleDateString(),
      location: 'Test Location',
      position: t('prone'),
      hits: 5,
      total_score: 50,
      corr_h: `2 ${t('right_short')}`,
      corr_v: `1 ${t('up_short')}`,
      shot_1: `${t('ring')} 10 (${t('hit')})`,
      shot_2: `${t('ring')} 10 (${t('hit')})`,
      shot_3: `${t('ring')} 10 (${t('hit')})`,
      shot_4: `${t('ring')} 10 (${t('hit')})`,
      shot_5: `${t('ring')} 10 (${t('hit')})`,
      target_image: '',
    };
    try {
      await emailjs.send(this.serviceId, this.templateId, testParams);
      return true;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured() {
    return !!(this.publicKey && this.serviceId && this.templateId);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      publicKey: this.publicKey,
      serviceId: this.serviceId,
      templateId: this.templateId,
      trainerName: this.trainerName,
    };
  }
}

const emailService = new EmailService();
