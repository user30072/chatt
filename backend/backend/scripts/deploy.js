#!/usr/bin/env node

/**
 * deploy.js
 * 
 * This script runs during deployment to handle database migrations and setup.
 * It's designed to be run before the main application starts.
 * 
 * Usage:
 *   node scripts/deploy.js
 */

const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const execPromise = promisify(exec);
const DATABASE_URL = process.env.DATABASE_URL;

// Log environment variables (without sensitive data)
console.log('Environment variables check:');
console.log('DATABASE_URL:', DATABASE_URL ? 'Set' : 'Not set');

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  console.error('Please set this in your Railway service variables');
  process.exit(1);
}

// Function to validate and normalize database URL
function normalizeDatabaseUrl(url) {
  if (!url) return null;
  
  // Replace postgres:// with postgresql:// if needed
  if (url.startsWith('postgres://')) {
    url = url.replace('postgres://', 'postgresql://');
  }
  
  // Validate URL format
  try {
    new URL(url);
    return url;
  } catch (error) {
    console.error(`Invalid database URL format: ${url}`);
    return null;
  }
}

// Function to test database connection using Prisma
async function testDatabaseConnection(url, name) {
  console.log(`Testing ${name} database connection...`);
  
  // Normalize the URL
  const normalizedUrl = normalizeDatabaseUrl(url);
  if (!normalizedUrl) {
    throw new Error(`Invalid ${name} database URL format`);
  }
  
  console.log(`Connection URL: ${normalizedUrl.replace(/:([^:@]+)@/, ':****@')}`); // Hide password in logs
  
  let retries = 10;
  let connected = false;
  
  while (retries > 0 && !connected) {
    try {
      // Use Prisma to test connection instead of psql
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: normalizedUrl
          }
        }
      });
      
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      connected = true;
      console.log(`${name} database connection established`);
      
      // Test if vector extension is available (only for pgvector service)
      if (name === 'pgvector') {
        try {
          console.log('Testing vector extension availability...');
          const result = await prisma.$queryRaw`SELECT * FROM pg_extension WHERE extname = 'vector'`;
          if (result && result.length > 0) {
            console.log('Vector extension is available');
          } else {
            console.log('Vector extension is not available, but continuing...');
          }
        } catch (err) {
          console.log('Vector extension check failed, but continuing...');
        }
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.log(`Waiting for ${name} database connection... (${retries} attempts left)`);
      console.log(`Error details: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2 seconds
      retries--;
    }
  }
  
  if (!connected) {
    throw new Error(`Failed to connect to ${name} database after multiple attempts`);
  }
  
  return normalizedUrl;
}

async function setupPineconeIndex() {
  console.log('Setting up Pinecone index for vector similarity search...');
  
  // Check if Pinecone is configured
  if (!process.env.PINECONE_API_KEY) {
    console.log('PINECONE_API_KEY not configured, skipping Pinecone index setup');
    console.log('Pinecone features will be disabled until configured');
    return;
  }
  
  try {
    const pineconeService = require('../src/services/pineconeService');
    
    // Create Pinecone index if it doesn't exist
    const success = await pineconeService.createIndex(1536, 'cosine');
    if (success) {
      console.log('Pinecone index setup completed successfully');
    } else {
      console.log('Pinecone index setup failed, but continuing deployment');
      console.log('Server will start without Pinecone features');
    }
  } catch (error) {
    console.error('Failed to set up Pinecone index:', error.message);
    console.log('Continuing deployment despite Pinecone index creation failure');
    console.log('Server will start without Pinecone features');
    // Don't throw - allow deployment to continue
  }
}

async function generatePrismaClient() {
  console.log('Generating Prisma client...');
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: DATABASE_URL }
    });
    console.log('Prisma client generated successfully');
  } catch (error) {
    console.error('Failed to generate Prisma client:', error.message);
    throw error;
  }
}

async function runMigration() {
  console.log('Starting database migration...');
  
  try {
    // Ensure prisma directory exists
    const prismaDir = path.join(__dirname, '../prisma');
    if (!fs.existsSync(prismaDir)) {
      console.log('Creating prisma directory');
      fs.mkdirSync(prismaDir, { recursive: true });
    }
    
    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(prismaDir, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('Creating migrations directory');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Run Prisma db push to sync schema
    console.log('Syncing database schema...');
    try {
      // Push the schema without force-reset to preserve existing data
      console.log('Pushing schema changes (preserving existing data)...');
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: DATABASE_URL }
      });
      console.log('Database schema synced successfully');
      
      // Wait a moment for the table to be created
      console.log('Waiting for table creation to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the table was created using Prisma
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$connect();
        
        // Check if DocumentChunk table exists
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'DocumentChunk'
          ) as exists;
        `;
        
        await prisma.$disconnect();
        
        if (result && result[0]?.exists) {
          console.log('Table creation verified');
        } else {
          console.log('DocumentChunk table may not exist yet, but continuing...');
        }
      } catch (error) {
        console.log('Table verification skipped:', error.message);
        // Continue even if verification fails
      }
      
    } catch (error) {
      console.error('Error syncing database schema:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('Starting deployment preparation...');
  
  try {
    // Check if running in Railway environment
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('Running in Railway environment, adjusting configurations...');
      // Set PORT for Railway
      process.env.PORT = process.env.PORT || "8080";
      console.log('PORT set to', process.env.PORT);
      
      // Log frontend URL if available
      if (process.env.FRONTEND_URL) {
        console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
      }
    }
    
    // Generate Prisma client first (needed for connection tests)
    await generatePrismaClient();
    
    // Test database connection
    await testDatabaseConnection(DATABASE_URL, 'postgresql');
    
    // Run migration
    await runMigration();
    
    // Setup vector indexes
    await setupPineconeIndex();
    
    console.log('Deployment preparation completed successfully');
    
    // Start the server
    console.log('Starting server...');
    const server = spawn('node', ['index.js'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Handle server process
    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
    
    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      server.kill('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      server.kill('SIGINT');
    });
    
    // Wait for server to exit
    server.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      process.exit(code);
    });
    
  } catch (error) {
    console.error('Deployment preparation failed:', error.message);
    process.exit(1);
  }
}

async function testDatabaseConnectionSimple() {
  console.log('Testing database connection...');
  try {
    // Use Prisma to test connection instead of psql
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    throw error;
  }
}


// Railway deployment script
console.log('Running deployment script...');

// Critical configuration adjustment - set PORT to match Railway's expected port
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('Running in Railway environment, adjusting configurations...');
  
  // If Railway is expecting port 8080, make sure our app uses that port
  process.env.PORT = '8080';
  console.log('PORT set to', process.env.PORT);
  
  // Verify database connection
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set');
  
  // Log important environment variables (excluding sensitive data)
  console.log('Environment configuration:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('- CORS_ORIGIN:', process.env.CORS_ORIGIN);
}

console.log('Deployment script completed');

main(); 