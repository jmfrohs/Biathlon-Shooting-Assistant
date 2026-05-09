const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10);

// Login Rate Limiter: Max 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  message: 'Zu viele Login-Versuche. Bitte versuchen Sie es später erneut.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    // Use IP address as key
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
  },
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
    logger.warn(`Rate limit exceeded for login from IP: ${ip}`);
    res.status(429).json({
      error: 'Zu viele Login-Versuche. Bitte versuchen Sie es später erneut.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Register Rate Limiter: Max 3 attempts per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
  },
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
    logger.warn(`Rate limit exceeded for registration from IP: ${ip}`);
    res.status(429).json({
      error: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es später erneut.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// General API Rate Limiter: Max 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
  },
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
    logger.warn(`General API rate limit exceeded from IP: ${ip} - ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    });
  }
});

module.exports = {
  loginLimiter,
  registerLimiter,
  apiLimiter
};
