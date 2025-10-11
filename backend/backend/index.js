const express = require('express');
const cors = require('cors');
const http = require('http');
const authRoutes = require('./src/routes/auth.js');
const adminRoutes = require('./src/routes/admin.js');
const healthRoutes = require('./src/routes/health.js');
const { connectDb } = require('./src/db');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Show environment details on startup
console.log('==== SERVER STARTING ====');
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Debug middleware - log all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);
  
  // Add CORS headers to every response
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  next();
});

// Special handler for OPTIONS requests
app.options('*', (req, res) => {
  res.status(204).end();
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

// Critical health check endpoint - mounted at the root level for Railway
app.get('/api/health', (req, res, next) => {
  // Forward to the health routes
  req.url = '/';
  healthRoutes(req, res, next);
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

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

// Catch-all route for other API paths
app.use('/api/*', (req, res) => {
  res.status(200).json({
    message: 'API endpoint not implemented',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

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