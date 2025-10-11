/**
 * Post-deployment script for Railway
 * This script runs after deployment to perform necessary migrations and data updates
 */

const { execSync } = require('child_process');
const path = require('path');

// Run the commands and print their output
function runCommand(command) {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.toString());
    return false;
  }
}

// Main execution function
async function main() {
  console.log('Starting post-deployment tasks...');
  
  // Push database schema changes (safely, preserving data)
  if (!runCommand('npx prisma db push')) {
    console.error('Failed to push database schema changes');
    process.exit(1);
  }
  
  console.log('Database schema updated successfully');
  console.log('Post-deployment tasks completed successfully');
}

// Run the main function
main().catch(err => {
  console.error('Post-deployment script failed:', err);
  process.exit(1);
}); 