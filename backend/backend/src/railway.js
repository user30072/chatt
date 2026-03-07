const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

console.log('Starting Railway deployment server with auth support...');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration with full support
const corsOptions = {
  origin: (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000']),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'Pragma', 
    'Expires', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add explicit OPTIONS handler for preflight requests
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check received at', new Date().toISOString());
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend API running' });
});

// Initialize Prisma if DATABASE_URL is available
let prisma;
try {
  if (process.env.DATABASE_URL) {
    console.log('Initializing Prisma client...');
    prisma = new PrismaClient();
    
    // Connect to database in the background
    setTimeout(async () => {
      try {
        await prisma.$connect();
        console.log('Database connected successfully');
      } catch (error) {
        console.error('Database connection failed:', error.message);
      }
    }, 1000);
  } else {
    console.log('No DATABASE_URL provided, skipping Prisma initialization');
  }
} catch (error) {
  console.error('Error initializing Prisma:', error);
}

// Basic auth routes
// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  console.log('Signup request received:', req.body.email);
  
  try {
    const { email, password, firstName, lastName, username } = req.body;
    
    if (!prisma) {
      return res.status(503).json({
        message: 'Database service unavailable',
        details: 'Prisma client not initialized'
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          username: username || email.split('@')[0],
          is_admin: false
        }
      });
      
      // Create subscription
      await tx.userSubscription.create({
        data: {
          user_id: newUser.id,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      
      return newUser;
    });
    
    // Create JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin,
        isPlatformAdmin: user.is_platform_admin
      },
      process.env.JWT_SECRET || 'fallback-secret-for-development',
      { expiresIn: '1h' }
    );
    
    // Return response
    res.status(201).json({
      token: `Bearer ${token}`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      message: 'Error creating account',
      details: error.message
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('Login request received:', req.body.email);
  
  try {
    const { email, password } = req.body;
    
    if (!prisma) {
      return res.status(503).json({
        message: 'Database service unavailable',
        details: 'Prisma client not initialized'
      });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin,
        isPlatformAdmin: user.is_platform_admin
      },
      process.env.JWT_SECRET || 'fallback-secret-for-development',
      { expiresIn: '1h' }
    );
    
    // Return response
    res.json({
      token: `Bearer ${token}`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        isAdmin: user.is_admin,
        isPlatformAdmin: user.is_platform_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error during login',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Log environment for debugging
console.log('Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (redacted)' : 'Not set'); 