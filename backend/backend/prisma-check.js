#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if schema.prisma exists
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

console.log('Checking Prisma schema at:', schemaPath);

if (!fs.existsSync(schemaPath)) {
  console.error('❌ ERROR: Prisma schema not found at', schemaPath);
  process.exit(1);
}

// Check if schema is valid
try {
  console.log('Validating Prisma schema...');
  const output = execSync('npx prisma validate', { encoding: 'utf8' });
  console.log('✅ Prisma schema is valid:', output.trim());
} catch (error) {
  console.error('❌ ERROR: Prisma schema validation failed:', error.message);
  process.exit(1);
}

// List directory contents for debugging
try {
  console.log('\nListing prisma directory contents:');
  const files = fs.readdirSync(path.join(__dirname, 'prisma'));
  files.forEach(file => {
    console.log(`- ${file}`);
  });
} catch (error) {
  console.error('Error listing directory:', error.message);
}

console.log('\nPrisma schema check completed successfully'); 