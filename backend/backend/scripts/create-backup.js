#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * This script creates a backup of the database.
 * Usage: node create-backup.js [database-name]
 * If no database name is specified, it will use the one from DATABASE_URL.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
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

// Create backup directory if it doesn't exist
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`Creating backup directory: ${BACKUP_DIR}`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

// Format current date for filename
const getFormattedDate = () => {
  const now = new Date();
  return now.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');
};

// Create database backup
const createBackup = (dbUrl, dbName = null) => {
  try {
    ensureBackupDir();
    
    const dbDetails = parseDbUrl(dbUrl);
    const database = dbName || dbDetails.database;
    const timestamp = getFormattedDate();
    const backupFilename = `backup-${database}-${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    console.log(`Creating backup of database '${database}'...`);
    console.log(`Backup file: ${backupPath}`);
    
    // Set environment variables for pg_dump
    const env = { ...process.env };
    env.PGPASSWORD = dbDetails.password;
    
    const startTime = new Date();
    
    // Execute pg_dump command to create backup
    const command = `pg_dump -h ${dbDetails.host} -p ${dbDetails.port} -U ${dbDetails.user} -d ${database} -F p -f "${backupPath}"`;
    
    execSync(command, { 
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeInBytes = stats.size;
    let fileSize;
    
    if (fileSizeInBytes < 1024 * 1024) {
      fileSize = `${(fileSizeInBytes / 1024).toFixed(2)} KB`;
    } else if (fileSizeInBytes < 1024 * 1024 * 1024) {
      fileSize = `${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      fileSize = `${(fileSizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    
    console.log(`\n✅ Backup completed successfully in ${duration.toFixed(2)} seconds`);
    console.log(`File size: ${fileSize}`);
    console.log(`Backup saved to: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    console.error(`\n❌ Failed to create backup: ${error.message}`);
    process.exit(1);
  }
};

// Main function
const main = () => {
  try {
    const specifiedDbName = process.argv[2];
    const backupPath = createBackup(DATABASE_URL, specifiedDbName);
    
    console.log('\nTo restore this backup, run:');
    console.log(`node restore-database.js "${backupPath}"`);
  } catch (error) {
    console.error(error.message);
  }
};

// Execute main function
main(); 