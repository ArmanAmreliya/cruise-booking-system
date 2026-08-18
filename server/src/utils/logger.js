/**
 * Logger Utility — Structured JSON logger for Cruise Booking System.
 * Safe from logging sensitive customer PII (names, emails, phones).
 */

const PII_KEYS = ['name', 'email', 'phone', 'telephone', 'customer'];

/**
 * Sanitizes metadata objects to strip PII before logging.
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (PII_KEYS.some((pii) => lowerKey.includes(pii))) {
      sanitized[key] = '[REDACTED_PII]';
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
};

const formatMessage = (level, event, message, meta) => {
  const logObj = {
    level,
    timestamp: new Date().toISOString(),
    event,
    message,
  };

  if (meta) {
    // Sanitize any metadata to prevent leaks of PII in the application logs
    logObj.meta = sanitizeObject(meta);
  }

  return JSON.stringify(logObj);
};

const logger = {
  info: (event, message, meta) => {
    console.log(formatMessage('info', event, message, meta));
  },
  warn: (event, message, meta) => {
    console.warn(formatMessage('warn', event, message, meta));
  },
  error: (event, message, meta) => {
    console.error(formatMessage('error', event, message, meta));
  },
};

module.exports = logger;
