/**
 * Setup script to ensure all required dependencies are installed
 * Run this script with: node setup.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const requiredPackages = [
  '@anthropic-ai/sdk',
  '@prisma/client',
  'axios',
  'cors',
  'dotenv',
  'express',
  'helmet',
  'jsonwebtoken',
  'morgan',
  'multer',
  'node-fetch',
  'openai',
  'pdf-parse',
  'uuid'
];

const devPackages = [
  'nodemon',
  'prisma'
];

console.log('Checking required dependencies...');

// Read package.json
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('Error reading package.json:', error);
  process.exit(1);
}

// Check if dependencies exist
const dependencies = packageJson.dependencies || {};
const devDependencies = packageJson.devDependencies || {};

const missingPackages = requiredPackages.filter(pkg => !dependencies[pkg]);
const missingDevPackages = devPackages.filter(pkg => !devDependencies[pkg]);

if (missingPackages.length === 0 && missingDevPackages.length === 0) {
  console.log('All required dependencies are already installed.');
  process.exit(0);
}

// Install missing packages
if (missingPackages.length > 0) {
  console.log(`Installing missing dependencies: ${missingPackages.join(', ')}`);
  exec(`npm install ${missingPackages.join(' ')}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error installing dependencies: ${error.message}`);
      return;
    }
    if (stderr) console.error(stderr);
    console.log(stdout);
    console.log('Dependencies installed successfully.');
    
    // Install dev dependencies after regular dependencies
    if (missingDevPackages.length > 0) {
      installDevDependencies();
    }
  });
} else if (missingDevPackages.length > 0) {
  // Only install dev dependencies if there are no regular dependencies to install
  installDevDependencies();
}

function installDevDependencies() {
  console.log(`Installing missing dev dependencies: ${missingDevPackages.join(', ')}`);
  exec(`npm install --save-dev ${missingDevPackages.join(' ')}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error installing dev dependencies: ${error.message}`);
      return;
    }
    if (stderr) console.error(stderr);
    console.log(stdout);
    console.log('Dev dependencies installed successfully.');
  });
} 