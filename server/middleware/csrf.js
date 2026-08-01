const { doubleCsrf } = require('csrf-csrf');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'biathlon-shooting-assistant-secret-key-change-in-production';

const {
  invalidCsrfTokenError,
  generateToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => JWT_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body?._csrf;
  }
});

// Wrapper middleware to skip CSRF for requests without the auth cookie (such as file:// connections using headers)
const csrfProtection = (req, res, next) => {
  const hasAuthCookie = req.cookies && req.cookies['b_auth_token'];
  if (!hasAuthCookie) {
    return next();
  }
  doubleCsrfProtection(req, res, next);
};

// Middleware to inject the CSRF token into locals or response headers
const provideCSRFToken = (req, res, next) => {
  // Generate a token. If the cookie is not set yet, it will set the cookie in res.cookie
  const token = generateToken(req, res);
  res.locals.csrfToken = token;
  next();
};

// Error handler for CSRF errors
const csrfErrorHandler = (err, req, res, next) => {
  if (err === invalidCsrfTokenError || err.code === 'EBADCSRFTOKEN' || err.message === 'csrf validation failed') {
    return res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Ungültiger CSRF Token. Bitte versuchen Sie es erneut.'
    });
  }
  next(err);
};

module.exports = {
  cookieParser,
  csrfProtection,
  provideCSRFToken,
  csrfErrorHandler,
  generateToken
};
