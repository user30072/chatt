// src/middleware/errorHandler.js

/**
 * Custom error class for validation errors
 */
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

/**
 * Custom error class for not found errors
 */
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Custom error class for forbidden errors
 */
class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);
  
  // Format detailed error message for logging
  const errorDetails = {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  };
  
  // Log complete error details
  console.error('Detailed error info:', JSON.stringify(errorDetails, null, 2));
  
  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError' || 
      err.name === 'PrismaClientUnknownRequestError' || 
      err.name === 'PrismaClientRustPanicError' || 
      err.name === 'PrismaClientInitializationError' || 
      err.name === 'PrismaClientValidationError') {
    
    console.error('Database Error:', err.message);
    
    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while accessing the database. Please try again later.'
    });
  }
  
  // JWT authentication errors
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Authentication error', 
      message: 'Invalid or expired token'
    });
  }
  
  // Handle custom errors
  if (err instanceof ValidationError || err instanceof NotFoundError || err instanceof ForbiddenError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(err.errors && { errors: err.errors })
    });
  }
  
  // Default error response
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  errorHandler
};