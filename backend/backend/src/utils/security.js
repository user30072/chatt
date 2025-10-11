// src/utils/security.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { UnauthorizedError } = require('../middleware/errorHandler');

/**
 * Utility class for security-related functions
 */
class Security {
  /**
   * Generate a random token
   * @param {number} bytes - Number of bytes for the token
   * @returns {string} - Random token
   */
  static generateRandomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hash a password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare a password with a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if password matches hash
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration time
   * @returns {string} - JWT token
   */
  static generateJwtToken(payload, expiresIn = config.JWT_EXPIRY) {
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   * @throws {UnauthorizedError} - If token is invalid
   */
  static verifyJwtToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * Generate a secure API key
   * @returns {string} - API key in UUID format
   */
  static generateApiKey() {
    return crypto.randomUUID();
  }

  /**
   * Hash a value with a specific algorithm
   * @param {string} value - Value to hash
   * @param {string} algorithm - Hash algorithm (e.g., 'sha256')
   * @returns {string} - Hashed value
   */
  static hash(value, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(value).digest('hex');
  }

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key (must be 32 bytes for aes-256-gcm)
   * @returns {Object} - Encrypted data with iv and tag
   */
  static encrypt(data, key) {
    if (!key || Buffer.from(key, 'hex').length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    return {
      iv: iv.toString('hex'),
      encrypted,
      tag
    };
  }

  /**
   * Decrypt data
   * @param {Object} data - Encrypted data object with iv, encrypted, and tag
   * @param {string} key - Encryption key (must be 32 bytes for aes-256-gcm)
   * @returns {string} - Decrypted data
   */
  static decrypt(data, key) {
    if (!key || Buffer.from(key, 'hex').length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Sanitize HTML content
   * @param {string} html - HTML content to sanitize
   * @returns {string} - Sanitized HTML
   */
  static sanitizeHtml(html) {
    // A very basic sanitizer - in production, use a library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '');
  }
}

module.exports = Security;