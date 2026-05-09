/**
 * Logging Security & Privacy Utilities
 * Ensures sensitive data is not logged
 */

const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'authorization',
  'jwt',
  'secret',
  'key',
  'api_key',
  'apiKey',
  'creditCard',
  'ssn',
  'passport'
];

/**
 * Remove sensitive data from objects before logging
 * @param {any} data Data to sanitize
 * @param {array} fieldsToRemove Additional fields to remove
 * @returns {any} Sanitized data
 */
function sanitize(data, fieldsToRemove = []) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  const fieldsToCheck = [...SENSITIVE_FIELDS, ...fieldsToRemove];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const sanitizeRecursive = (obj) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        
        // Check if this key is sensitive
        if (fieldsToCheck.some(field => lowerKey.includes(field.toLowerCase()))) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeRecursive(obj[key]);
        }
      }
    }
  };

  sanitizeRecursive(sanitized);
  return sanitized;
}

/**
 * Mask email for logging (e.g., user@example.com → u***@example.com)
 * @param {string} email Email address to mask
 * @returns {string} Masked email
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return email;
  }

  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return email;
  }

  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

/**
 * Mask IP address for privacy (e.g., 192.168.1.100 → 192.168.1.***)
 * @param {string} ip IP address
 * @returns {string} Masked IP
 */
function maskIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return ip;
  }

  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }

  // IPv6
  return ip.substring(0, ip.length - 4) + '****';
}

/**
 * Create a safe log object for sensitive operations
 * @param {string} operation Operation name
 * @param {object} context Context object (will be sanitized)
 * @returns {object} Safe log object
 */
function createSafeLog(operation, context = {}) {
  return {
    operation,
    timestamp: new Date().toISOString(),
    context: sanitize(context)
  };
}

/**
 * Log only non-sensitive request headers
 * @param {object} headers Request headers
 * @returns {object} Safe headers to log
 */
function safedHeaders(headers) {
  const safe = {};
  const allowedHeaders = [
    'host',
    'user-agent',
    'accept',
    'accept-language',
    'accept-encoding',
    'x-forwarded-for',
    'content-type'
  ];

  for (const key in headers) {
    if (allowedHeaders.includes(key.toLowerCase())) {
      safe[key] = headers[key];
    }
  }

  return safe;
}

module.exports = {
  sanitize,
  maskEmail,
  maskIP,
  createSafeLog,
  safedHeaders,
  SENSITIVE_FIELDS
};
