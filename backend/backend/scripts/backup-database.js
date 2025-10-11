#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * This script creates a backup of the PostgreSQL database.
 * It uses pg_dump to create a SQL dump file and saves it to
 * the specified backup directory with a timestamp.
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse the DATABASE_URL to get database connection details
const parseDbUrl = (url) => {
  try {
    // Example: postgresql://username:password@hostname:port/database
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    return {
      username: match[1],
      password: match[2],
      host: match[3],
      port: match[4],
      database: match[5]
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error.message);
    process.exit(1);
  }
};

// Create backup directory if it doesn't exist
const createBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`Creating backup directory: ${BACKUP_DIR}`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

// Generate backup filename with timestamp
const getBackupFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `backup-${timestamp}.dump`;
};

// Perform database backup using pg_dump
const backupDatabase = () => {
  try {
    const dbConfig = parseDbUrl(DATABASE_URL);
    const backupPath = path.join(BACKUP_DIR, getBackupFilename());
    
    console.log('Starting database backup...');
    
    // Set environment variables for pg_dump
    const env = {
      PGUSER: dbConfig.username,
      PGPASSWORD: dbConfig.password,
      PGHOST: dbConfig.host,
      PGPORT: dbConfig.port,
      PGDATABASE: dbConfig.database
    };
    
    // Execute pg_dump command
    execSync(`pg_dump -F c -b -v -f "${backupPath}"`, { 
      env: { ...process.env, ...env },
      stdio: 'inherit'
    });
    
    console.log(`Backup completed successfully: ${backupPath}`);
    
    // Clean up old backups (keep last 5)
    cleanupOldBackups();
    
    return backupPath;
  } catch (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
};

// Clean up old backups, keeping only the most recent ones
const cleanupOldBackups = () => {
  try {
    const MAX_BACKUPS = 5; // Keep only the last 5 backups
    
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.dump')))
      .map(file => path.join(BACKUP_DIR, file))
      .map(file => ({ file, mtime: fs.statSync(file).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length > MAX_BACKUPS) {
      console.log(`Cleaning up old backups (keeping last ${MAX_BACKUPS})...`);
      
      files.slice(MAX_BACKUPS).forEach(({ file }) => {
        fs.unlinkSync(file);
        console.log(`Deleted old backup: ${file}`);
      });
    }
  } catch (error) {
    console.error('Failed to clean up old backups:', error.message);
    // Don't exit on cleanup failure
  }
};

// Main execution
createBackupDir();
const backupPath = backupDatabase();

console.log('Backup process completed.'); 