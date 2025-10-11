// src/utils/storage.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/environment');

/**
 * Utility class for file storage operations
 */
class Storage {
  constructor() {
    this.uploadsDir = config.UPLOAD_DIR || './uploads';
    this.ensureDirectoryExists(this.uploadsDir);
  }

  /**
   * Ensure a directory exists
   * @param {string} dirPath - Directory path
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate a unique filename
   * @param {string} originalFilename - Original filename
   * @returns {string} - Unique filename
   */
  generateUniqueFilename(originalFilename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    const sanitizedName = path.basename(originalFilename, extension)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();
    
    return `${sanitizedName}-${timestamp}-${randomString}${extension}`;
  }

  /**
   * Save a file to storage
   * @param {Buffer|string} fileData - File data (Buffer) or file path (string)
   * @param {string} filename - Original filename
   * @param {string} subDirectory - Optional subdirectory
   * @returns {Object} - Saved file info
   */
  saveFile(fileData, filename, subDirectory = '') {
    const uniqueFilename = this.generateUniqueFilename(filename);
    
    // Create subdirectory if specified
    let savePath = this.uploadsDir;
    if (subDirectory) {
      savePath = path.join(savePath, subDirectory);
      this.ensureDirectoryExists(savePath);
    }
    
    const filePath = path.join(savePath, uniqueFilename);
    const fileUrl = path.join('/uploads', subDirectory, uniqueFilename)
      .replace(/\\/g, '/'); // Convert Windows backslashes to forward slashes for URLs
    
    // Save the file
    if (Buffer.isBuffer(fileData)) {
      fs.writeFileSync(filePath, fileData);
    } else if (typeof fileData === 'string') {
      // Assume it's a temporary file path
      fs.copyFileSync(fileData, filePath);
    } else {
      throw new Error('Invalid file data format');
    }
    
    return {
      filename: uniqueFilename,
      originalFilename: filename,
      path: filePath,
      url: fileUrl,
      size: fs.statSync(filePath).size,
      type: this.getFileType(filename)
    };
  }

  /**
   * Get file type from filename
   * @param {string} filename - Filename
   * @returns {string} - File type
   */
  getFileType(filename) {
    const extension = path.extname(filename).toLowerCase().substring(1);
    
    // Map common extensions to MIME types
    const mimeTypes = {
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'csv': 'text/csv',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'json': 'application/json',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Delete a file from storage
   * @param {string} fileUrl - File URL or path
   * @returns {boolean} - True if deletion was successful
   */
  deleteFile(fileUrl) {
    try {
      // Convert URL to file path
      const relativePath = fileUrl.startsWith('/uploads')
        ? fileUrl.substring('/uploads'.length)
        : fileUrl;
      
      const filePath = path.join(this.uploadsDir, relativePath);
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Read a file from storage
   * @param {string} fileUrl - File URL or path
   * @returns {Buffer|null} - File content as Buffer or null if not found
   */
  readFile(fileUrl) {
    try {
      // Convert URL to file path
      const relativePath = fileUrl.startsWith('/uploads')
        ? fileUrl.substring('/uploads'.length)
        : fileUrl;
      
      const filePath = path.join(this.uploadsDir, relativePath);
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
      
      return null;
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }

  /**
   * Get file information
   * @param {string} fileUrl - File URL or path
   * @returns {Object|null} - File information or null if not found
   */
  getFileInfo(fileUrl) {
    try {
      // Convert URL to file path
      const relativePath = fileUrl.startsWith('/uploads')
        ? fileUrl.substring('/uploads'.length)
        : fileUrl;
      
      const filePath = path.join(this.uploadsDir, relativePath);
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const filename = path.basename(filePath);
        
        return {
          filename,
          path: filePath,
          url: fileUrl,
          size: stats.size,
          type: this.getFileType(filename),
          created: stats.birthtime,
          modified: stats.mtime
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }
}

module.exports = new Storage();