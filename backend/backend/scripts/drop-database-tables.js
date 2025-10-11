#!/usr/bin/env node

/**
 * Database Table Drop Script
 * 
 * This script drops all tables in a database.
 * Usage: node drop-database-tables.js [database-name]
 * If no database name is specified, it will use the one from DATABASE_URL.
 * 
 * WARNING: This will permanently delete all data in the database!
 */

require('dotenv').config();
const { execSync } = require('child_process');
const readline = require('readline');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb';

// Parse database URL to extract connection details
const parseDbUrl = (url) => {
  try {
    const pattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const matches = url.match(pattern);
    
    if (!matches) {
      throw new Error('Invalid database URL format');
    }
    
    return {
      user: matches[1],
      password: matches[2],
      host: matches[3],
      port: matches[4],
      database: matches[5]
    };
  } catch (error) {
    console.error('Failed to parse database URL:', error.message);
    process.exit(1);
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Confirm database drop
const confirmDrop = (dbUrl, dbName = null) => {
  return new Promise((resolve, reject) => {
    const dbDetails = parseDbUrl(dbUrl);
    const database = dbName || dbDetails.database;
    
    console.log('\n⚠️  WARNING: You are about to DROP ALL TABLES in the database.');
    console.log('This is a destructive operation and will PERMANENTLY DELETE ALL DATA.');
    console.log('\nTarget database: ' + database);
    console.log('Database host: ' + dbDetails.host);
    
    rl.question('\nType the database name to confirm: ', answer => {
      if (answer === database) {
        rl.question('\nAre you absolutely sure? This cannot be undone! (yes/no): ', answer => {
          if (answer.toLowerCase() === 'yes') {
            resolve();
          } else {
            reject(new Error('Operation cancelled by user'));
          }
        });
      } else {
        reject(new Error('Database name confirmation failed'));
      }
    });
  });
};

// Drop all tables in the database
const dropAllTables = (dbUrl, dbName = null) => {
  try {
    const dbDetails = parseDbUrl(dbUrl);
    const database = dbName || dbDetails.database;
    
    console.log('\nDropping all tables from database...');
    
    // Set environment variables for psql
    const env = { ...process.env };
    env.PGPASSWORD = dbDetails.password;
    
    // SQL to drop all tables
    const dropTablesSQL = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `;
    
    // Execute psql command to drop all tables
    const command = `psql -h ${dbDetails.host} -p ${dbDetails.port} -U ${dbDetails.user} -d ${database} -c "${dropTablesSQL}"`;
    
    const startTime = new Date();
    execSync(command, { 
      env,
      stdio: 'inherit'  // Show output in console
    });
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    console.log(`\n✅ All tables dropped successfully in ${duration.toFixed(2)} seconds`);
    console.log('The database structure is now empty, but the database itself still exists.');
    
  } catch (error) {
    console.error('\n❌ Failed to drop tables:', error.message);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  try {
    const specifiedDbName = process.argv[2];
    
    // Confirm drop operation
    await confirmDrop(DATABASE_URL, specifiedDbName);
    
    // Drop all tables
    dropAllTables(DATABASE_URL, specifiedDbName);
    
    console.log('\nTo restore your database, you can run:');
    console.log('node restore-database.js [backup-file-path]');
    
  } catch (error) {
    console.error(error.message);
  } finally {
    rl.close();
  }
};

// Execute main function
main(); 