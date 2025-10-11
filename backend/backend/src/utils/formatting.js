// src/utils/formatting.js
/**
 * Utility class for formatting data
 */
class Formatting {
    /**
     * Format a date to ISO string
     * @param {Date|string|number} date - Date to format
     * @returns {string} - Formatted date
     */
    static formatDate(date) {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toISOString();
    }
  
    /**
     * Format a date to a human-readable string
     * @param {Date|string|number} date - Date to format
     * @param {Object} options - Intl.DateTimeFormat options
     * @returns {string} - Formatted date
     */
    static formatDateHuman(date, options = {}) {
      const dateObj = date instanceof Date ? date : new Date(date);
      const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
    }
  
    /**
     * Format a number with thousand separators
     * @param {number} number - Number to format
     * @returns {string} - Formatted number
     */
    static formatNumber(number) {
      return new Intl.NumberFormat().format(number);
    }
  
    /**
     * Format a file size in a human-readable format
     * @param {number} bytes - Size in bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} - Formatted file size
     */
    static formatFileSize(bytes, decimals = 2) {
      if (bytes === 0) return '0 Bytes';
  
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
      const i = Math.floor(Math.log(bytes) / Math.log(k));
  
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
  
    /**
     * Format a duration in milliseconds to a human-readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} - Formatted duration
     */
    static formatDuration(milliseconds) {
      if (milliseconds < 1000) {
        return `${milliseconds}ms`;
      }
      
      const seconds = Math.floor(milliseconds / 1000);
      
      if (seconds < 60) {
        return `${seconds}s`;
      }
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes < 60) {
        return `${minutes}m ${remainingSeconds}s`;
      }
      
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    }
  
    /**
     * Truncate a string to a maximum length
     * @param {string} str - String to truncate
     * @param {number} maxLength - Maximum length
     * @param {string} suffix - Suffix to append if truncated
     * @returns {string} - Truncated string
     */
    static truncateString(str, maxLength = 100, suffix = '...') {
      if (!str || str.length <= maxLength) {
        return str;
      }
      
      return str.substring(0, maxLength - suffix.length) + suffix;
    }
  
    /**
     * Convert an object to a query string
     * @param {Object} params - Parameters object
     * @returns {string} - Query string
     */
    static toQueryString(params) {
      return Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }
  
    /**
     * Parse a query string to an object
     * @param {string} queryString - Query string to parse
     * @returns {Object} - Parsed parameters
     */
    static parseQueryString(queryString) {
      if (!queryString || queryString === '') {
        return {};
      }
      
      const query = queryString.startsWith('?') ? queryString.substring(1) : queryString;
      
      return query.split('&').reduce((params, param) => {
        const [key, value] = param.split('=').map(part => decodeURIComponent(part));
        params[key] = value;
        return params;
      }, {});
    }
  
    /**
     * Format a name (capitalize first letter of each word)
     * @param {string} name - Name to format
     * @returns {string} - Formatted name
     */
    static formatName(name) {
      if (!name) return '';
      
      return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
  }
  
  module.exports = Formatting;