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
const PGVECTOR_URL = process.env.PGVECTOR_URL;

// Log environment variables (without sensitive data)
console.log('Environment variables check:');
console.log('DATABASE_URL:', DATABASE_URL ? 'Set' : 'Not set');
console.log('PGVECTOR_URL:', PGVECTOR_URL ? 'Set' : 'Not set');

if (!DATABASE_URL || !PGVECTOR_URL) {
  console.error('ERROR: Both DATABASE_URL and PGVECTOR_URL environment variables are required');
  console.error('Please set these in your Railway service variables');
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

// Function to test database connection
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
      const hostname = new URL(normalizedUrl).hostname;
      console.log(`Attempting to connect to ${hostname}...`);
      await execPromise(`pg_isready -h ${hostname}`);
      connected = true;
      console.log(`${name} database connection established`);
      
      // Test if vector extension is available (only for pgvector service)
      if (name === 'pgvector') {
        console.log('Testing vector extension availability...');
        const result = await execPromise(`psql ${normalizedUrl} -c "SELECT * FROM pg_extension WHERE extname = 'vector';"`);
        if (result.stdout.includes('vector')) {
          console.log('Vector extension is available');
        } else {
          throw new Error('Vector extension is not available in the PgVector service');
        }
      }
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

async function setupVectorIndexes() {
  console.log('Setting up vector indexes for similarity search...');
  
  try {
    // List all tables first
    console.log('Listing all tables before index creation...');
    const listTablesCmd = `psql ${PGVECTOR_URL} -c "\\dt"`;
    const tables = await execPromise(listTablesCmd);
    console.log('Available tables:', tables.stdout);
    
    // First, verify the table exists
    const checkTableCmd = `psql ${PGVECTOR_URL} -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'DocumentChunk');"`;
    const tableExists = await execPromise(checkTableCmd);
    console.log('Table existence check result:', tableExists.stdout);
    
    if (!tableExists.stdout.includes('t')) {
      console.log('DocumentChunk table does not exist yet, skipping index creation');
      return;
    }
    
    // Verify the embedding column exists and is of type vector
    const checkColumnCmd = `psql ${PGVECTOR_URL} -c "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'DocumentChunk';"`;
    const columns = await execPromise(checkColumnCmd);
    console.log('Table columns:', columns.stdout);
    
    const columnExists = await execPromise(`psql ${PGVECTOR_URL} -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'DocumentChunk' AND column_name = 'embedding' AND data_type = 'USER-DEFINED' AND udt_name = 'vector');"`);
    console.log('Column type check result:', columnExists.stdout);
    
    if (!columnExists.stdout.includes('t')) {
      console.log('embedding column is not of type vector, skipping index creation');
      return;
    }
    
    // Create vector index on embedding column if it doesn't exist
    // Use double quotes around the table name to preserve case sensitivity
    const createIndexCmd = `psql ${PGVECTOR_URL} -c "CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON \\"DocumentChunk\\" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"`;
    
    await execPromise(createIndexCmd);
    console.log('Vector indexes created successfully');
  } catch (error) {
    console.error('Failed to set up vector indexes:', error.message);
    // Continue even if this fails, as it's not critical for basic operation
    console.log('Continuing deployment despite vector index creation failure');
  }
}

async function generatePrismaClient() {
  console.log('Generating Prisma client...');
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: PGVECTOR_URL } // Use pgvector URL for client generation
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
      // First, ensure the vector extension is available
      console.log('Ensuring vector extension is available...');
      await execPromise(`psql ${PGVECTOR_URL} -c "CREATE EXTENSION IF NOT EXISTS vector;"`);
      
      // Push the schema without force-reset to preserve existing data
      console.log('Pushing schema changes (preserving existing data)...');
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: PGVECTOR_URL }
      });
      console.log('Database schema synced successfully');
      
      // Wait a moment for the table to be created
      console.log('Waiting for table creation to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // List all tables to verify
      console.log('Listing all tables in the database...');
      const listTablesCmd = `psql ${PGVECTOR_URL} -c "\\dt"`;
      const tables = await execPromise(listTablesCmd);
      console.log('Available tables:', tables.stdout);
      
      // Verify the table was created
      const checkTableCmd = `psql ${PGVECTOR_URL} -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'DocumentChunk');"`;
      const tableExists = await execPromise(checkTableCmd);
      console.log('Table existence check result:', tableExists.stdout);
      
      if (!tableExists.stdout.includes('t')) {
        throw new Error('DocumentChunk table was not created');
      }
      
      console.log('Table creation verified');
      
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
    
    // Test database connection first
    await testDatabaseConnection(PGVECTOR_URL, 'pgvector');
    
    // Ensure vector extension is available
    await ensureVectorExtension();
    
    // Run migration
    await runMigration();
    
    // Setup vector indexes
    await setupVectorIndexes();
    
    // Generate Prisma client
    await generatePrismaClient();
    
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

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  try {
    // Try to connect to the database
    const result = await execPromise(`psql ${PGVECTOR_URL} -c "SELECT 1;"`);
    if (result.stdout.includes('1')) {
      console.log('Database connection successful');
      return true;
    }
    throw new Error('Database connection test failed');
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    throw error;
  }
}

async function ensureVectorExtension() {
  console.log('Ensuring vector extension is available...');
  try {
    // Check if vector extension exists
    const checkExtension = await execPromise(`psql ${PGVECTOR_URL} -c "SELECT * FROM pg_extension WHERE extname = 'vector';"`);
    
    if (!checkExtension.stdout.includes('vector')) {
      console.log('Vector extension not found, attempting to create it...');
      await execPromise(`psql ${PGVECTOR_URL} -c "CREATE EXTENSION IF NOT EXISTS vector;"`);
      console.log('Vector extension created successfully');
    } else {
      console.log('Vector extension already exists');
    }
  } catch (error) {
    console.error('Failed to ensure vector extension:', error.message);
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