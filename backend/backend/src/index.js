const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { connectDb } = require('./db');

// Import error handler
const { errorHandler } = require('./middleware/errorHandler');

// Import auth middleware
const { isAuthenticated, isAdmin, hasPaymentMethod, hasActiveSubscriptionOrTrial } = require('./middleware/auth');

// Initialize Prisma client
let prisma;
try {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set. Database operations will fail.');
    // Don't exit in Railway environment
    if (!process.env.RAILWAY_ENVIRONMENT && process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  } else {
    console.log('Database URL is set. Format:', 
      process.env.DATABASE_URL.substring(0, process.env.DATABASE_URL.indexOf('://') + 3) + 
      '********');
  }
  
  prisma = new PrismaClient({
    errorFormat: 'minimal',
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  global.prisma = prisma;

  // Test connection
  const testConnection = async () => {
    try {
      await prisma.$connect();
      console.log('Successfully connected to database');
    } catch (error) {
      console.error('Failed to connect to database:', error.message);
      // Don't exit in Railway environment
      if (!process.env.RAILWAY_ENVIRONMENT && process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  };
  
  // For Railway, test connection in the background
  if (process.env.RAILWAY_ENVIRONMENT) {
    setTimeout(testConnection, 1000);
  } else {
    testConnection();
  }

  // Map model names for consistency (for legacy code references)
  global.prisma.apiUsage = prisma.apiUsage;
  global.prisma.api_usage = prisma.apiUsage;
} catch (error) {
  console.error('ERROR: Failed to initialize Prisma client:', error);
  // Don't exit in Railway environment
  if (!process.env.RAILWAY_ENVIRONMENT && process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Initialize Express app
const app = express();

// Set up CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// Add middleware to set Cross-Origin-Opener-Policy header for Google OAuth
app.use((req, res, next) => {
  // Allow popups for Google OAuth postMessage communication
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Add explicit handling for preflight requests
app.options('*', cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add the health check as the VERY FIRST route, before any middleware that could cause issues
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Service is online'
  });
});

// Root path should also respond
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend API running' });
});

// Now include the other middleware
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Define a basic user router in case of import issues
const userRouter = express.Router();
userRouter.get('/', (req, res) => res.json({ message: 'Users API' }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatbotRoutes = require('./routes/chatbots');
const conversationRoutes = require('./routes/conversations');
const documentRoutes = require('./routes/documents');
const analyticsRoutes = require('./routes/analytics');
const subscriptionRoutes = require('./routes/subscriptions');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');
// Organization routes removed - using user-based permissions instead

// Import admin routes if available
let adminRoutes;
try {
  adminRoutes = require('./routes/admin');
} catch (error) {
  console.error('Error loading admin routes:', error);
  adminRoutes = express.Router();
}

// API routes
app.use('/api/health/detailed', healthRoutes);

// Public routes - no authentication required
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// Semi-protected routes - require authentication but no payment method
app.use('/api/users', isAuthenticated, userRoutes);
app.use('/api/subscriptions', isAuthenticated, subscriptionRoutes);

// Protected routes - requiring authentication + payment method
app.use('/api/chatbots', (req, res, next) => {
  console.log(`[ROUTE] /api/chatbots matched: ${req.method} ${req.path}`);
  console.log(`[ROUTE] Auth header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  next();
}, isAuthenticated, chatbotRoutes);
app.use('/api/conversations', isAuthenticated, hasActiveSubscriptionOrTrial, conversationRoutes);
app.use('/api/documents', isAuthenticated, hasActiveSubscriptionOrTrial, documentRoutes);
app.use('/api/analytics', isAuthenticated, hasActiveSubscriptionOrTrial, analyticsRoutes);

// Special route for Stripe webhooks - needs to be before body parser
app.use('/api/subscriptions/webhook', subscriptionRoutes);

// Admin routes - requiring authentication + admin role
app.use('/api/admin', isAuthenticated, isAdmin, adminRoutes);

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  console.error(`API endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: 'API endpoint not implemented',
    path: req.originalUrl,
    method: req.method,
    info: 'If you are a user seeing this error, please contact support. If you are a developer, check your API route configuration.'
  });
});

// Global error handler
app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Connect to the database
    await connectDb();
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
