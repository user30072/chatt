#!/usr/bin/env node

/**
 * List Database Backups Script
 * 
 * This script lists all available database backups with detailed information
 * about each backup file including creation date, size, and database name.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

// Check if backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  console.error(`Backup directory does not exist: ${BACKUP_DIR}`);
  console.log('No backups found.');
  process.exit(0);
}

// Get information about a backup file
const getBackupInfo = (file) => {
  const filePath = path.join(BACKUP_DIR, file);
  const stats = fs.statSync(filePath);
  
  // Extract database name from filename (assuming format: backup-dbname-date.sql)
  const filenameParts = file.replace('backup-', '').replace('.sql', '').split('-');
  const dbNameEndIndex = filenameParts.findIndex(part => part.includes('20')); // Find date part starting with year
  const dbName = filenameParts.slice(0, dbNameEndIndex).join('-');
  
  // Format file size
  const sizeInBytes = stats.size;
  let formattedSize;
  if (sizeInBytes < 1024) {
    formattedSize = `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    formattedSize = `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  return {
    filename: file,
    database: dbName,
    created: stats.mtime,
    size: formattedSize,
    bytes: sizeInBytes,
    path: filePath
  };
};

// Get PostgreSQL version info for reference
const getPgVersion = () => {
  try {
    return execSync('pg_dump --version').toString().trim();
  } catch (error) {
    return 'PostgreSQL tools not found or not in PATH';
  }
};

// List all backup files
const listBackups = () => {
  try {
    // Get all backup files
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'));
    
    if (files.length === 0) {
      console.log('No backup files found.');
      return;
    }
    
    // Get information about each backup
    const backups = files.map(getBackupInfo)
      .sort((a, b) => b.created - a.created); // Sort by date (newest first)
    
    // Calculate total size
    const totalBytes = backups.reduce((sum, backup) => sum + backup.bytes, 0);
    let totalSize;
    if (totalBytes < 1024 * 1024) {
      totalSize = `${(totalBytes / 1024).toFixed(2)} KB`;
    } else if (totalBytes < 1024 * 1024 * 1024) {
      totalSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      totalSize = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    
    // Display backup information
    console.log(`\nAvailable Database Backups (${backups.length}):`);
    console.log(`Location: ${BACKUP_DIR}`);
    console.log(`Total size: ${totalSize}`);
    console.log(`PostgreSQL: ${getPgVersion()}`);
    console.log('\n' + '-'.repeat(100));
    console.log('  #  | Database          | Created                    | Size       | Filename');
    console.log('-'.repeat(100));
    
    backups.forEach((backup, index) => {
      const date = backup.created.toISOString().replace('T', ' ').substr(0, 19);
      console.log(
        `  ${(index + 1).toString().padEnd(2)} | ` +
        `${backup.database.padEnd(18)} | ` +
        `${date.padEnd(26)} | ` +
        `${backup.size.padEnd(10)} | ` +
        `${backup.filename}`
      );
    });
    
    console.log('-'.repeat(100));
    console.log(`\nTo restore a backup, run: node scripts/restore-database.js`);
    
  } catch (error) {
    console.error('Failed to list backups:', error.message);
    process.exit(1);
  }
};

// Main execution
listBackups(); 