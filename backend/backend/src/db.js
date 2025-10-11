// src/db.js - Global Prisma instance for database access
const { PrismaClient } = require('@prisma/client');

// Create a global prisma instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Connect to the database
const connectDb = async () => {
  try {
    await prisma.$connect();
    console.log('Database connection established successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

// Check the database connection
const checkDb = async () => {
  try {
    // Try to execute a simple query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database check failed:', error);
    return false;
  }
};

// Disconnect from the database
const disconnectDb = async () => {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
    return true;
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    return false;
  }
};

module.exports = {
  prisma,
  connectDb,
  checkDb,
  disconnectDb
}; 