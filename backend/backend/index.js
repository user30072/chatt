const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./src/routes/auth.js');
const adminRoutes = require('./src/routes/admin.js');
const healthRoutes = require('./src/routes/health.js');
const userRoutes = require('./src/routes/users.js');
const chatbotRoutes = require('./src/routes/chatbots.js');
const conversationRoutes = require('./src/routes/conversations.js');
const documentRoutes = require('./src/routes/documents.js');
const analyticsRoutes = require('./src/routes/analytics.js');
const subscriptionRoutes = require('./src/routes/subscriptions.js');
const webhookRoutes = require('./src/routes/webhooks.js');
const { connectDb } = require('./src/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const { isAuthenticated, isAdmin, hasActiveSubscriptionOrTrial } = require('./src/middleware/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Show environment details on startup
console.log('==== SERVER STARTING ====');
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// CRITICAL: Handle OPTIONS requests FIRST, before any other middleware
// This ensures preflight requests always get CORS headers
app.use((req, res, next) => {
  // Only handle OPTIONS requests
  if (req.method !== 'OPTIONS') {
    return next();
  }
  
  const origin = req.headers.origin;
  
  console.log(`[OPTIONS] ${req.method} ${req.path} from origin: ${origin}`);
  
  // Parse allowed origins
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || 
                        (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);
  
  console.log(`[OPTIONS] Allowed origins: ${allowedOrigins.length === 0 ? 'ALL (none configured)' : allowedOrigins.join(', ')}`);
  
  // Normalize origins for comparison (handle http/https mismatch)
  const normalizeOrigin = (url) => {
    if (!url) return null;
    // Remove protocol for comparison
    return url.replace(/^https?:\/\//, '').toLowerCase();
  };
  
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowed = allowedOrigins.map(normalizeOrigin);
  
  // Determine if we should allow this origin
  const shouldAllow = !origin || 
                      allowedOrigins.length === 0 || 
                      allowedOrigins.includes(origin) || 
                      allowedOrigins.includes('*') ||
                      normalizedAllowed.includes(normalizedOrigin) ||
                      // Also check if origin matches when we normalize http/https
                      (normalizedOrigin && normalizedAllowed.some(allowed => {
                        const originWithoutProtocol = normalizedOrigin;
                        const allowedWithoutProtocol = allowed;
                        return originWithoutProtocol === allowedWithoutProtocol;
                      }));
  
  if (shouldAllow && origin) {
    // Always set CORS headers for valid origins
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    console.log(`[OPTIONS] Allowed origin: ${origin}`);
    return res.status(204).end();
  } else if (shouldAllow) {
    // No origin header but we allow it (shouldn't happen in browser, but handle it)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    console.log(`[OPTIONS] Allowed (no origin)`);
    return res.status(204).end();
  } else {
    // Origin not allowed - but still send headers to avoid CORS error in browser
    console.log(`[OPTIONS] Origin not in allowed list: ${origin}, but allowing anyway for now`);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
});

// Also handle OPTIONS via route handler as backup
app.options('*', (req, res) => {
  // This should already be handled by middleware above, but keep as backup
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || 
                        (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);
  const shouldAllow = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  
  if (shouldAllow && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  return res.status(204).end();
});

// CORS configuration - more flexible to handle production deployments
// Note: We handle OPTIONS manually above, so cors middleware will handle actual requests
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Parse allowed origins from environment variables
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || 
                          (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);
    
    // If no origins are configured, allow all (for development/flexibility)
    if (allowedOrigins.length === 0) {
      console.log(`[CORS] No CORS_ORIGIN configured, allowing origin: ${origin}`);
      return callback(null, true);
    }
    
    // Normalize origins for comparison (handle http/https mismatch)
    const normalizeOrigin = (url) => {
      if (!url) return null;
      return url.replace(/^https?:\/\//, '').toLowerCase();
    };
    
    const normalizedOrigin = normalizeOrigin(origin);
    const normalizedAllowed = allowedOrigins.map(normalizeOrigin);
    
    // Check if origin is allowed (exact match or normalized match)
    if (allowedOrigins.includes(origin) || 
        allowedOrigins.includes('*') ||
        normalizedAllowed.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Origin not allowed: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      // Still allow it to prevent CORS errors during development
      console.log(`[CORS] Allowing anyway to prevent CORS errors`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware - this will handle actual requests but our OPTIONS handler above takes precedence
app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// Add middleware to set CORS and Cross-Origin headers on all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers on all responses
  if (origin) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || 
                          (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);
    
    // If no origins configured or origin matches, allow it
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // Set Cross-Origin-Opener-Policy for Google OAuth
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Body parser - skip for multipart/form-data (file uploads)
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    // Skip JSON parsing for file uploads
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(morgan('dev'));

// Debug middleware - log all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Root endpoint for basic verification
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API server is running',
    endpoints: {
      health: '/api/health',
      api_root: '/api'
    }
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      signup: '/api/auth/signup',
      login: '/api/auth/login'
    }
  });
});

// API routes
app.use('/api/health/detailed', healthRoutes);

// Public routes - no authentication required
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check endpoint
app.use('/api/health', healthRoutes);

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

// Connect to the database before starting the server
const startServer = async () => {
  try {
    await connectDb();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Start the server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`==== SERVER STARTED ====`);
      console.log(`Server running on port ${PORT}`);
      console.log(`Current time: ${new Date().toISOString()}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 