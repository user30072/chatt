/**
 * Script to update existing organizations with usernames based on their names
 * Run this after your prisma migration: node scripts/update-org-usernames.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateOrganizationUsernames() {
  console.log('Starting username update for existing organizations...');
  
  try {
    // Get all organizations without a username set
    const orgs = await prisma.organization.findMany({
      where: {
        username: null
      }
    });
    
    console.log(`Found ${orgs.length} organizations needing username update`);
    
    // Update each organization with its name as the username
    for (const org of orgs) {
      // Create a safe username from the organization name
      // Convert to lowercase, replace spaces with underscores, remove special chars
      let username = org.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      
      // Make sure it's unique by adding numeric suffix if needed
      let uniqueUsername = username;
      let counter = 1;
      
      while (true) {
        const existingOrg = await prisma.organization.findUnique({
          where: { username: uniqueUsername }
        });
        
        if (!existingOrg || existingOrg.id === org.id) {
          break;
        }
        
        uniqueUsername = `${username}_${counter}`;
        counter++;
      }
      
      // Update the organization with the unique username
      await prisma.organization.update({
        where: { id: org.id },
        data: { username: uniqueUsername }
      });
      
      console.log(`Updated organization: ${org.name} → username: ${uniqueUsername}`);
    }
    
    console.log('Username update completed successfully!');
  } catch (error) {
    console.error('Error updating organizations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrganizationUsernames()
  .catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  }); 