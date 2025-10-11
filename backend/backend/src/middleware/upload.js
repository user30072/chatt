// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ValidationError } = require('./errorHandler');
const config = require('../config/environment');

// Ensure uploads directory exists
const uploadDir = config.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

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
    fileSize: config.MAX_FILE_SIZE // Default 10MB
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