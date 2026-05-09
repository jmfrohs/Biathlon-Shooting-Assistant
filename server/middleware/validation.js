const { body, validationResult } = require('express-validator');

/**
 * Validation rules for user registration
 */
const registerValidationRules = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Passwort muss Großbuchstaben, Kleinbuchstaben und Zahlen enthalten'),
  body('trainerName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name darf nicht länger als 100 Zeichen sein'),
  body('role')
    .optional()
    .isIn(['coach', 'athlete', 'admin'])
    .withMessage('Ungültige Rolle')
];

/**
 * Validation rules for login
 */
const loginValidationRules = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  body('password')
    .notEmpty()
    .withMessage('Passwort ist erforderlich')
];

/**
 * Validation rules for password change
 */
const passwordChangeValidationRules = () => [
  body('currentPassword')
    .notEmpty()
    .withMessage('Aktuelles Passwort ist erforderlich'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Neues Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Neues Passwort muss Großbuchstaben, Kleinbuchstaben und Zahlen enthalten')
];

/**
 * Middleware to handle validation errors
 */
const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validierungsfehler',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  registerValidationRules,
  loginValidationRules,
  passwordChangeValidationRules,
  validationErrorHandler
};
