#!/usr/bin/env node

/**
 * migrate-to-pinecone.js
 * 
 * This script migrates existing document embeddings from PGVECTOR to Pinecone.
 * It should be run once during the transition from PGVECTOR to Pinecone.
 * 
 * Usage:
 *   node scripts/migrate-to-pinecone.js
 */

const { PrismaClient } = require('@prisma/client');
const pineconeService = require('../src/services/pineconeService');

const prisma = new PrismaClient();

async function migrateEmbeddingsToPinecone() {
  console.log('Starting migration from PGVECTOR to Pinecone...');
  
  try {
    // Initialize Pinecone
    console.log('Initializing Pinecone...');
    await pineconeService.createIndex(1536, 'cosine');
    
    // Get all document chunks with embeddings from the old schema
    console.log('Fetching existing document chunks...');
    
    // First, let's check if we have any chunks with embeddings in the old format
    const chunksWithEmbeddings = await prisma.$queryRaw`
      SELECT 
        dc.id,
        dc.content,
        dc.document_id,
        d.name as document_name,
        d.user_id,
        dc.metadata,
        dc.created_at
      FROM 
        document_chunks dc
      JOIN
        documents d ON dc.document_id = d.id
      WHERE 
        d.status = 'processed'
      ORDER BY 
        dc.created_at ASC
    `;
    
    console.log(`Found ${chunksWithEmbeddings.length} document chunks to migrate`);
    
    if (chunksWithEmbeddings.length === 0) {
      console.log('No document chunks found to migrate');
      return;
    }
    
    // Process chunks in batches to avoid overwhelming the system
    const batchSize = 10;
    let migratedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < chunksWithEmbeddings.length; i += batchSize) {
      const batch = chunksWithEmbeddings.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunksWithEmbeddings.length / batchSize)}`);
      
      // Process each chunk in the batch
      for (const chunk of batch) {
        try {
          // Generate embedding for the chunk content
          const { generateEmbedding } = require('../src/services/ai');
          const embedding = await generateEmbedding(chunk.content);
          
          if (!embedding) {
            console.warn(`Failed to generate embedding for chunk ${chunk.id}`);
            errorCount++;
            continue;
          }
          
          // Create chunk ID for Pinecone
          const chunkId = `${chunk.document_id}_chunk_${chunk.id}`;
          
          // Prepare metadata for Pinecone
          const metadata = {
            content: chunk.content,
            documentId: chunk.document_id,
            documentName: chunk.document_name,
            userId: chunk.user_id,
            chunkId: chunk.id,
            migratedAt: new Date().toISOString(),
            ...(chunk.metadata || {})
          };
          
          // Store in Pinecone
          await pineconeService.storeDocumentChunk(chunkId, embedding, metadata);
          migratedCount++;
          
          console.log(`Migrated chunk ${chunk.id} (${migratedCount}/${chunksWithEmbeddings.length})`);
          
        } catch (error) {
          console.error(`Error migrating chunk ${chunk.id}:`, error.message);
          errorCount++;
        }
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < chunksWithEmbeddings.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total chunks processed: ${chunksWithEmbeddings.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some chunks failed to migrate. Check the logs above for details.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
    // Verify migration by checking Pinecone index stats
    console.log('\nVerifying migration...');
    const stats = await pineconeService.getIndexStats();
    console.log('Pinecone index stats:', JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the migration
if (require.main === module) {
  migrateEmbeddingsToPinecone()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateEmbeddingsToPinecone };

