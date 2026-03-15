// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ValidationError } = require('./errorHandler');
const config = require('../config/environment');

// Use memory storage for Railway (ephemeral filesystem)
// Files are stored in memory as Buffer objects
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Check allowed file types
  const allowedFileTypes = ['.pdf', '.txt', '.docx', '.md'];
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(extension)) {
    cb(null, true);
  } else {
    cb(new ValidationError(
      'Invalid file type', 
      [`Only ${allowedFileTypes.join(', ')} files are allowed`]
    ), false);
  }
};

// Create multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  }
});

// Middleware for single file upload
const uploadSingleFile = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError(
              'File too large',
              [`File size should not exceed ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`]
            ));
          }
        }
        return next(err);
      }
      
      // File uploaded successfully
      next();
    });
  };
};

// Middleware for multiple file uploads
const uploadMultipleFiles = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError(
              'File too large',
              [`File size should not exceed ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`]
            ));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError(
              'Too many files',
              [`Maximum ${maxCount} files allowed`]
            ));
          }
        }
        return next(err);
      }
      
      // Files uploaded successfully
      next();
    });
  };
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles
};