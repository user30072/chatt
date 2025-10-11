const express = require('express');
const router = express.Router();
const { prisma, checkDb } = require('../db');
const os = require('os');

/**
 * @route GET /api/health
 * @desc Health check endpoint with database check
 * @access Public
 */
router.get('/', async (req, res) => {
  // Start with a basic response
  const healthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Service is online',
    environment: process.env.NODE_ENV || 'development',
    server: {
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      free_mem: os.freemem(),
      total_mem: os.totalmem(),
      cpu_load: os.loadavg()
    }
  };

  try {
    // Check database connection
    console.log('Performing database health check...');
    const dbConnected = await checkDb();
    
    healthResponse.database = {
      connected: dbConnected,
      message: dbConnected 
        ? 'Database connection successful' 
        : 'Database connection failed'
    };
    
    // Set appropriate status based on database connection
    if (!dbConnected) {
      healthResponse.status = 'degraded';
      healthResponse.message = 'Service is online but database connection failed';
      return res.status(200).json(healthResponse);
    }
    
    // Service is fully operational
    res.status(200).json(healthResponse);
  } catch (error) {
    console.error('Health check error:', error);
    
    // Return a degraded status but still 200 to avoid failing health checks
    healthResponse.status = 'degraded';
    healthResponse.message = 'Service is online but health check encountered errors';
    healthResponse.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    res.status(200).json(healthResponse);
  }
});

/**
 * @route GET /api/health/detailed
 * @desc Detailed health check with comprehensive diagnostics
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  try {
    // Basic server info
    const healthInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        type: os.type(),
        release: os.release(),
        uptime: os.uptime(),
        free_mem: os.freemem(),
        total_mem: os.totalmem(),
        cpu_load: os.loadavg(),
        cpu_count: os.cpus().length
      }
    };
    
    // Check database connection
    let dbStatus = { 
      connected: false, 
      message: 'Database connection check not performed' 
    };
    
    try {
      // Attempt to execute a simple query to verify database connection
      await prisma.$queryRaw`SELECT 1 as connected`;
      dbStatus = { 
        connected: true, 
        message: 'Successfully connected to database',
        provider: prisma._engineConfig.activeProvider,
        url: maskConnectionString(process.env.DATABASE_URL)
      };
    } catch (dbError) {
      dbStatus = { 
        connected: false, 
        message: dbError.message || 'Failed to connect to database',
        error: process.env.NODE_ENV === 'development' ? dbError.toString() : 'Database connection error'
      };
      healthInfo.status = 'degraded';
    }
    
    healthInfo.database = dbStatus;
    
    // Return health information
    res.status(200).json(healthInfo);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function to mask database connection string for security
function maskConnectionString(connectionString) {
  if (!connectionString) return 'Not provided';
  
  try {
    // Extract just the domain/host part for safety
    const urlParts = connectionString.split('@');
    if (urlParts.length > 1) {
      const hostPart = urlParts[1].split('/')[0];
      return `Connected to: ${hostPart}`;
    }
    return 'Connection string found but format not recognized';
  } catch (err) {
    return 'Connection string found but could not be parsed';
  }
}

module.exports = router; 