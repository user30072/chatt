#!/usr/bin/env node

/**
 * Scheduled Database Backup Script
 * This script creates a backup of the database and saves it to a specified location.
 * It can be run on a schedule using a cron job or similar.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function createBackup() {
  try {
    // Get the database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    // Parse the connection string to get database details
    const connectionMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    
    if (!connectionMatch) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = connectionMatch;
    
    // Create timestamp for the backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${database}_${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // Set the PGPASSWORD environment variable for passwordless login
    process.env.PGPASSWORD = password;
    
    console.log(`Creating backup of database ${database} to ${backupPath}`);
    
    // Execute pg_dump to create the backup
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F c -b -v -f "${backupPath}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('PostgreSQL database dump complete')) {
      console.error('Error output during backup:', stderr);
    }
    
    console.log('Backup completed successfully');
    console.log('Backup file:', backupPath);
    
    // Keep only the 7 most recent backups
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .map(file => path.join(BACKUP_DIR, file))
      .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
    
    // Remove older backups
    if (files.length > 7) {
      const toDelete = files.slice(7);
      console.log(`Removing ${toDelete.length} older backups`);
      toDelete.forEach(file => {
        fs.unlinkSync(file);
        console.log(`Deleted old backup: ${file}`);
      });
    }
    
    return backupPath;
  } catch (error) {
    console.error('Error creating database backup:', error);
    throw error;
  } finally {
    // Clear the password from environment
    process.env.PGPASSWORD = '';
  }
}

// Run the backup if this script is executed directly
if (require.main === module) {
  createBackup()
    .then(backupPath => {
      console.log(`Backup saved to ${backupPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}

module.exports = { createBackup }; 