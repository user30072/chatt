#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

// Log environment details
console.log('Starting server with Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV);

// Function to test database connection
async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
    return false;
  }
}

// Start the application
async function startApp() {
  // For Railway deployment, start the app immediately, but test DB connection in the background
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('Running in Railway environment - starting app immediately');
    
    // Start the application
    require('./src/index.js');
    
    // Test database connection in the background
    setTimeout(async () => {
      const dbConnected = await testDatabaseConnection();
      if (!dbConnected) {
        console.error('⚠️ Warning: Application is running but database connection failed');
      }
    }, 3000);
    
    return;
  }
  
  // For other environments, check database connection first
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Database connection failed, but starting application anyway');
  }
  
  // Start the application
  console.log('Starting application...');
  require('./src/index.js');
}

// Execute startup
startApp().catch(error => {
  console.error('Startup error:', error);
  
  // In Railway, we should start the app anyway to pass health checks
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('Starting app despite error to pass health checks');
    require('./src/index.js');
  } else {
    process.exit(1);
  }
}); 