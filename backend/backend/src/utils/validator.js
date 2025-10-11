// src/utils/validator.js
const { ValidationError } = require('../middleware/errorHandler');

/**
 * Utility class for common validation functions
 */
class Validator {
  /**
   * Validates an email address format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates a password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with status and message
   */
  static validatePassword(password) {
    if (!password || password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long'
      };
    }

    // Check for mix of character types (recommended pattern)
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUppercase && hasLowercase && (hasNumbers || hasSpecialChar))) {
      return {
        isValid: false,
        message: 'Password must contain uppercase, lowercase, and either numbers or special characters'
      };
    }

    return {
      isValid: true,
      message: 'Password is valid'
    };
  }

  /**
   * Validates that required fields are present
   * @param {Object} data - Object to validate
   * @param {Array<string>} fields - Required field names
   * @throws {ValidationError} - If validation fails
   */
  static validateRequired(data, fields) {
    const missingFields = fields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Validates field types
   * @param {Object} data - Object to validate
   * @param {Object} schema - Schema with field names and expected types
   * @throws {ValidationError} - If validation fails
   */
  static validateTypes(data, schema) {
    const errors = [];

    for (const [field, expectedType] of Object.entries(schema)) {
      if (data[field] !== undefined && data[field] !== null) {
        let isValidType = false;

        switch (expectedType) {
          case 'string':
            isValidType = typeof data[field] === 'string';
            break;
          case 'number':
            isValidType = typeof data[field] === 'number' && !isNaN(data[field]);
            break;
          case 'boolean':
            isValidType = typeof data[field] === 'boolean';
            break;
          case 'array':
            isValidType = Array.isArray(data[field]);
            break;
          case 'object':
            isValidType = typeof data[field] === 'object' && data[field] !== null && !Array.isArray(data[field]);
            break;
          case 'date':
            isValidType = data[field] instanceof Date || !isNaN(Date.parse(data[field]));
            break;
          default:
            isValidType = true; // Skip validation for unknown types
        }

        if (!isValidType) {
          errors.push(`Field '${field}' should be of type '${expectedType}'`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Type validation failed', errors);
    }
  }

  /**
   * Validates API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} - True if valid
   */
  static isValidApiKey(apiKey) {
    // UUID v4 regex pattern
    const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidv4Regex.test(apiKey);
  }

  /**
   * Validates URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = Validator;