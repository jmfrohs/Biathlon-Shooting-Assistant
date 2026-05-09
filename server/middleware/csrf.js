const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// CSRF protection middleware
// Note: In production, use a session store instead of cookies for CSRF tokens
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Middleware to provide CSRF token to client
const provideCSRFToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

// Error handler for CSRF errors
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  
  // CSRF token errors, set a 403 and forward
  res.status(403).json({
    error: 'CSRF token validation failed',
    message: 'Ungültiger CSRF Token. Bitte versuchen Sie es erneut.'
  });
};

module.exports = {
  cookieParser,
  csrfProtection,
  provideCSRFToken,
  csrfErrorHandler
};
