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

// General API Rate Limiter: Dynamically adjusts limit per user
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: async (req) => {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token && req.cookies) {
      token = req.cookies['b_auth_token'];
    }
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.userId) {
          const { getDb } = require('../db/database');
          const db = getDb();
          const user = db.prepare('SELECT api_limit FROM users WHERE id = ?').get(decoded.userId);
          if (user && user.api_limit !== null && user.api_limit !== undefined) {
            return user.api_limit;
          }
        }
      } catch (err) {
        // Ignore token errors here, fallback to default
      }
    }
    return 100; // Default limit
  },
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

// Demo Rate Limiter: Max 2 attempts per hour
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2,
  message: 'Zu viele Demo-Starts. Bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
  },
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;
    logger.warn(`Rate limit exceeded for demo-start from IP: ${ip}`);
    res.status(429).json({
      error: 'Zu viele Demo-Starts. Bitte versuchen Sie es später erneut.'
    });
  }
});

// Helper to bypass rate limiting in development mode (when NODE_ENV is not 'production')
const devBypassLimit = (limiter) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    return limiter(req, res, next);
  };
};

module.exports = {
  loginLimiter: devBypassLimit(loginLimiter),
  registerLimiter: devBypassLimit(registerLimiter),
  apiLimiter: devBypassLimit(apiLimiter),
  demoLimiter: devBypassLimit(demoLimiter)
};
