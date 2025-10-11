// Simple CORS test server that logs all headers and responds appropriately
const express = require('express');
const cors = require('cors');
const app = express();

// Use comma-separated list of origins
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://chatfront-production-2f1d.up.railway.app';

// Build array of allowed origins from environment variables
let ALLOWED_ORIGINS = Array.from(new Set([
  ...CORS_ORIGIN.split(',').map(origin => origin.trim()),
  FRONTEND_URL
])).filter(Boolean);

// Always allow localhost during development for testing
if (!ALLOWED_ORIGINS.includes('http://localhost:3000')) {
  ALLOWED_ORIGINS.push('http://localhost:3000');
}

console.log('CORS Allowed Origins:', ALLOWED_ORIGINS);

// Configure CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Create the server
const server = express.createServer((req, res) => {
  console.log('\n===== NEW REQUEST =====');
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // Log all request headers for debugging
  console.log('\nRequest Headers:');
  for (const [key, value] of Object.entries(req.headers)) {
    console.log(`${key}: ${value}`);
  }
  
  // Get origin from request headers
  const origin = req.headers.origin;
  console.log(`\nRequest origin: ${origin || 'Not specified'}`);
  console.log(`Checking against allowed origins:`, ALLOWED_ORIGINS);
  
  // Special handling for OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    // For OPTIONS, we need to be permissive
    console.log('\nHandling OPTIONS preflight request');
    
    // Check if the origin is allowed
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      console.log(`Setting Access-Control-Allow-Origin: ${origin}`);
    } else {
      // In development or when not in the list, be permissive
      res.setHeader('Access-Control-Allow-Origin', '*');
      console.log('Setting Access-Control-Allow-Origin: * (wildcard)');
    }
    
    // Set other CORS headers for preflight
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma, Expires, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Log all response headers for debugging
    console.log('\nResponse Headers for OPTIONS:');
    const responseHeaders = res.getHeaderNames();
    for (const header of responseHeaders) {
      console.log(`${header}: ${res.getHeader(header)}`);
    }
    
    // Always return 204 for preflight
    res.statusCode = 204;
    res.end();
    console.log('Sent 204 No Content for OPTIONS preflight');
    return;
  }
  
  // For all other requests, add CORS headers
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`Setting Access-Control-Allow-Origin: ${origin}`);
  } else {
    // For development
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      console.log('Setting Access-Control-Allow-Origin: * (wildcard for development)');
    } else {
      console.log('Origin not allowed in production, not setting CORS headers');
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle health check route for Railway health checks
  if (pathname === '/api/health' || pathname === '/api/health/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cors: {
        configured_origin: CORS_ORIGIN,
        allowed_origins: ALLOWED_ORIGINS
      }
    }));
    console.log('Sent health check response');
    return;
  }
  
  // Handle special routes
  if (pathname === '/api/auth/signup') {
    console.log('\nHandling auth signup request');
    
    if (req.method === 'POST') {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const userData = JSON.parse(body);
          console.log('Signup data received:', userData);
          
          // Simulate successful signup
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          
          // Create a response with the expected structure
          const response = {
            token: 'Bearer mock-token-for-signup',
            user: {
              id: 'mock-user-id',
              email: userData.email || 'test@example.com',
              firstName: userData.firstName || 'Test',
              lastName: userData.lastName || 'User',
              organization: {
                id: 'mock-org-id',
                name: userData.organizationName || 'Test Organization'
              }
            }
          };
          
          console.log('Sending signup response:', response);
          res.end(JSON.stringify(response));
        } catch (error) {
          console.error('Error processing signup data:', error);
          res.statusCode = 400;
          res.end(JSON.stringify({ 
            message: 'Error processing request',
            error: error.message
          }));
        }
      });
      
      return;
    }
  }
  
  if (pathname === '/api/auth/login') {
    console.log('\nHandling auth login request');
    
    if (req.method === 'POST') {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const userData = JSON.parse(body);
          console.log('Login data received:', userData);
          
          // Simulate successful login
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          
          // Create a response with the expected structure
          const response = {
            token: 'Bearer mock-token-for-login',
            user: {
              id: 'mock-user-id',
              email: userData.email || 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              organization: {
                id: 'mock-org-id',
                name: 'Test Organization'
              }
            }
          };
          
          console.log('Sending login response:', response);
          res.end(JSON.stringify(response));
        } catch (error) {
          console.error('Error processing login data:', error);
          res.statusCode = 400;
          res.end(JSON.stringify({ 
            message: 'Error processing request',
            error: error.message
          }));
        }
      });
      
      return;
    }
  }
  
  // Default response for all other endpoints
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  
  const responseBody = {
    success: true,
    timestamp: new Date().toISOString(),
    path: pathname,
    method: req.method,
    environment: process.env.NODE_ENV || 'development',
    cors: {
      configured_origin: CORS_ORIGIN,
      request_origin: origin || 'not specified'
    }
  };
  
  console.log('Sending default response');
  res.end(JSON.stringify(responseBody));
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\nCORS server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'not set (using default)'}`);
  console.log(`\nAPI endpoints available:`);
  console.log(`- GET /api/health (Health check endpoint)`);
  console.log(`- POST /api/auth/signup (Signup endpoint)`);
  console.log(`- POST /api/auth/login (Login endpoint)`);
}); 