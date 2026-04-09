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
 * Email Routes
 * POST /api/email/send-series — Send a series result email to one or more recipients
 */

const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { sendSeriesEmail } = require('../utils/emailSender');

const router = express.Router();
router.use(authenticateToken);

// POST /api/email/send-series
router.post('/send-series', async (req, res) => {
  const { series, sessionName, recipients } = req.body;

  if (!series || typeof series !== 'object') {
    return res.status(400).json({ error: 'series fehlt oder ungültig.' });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients muss ein nicht-leeres Array sein.' });
  }

  // Validate email addresses (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = recipients.filter((r) => typeof r !== 'string' || !emailRegex.test(r));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Ungültige E-Mail-Adresse(n): ${invalid.join(', ')}` });
  }

  // Get trainer name from DB
  let trainerName = 'Trainer';
  try {
    const db = getDb();
    const user = db.prepare('SELECT trainer_name FROM users WHERE id = ?').get(req.user.id);
    if (user && user.trainer_name) trainerName = user.trainer_name;
  } catch {
    // Non-critical – use default
  }

  const name = typeof sessionName === 'string' && sessionName.trim() ? sessionName.trim() : 'Training';

  try {
    const result = await sendSeriesEmail(series, recipients, name, trainerName);
    res.json({ success: true, sent: result.sent });
  } catch (err) {
    console.error('[Email] Fehler beim Versand:', err.message);
    res.status(500).json({ error: err.message || 'Fehler beim E-Mail-Versand.' });
  }
});

module.exports = router;
