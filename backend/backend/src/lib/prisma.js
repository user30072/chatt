const { PrismaClient } = require('@prisma/client');

// Create and export a singleton instance of PrismaClient
const prisma = new PrismaClient();

module.exports = prisma; 