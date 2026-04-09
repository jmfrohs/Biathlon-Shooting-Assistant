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
 * Email Sender Utility
 * Sends series result emails via SMTP (nodemailer).
 * Configure via environment variables in server/.env:
 *   SMTP_HOST=smtp.example.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false
 *   SMTP_USER=user@example.com
 *   SMTP_PASS=yourpassword
 *   SMTP_FROM="Biathlon Assistant <user@example.com>"
 */

const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER und SMTP_PASS müssen in server/.env konfiguriert sein.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Build a plain-text + HTML email for a single series.
 */
function buildSeriesEmail(series, sessionName, trainerName) {
  const athlete = series.athleteName || 'Unbekannt';
  const stance = series.stance || '–';
  const timestamp = series.timestamp
    ? new Date(series.timestamp).toLocaleString('de-DE')
    : '–';
  const hits = series.stats?.hitCount ?? '–';
  const totalShots = series.stats?.totalShots ?? series.shots?.length ?? 5;
  const avgRing = series.stats?.avgRing ?? '–';
  const rangeTime = series.rangeTime || series.totalTime || '–';

  const corrX = series.clicksX || 0;
  const corrY = series.clicksY || 0;
  const corrXStr = corrX === 0 ? '0' : corrX > 0 ? `+${corrX} rechts` : `${Math.abs(corrX)} links`;
  const corrYStr = corrY === 0 ? '0' : corrY > 0 ? `+${corrY} hoch` : `${Math.abs(corrY)} tief`;

  const shots = series.shots || [];
  const shotsRows = shots
    .map((s, i) => {
      const ring = s.ring !== undefined ? s.ring : '–';
      const hit = s.hit ? '✓ Treffer' : '✗ Fehler';
      const dir = s.direction || '–';
      return `  Schuss ${i + 1}: Ring ${ring} (${hit}), Richtung: ${dir}`;
    })
    .join('\n');

  const shotsHtml = shots
    .map((s, i) => {
      const ring = s.ring !== undefined ? s.ring : '–';
      const hitBadge = s.hit
        ? `<span style="color:#32D74B;font-weight:bold;">✓</span>`
        : `<span style="color:#FF453A;font-weight:bold;">✗</span>`;
      const dir = s.direction || '–';
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #2a2a2e;">${i + 1}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #2a2a2e;">${ring}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #2a2a2e;">${hitBadge} ${s.hit ? 'Treffer' : 'Fehler'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #2a2a2e;">${dir}</td>
      </tr>`;
    })
    .join('');

  const subject = `[Biathlon] ${athlete} – ${stance} – ${hits}/${totalShots} Treffer`;

  const text = [
    `Biathlon Schieß-Assistent`,
    `═══════════════════════════`,
    `Trainer: ${trainerName}`,
    `Sitzung: ${sessionName}`,
    `Athlet:  ${athlete}`,
    `Datum:   ${timestamp}`,
    `Anschlag:${stance}`,
    ``,
    `Ergebnis`,
    `────────────────────────`,
    `Treffer:          ${hits} / ${totalShots}`,
    `Ø Ring:           ${avgRing}`,
    `Schießzeit:       ${rangeTime}`,
    ``,
    `Schüsse`,
    `────────────────────────`,
    shotsRows,
    ``,
    `Korrekturen`,
    `────────────────────────`,
    `Horizontal: ${corrXStr}`,
    `Vertikal:   ${corrYStr}`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#1c1c1e;font-family:Inter,Arial,sans-serif;color:#f2f2f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="padding:32px 24px 16px;">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#636366;">
          Biathlon Schieß-Assistent
        </div>
        <h1 style="margin:8px 0 4px;font-size:22px;font-weight:700;color:#f2f2f7;">
          ${athlete}
        </h1>
        <p style="margin:0;font-size:13px;color:#8e8e93;">
          ${sessionName} &nbsp;·&nbsp; ${timestamp}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 24px 16px;">
        <table width="100%" style="background:#2c2c2e;border-radius:16px;border:1px solid #3a3a3c;overflow:hidden;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #3a3a3c;">
              <span style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#636366;">Anschlag</span>
              <div style="font-size:16px;font-weight:700;margin-top:4px;">${stance}</div>
            </td>
            <td style="padding:16px 20px;border-bottom:1px solid #3a3a3c;">
              <span style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#636366;">Treffer</span>
              <div style="font-size:20px;font-weight:700;margin-top:4px;color:${hits >= totalShots * 0.8 ? '#32D74B' : hits >= totalShots * 0.5 ? '#FFD60A' : '#FF453A'};">
                ${hits} <span style="font-size:14px;color:#636366;">/ ${totalShots}</span>
              </div>
            </td>
            <td style="padding:16px 20px;border-bottom:1px solid #3a3a3c;">
              <span style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#636366;">Ø Ring</span>
              <div style="font-size:16px;font-weight:700;margin-top:4px;">${avgRing}</div>
            </td>
            <td style="padding:16px 20px;border-bottom:1px solid #3a3a3c;">
              <span style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#636366;">Zeit</span>
              <div style="font-size:16px;font-weight:700;margin-top:4px;">${rangeTime}</div>
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="font-size:11px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;color:#636366;">
                  <td style="padding:4px 12px;">#</td>
                  <td style="padding:4px 12px;">Ring</td>
                  <td style="padding:4px 12px;">Ergebnis</td>
                  <td style="padding:4px 12px;">Richtung</td>
                </tr>
                ${shotsHtml}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 24px 16px;">
        <table width="100%" style="background:#2c2c2e;border-radius:16px;border:1px solid #3a3a3c;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:14px 20px;">
              <span style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#636366;">Korrekturen</span>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 14px;">
              <span style="font-size:13px;color:#8e8e93;">Horizontal: </span>
              <span style="font-size:13px;font-weight:600;">${corrXStr}</span>
              &nbsp;&nbsp;
              <span style="font-size:13px;color:#8e8e93;">Vertikal: </span>
              <span style="font-size:13px;font-weight:600;">${corrYStr}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:8px 24px 32px;">
        <p style="margin:0;font-size:11px;color:#48484a;">
          Gesendet von Biathlon Schieß-Assistent &nbsp;·&nbsp; Trainer: ${trainerName}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Send series email to one or more recipients.
 * @param {object} series - The series data object
 * @param {string[]} recipients - Array of email addresses
 * @param {string} sessionName - Name of the session
 * @param {string} trainerName - Name of the trainer/coach
 * @returns {Promise<{sent: number}>}
 */
async function sendSeriesEmail(series, recipients, sessionName, trainerName) {
  if (!recipients || recipients.length === 0) {
    throw new Error('Keine Empfänger angegeben.');
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const { subject, text, html } = buildSeriesEmail(series, sessionName, trainerName);

  await transporter.sendMail({
    from,
    to: recipients.join(', '),
    subject,
    text,
    html,
  });

  return { sent: recipients.length };
}

module.exports = { sendSeriesEmail };
