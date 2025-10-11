#!/usr/bin/env node

/**
 * Database Restore Script
 * 
 * This script restores a database from a backup file.
 * Usage: node restore-database.js [backup-file-path]
 * If no backup file is specified, it will list available backups and prompt for selection.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const readline = require('readline');

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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Get available backup files from the backup directory
 * @returns {Array<{filename: string, path: string, createdAt: Date}>} List of available backup files
 */
const getAvailableBackups = () => {
  const backupDir = process.env.BACKUP_DIR || './backups';
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Get all files from backup directory
  const files = fs.readdirSync(backupDir);
  
  // Filter for backup files and sort by creation date (newest first)
  return files
    .filter(file => file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.dump')))
    .map(filename => {
      const path = `${backupDir}/${filename}`;
      const stats = fs.statSync(path);
      return {
        filename,
        path,
        createdAt: stats.mtime,
        format: filename.endsWith('.sql') ? 'sql' : 'custom'
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Select a backup file from available backups
 * @param {Array<{filename: string, path: string, createdAt: Date, format: string}>} backups List of available backups
 * @returns {Promise<string>} Selected backup file path
 */
const selectBackupFile = (backups) => {
  return new Promise((resolve, reject) => {
    if (backups.length === 0) {
      console.log('No backup files found.');
      process.exit(0);
    }
    
    console.log('\nAvailable backup files:');
    console.log('=====================================================');
    console.log('No. | Format  | Database        | Created At        ');
    console.log('=====================================================');
    
    backups.forEach((backup, index) => {
      // Extract database name from filename if present
      // Format can be: backup-dbname-timestamp.sql or backup-timestamp.sql
      let dbName = 'unknown';
      const parts = backup.filename.replace('backup-', '').split('-');
      if (parts.length > 1) {
        // If we have more than one part, first part is likely the database name
        dbName = parts[0];
      }
      
      const formatStr = backup.format === 'sql' ? 'SQL    ' : 'Custom ';
      console.log(
        `${(index + 1).toString().padEnd(3)} | ${formatStr} | ${dbName.padEnd(15)} | ${backup.createdAt.toLocaleString()}`
      );
    });
    console.log('=====================================================');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nEnter backup number to restore: ', (answer) => {
      rl.close();
      
      const index = parseInt(answer, 10) - 1;
      if (isNaN(index) || index < 0 || index >= backups.length) {
        console.log('Invalid selection. Please run the script again.');
        process.exit(1);
      }
      
      resolve(backups[index]);
    });
  });
};

// Confirm database restore
const confirmRestore = (backupFile, dbUrl) => {
  return new Promise((resolve, reject) => {
    const dbDetails = parseDbUrl(dbUrl);
    
    console.log('\n⚠️  WARNING: You are about to restore the database from a backup.');
    console.log('This will REPLACE ALL DATA in the current database.');
    console.log('\nBackup file: ' + backupFile);
    console.log('Target database: ' + dbDetails.database);
    console.log('Database host: ' + dbDetails.host);
    
    rl.question('\nAre you sure you want to proceed? (yes/no): ', answer => {
      if (answer.toLowerCase() === 'yes') {
        resolve();
      } else {
        reject(new Error('Operation cancelled by user'));
      }
    });
  });
};

/**
 * Restore database from backup file
 * @param {string} backupFile Backup file path
 */
const restoreDatabase = async (backupInfo) => {
  const { path: backupFile, format } = backupInfo;
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set.');
    process.exit(1);
  }
  
  try {
    const dbDetails = parseDbUrl(dbUrl);
    
    // Set environment variables for psql/pg_restore
    process.env.PGPASSWORD = dbDetails.password;
    
    console.log(`\nRestoring database ${dbDetails.database} from ${backupFile}...`);
    
    // Use appropriate command based on backup format
    let command;
    if (format === 'sql') {
      // For SQL plain text backups
      command = `psql -h ${dbDetails.host} -p ${dbDetails.port} -U ${dbDetails.user} -d ${dbDetails.database} -f "${backupFile}"`;
    } else {
      // For custom format backups
      command = `pg_restore -h ${dbDetails.host} -p ${dbDetails.port} -U ${dbDetails.user} -d ${dbDetails.database} -v "${backupFile}"`;
    }
    
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('\nDatabase restore completed successfully!');
  } catch (error) {
    console.error('Error restoring database:', error);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  try {
    const backups = getAvailableBackups();
    const selectedBackup = await selectBackupFile(backups);
    
    const confirmed = await confirmRestore(selectedBackup.filename, DATABASE_URL);
    if (confirmed) {
      await restoreDatabase(selectedBackup);
    } else {
      console.log('Restore cancelled.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Execute main function
main(); 