/**
 * Migration script to add usernames to existing organizations
 * 
 * Run with: node scripts/migrate-usernames.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateUsernames() {
  console.log('Starting migration of organization names to usernames...');
  
  try {
    // Get all organizations that don't have a username
    const organizations = await prisma.organization.findMany({
      where: {
        username: null
      }
    });
    
    console.log(`Found ${organizations.length} organizations that need username migration`);
    
    if (organizations.length === 0) {
      console.log('No organizations need migration. Exiting.');
      return;
    }
    
    for (const org of organizations) {
      // Convert organization name to valid username format:
      // - Convert to lowercase
      // - Replace spaces with underscores
      // - Remove any non-alphanumeric characters except underscores and hyphens
      // - Ensure length is between 3-20 characters
      let baseUsername = org.name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '')
        .substring(0, 20);
        
      // If resulting username is too short, pad with ID
      if (baseUsername.length < 3) {
        baseUsername = `org_${baseUsername}`;
      }
      
      // Ensure uniqueness by potentially adding suffixes
      let username = baseUsername;
      let counter = 1;
      let unique = false;
      
      while (!unique) {
        // Check if this username is already taken
        const existing = await prisma.organization.findFirst({
          where: {
            username: username,
            id: { not: org.id } // Don't match the current org
          }
        });
        
        if (!existing) {
          unique = true;
        } else {
          // Try with a numeric suffix
          username = `${baseUsername}${counter}`;
          counter++;
          
          // Safety check to prevent infinite loop
          if (counter > 1000) {
            throw new Error(`Could not find unique username for organization ${org.id} after 1000 attempts`);
          }
        }
      }
      
      // Update the organization with the unique username
      await prisma.organization.update({
        where: { id: org.id },
        data: { username }
      });
      
      console.log(`Updated organization ${org.id}: "${org.name}" → username: "${username}"`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateUsernames()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration script failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateUsernames }; 