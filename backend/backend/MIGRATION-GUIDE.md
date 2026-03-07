# Migration Guide: PGVECTOR to Pinecone

This guide walks you through migrating your application from PGVECTOR to Pinecone for vector storage and similarity search.

## Overview

The migration involves:
1. Setting up Pinecone account and configuration
2. Updating your application code
3. Migrating existing embeddings
4. Updating your database schema
5. Testing the new setup

## Prerequisites

- Node.js 18+ installed
- Access to your current PGVECTOR database
- Pinecone account (sign up at [pinecone.io](https://pinecone.io))

## Step 1: Set Up Pinecone

### 1.1 Create Pinecone Account
1. Go to [https://www.pinecone.io/](https://www.pinecone.io/)
2. Sign up for an account
3. Create a new project
4. Note your API key and environment

### 1.2 Configure Environment Variables
Add these to your `.env` file:

```bash
# Pinecone Configuration
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="us-east-1-aws"  # or your region
PINECONE_INDEX_NAME="document-chunks"
```

## Step 2: Install Dependencies

```bash
cd backend/backend
npm install pinecone-client
```

## Step 3: Backup Your Data

Before making any changes, backup your current database:

```bash
npm run db:create-backup
```

## Step 4: Run the Migration

### 4.1 Migrate Existing Embeddings
Run the migration script to transfer your existing embeddings to Pinecone:

```bash
npm run migrate:pinecone
```

This script will:
- Create a Pinecone index
- Fetch all existing document chunks
- Generate embeddings for each chunk
- Store them in Pinecone with proper metadata

### 4.2 Update Database Schema
After successful migration, update your database schema:

```bash
npx prisma db push
```

This removes the vector columns from your database since embeddings are now stored in Pinecone.

## Step 5: Deploy Changes

### 5.1 Update Environment Variables
In your deployment environment (Railway, Heroku, etc.), add the Pinecone environment variables.

### 5.2 Deploy Application
Deploy your updated application:

```bash
npm run deploy
```

## Step 6: Verify Migration

### 6.1 Test Document Upload
1. Upload a new document
2. Verify it processes correctly
3. Check that embeddings are stored in Pinecone

### 6.2 Test Similarity Search
1. Ask a question to your chatbot
2. Verify it retrieves relevant document chunks
3. Check that responses are accurate

### 6.3 Check Pinecone Dashboard
1. Log into your Pinecone dashboard
2. Verify your index contains the expected number of vectors
3. Check that queries are being processed

## Troubleshooting

### Common Issues

#### Migration Script Fails
- **Issue**: API key invalid
- **Solution**: Verify your Pinecone API key is correct

- **Issue**: Environment not found
- **Solution**: Check your PINECONE_ENVIRONMENT matches your project

#### Embeddings Not Found
- **Issue**: Similarity search returns no results
- **Solution**: Verify embeddings were migrated successfully

#### Performance Issues
- **Issue**: Slow similarity search
- **Solution**: Check your Pinecone index configuration and consider upgrading your plan

### Debug Mode

Enable debug logging:

```bash
DEBUG=pinecone:* npm start
```

## Rollback Plan

If you need to rollback to PGVECTOR:

1. Restore your database backup
2. Revert your code changes
3. Update environment variables
4. Redeploy

## Cost Considerations

### PGVECTOR vs Pinecone Costs

**PGVECTOR:**
- Database hosting costs
- Storage costs for vector data
- Query performance depends on database resources

**Pinecone:**
- Pay-per-use pricing
- Separate costs for storage and queries
- Better performance for large-scale vector operations

### Cost Optimization Tips

1. **Monitor Usage**: Check your Pinecone dashboard regularly
2. **Optimize Queries**: Use filters to reduce query scope
3. **Batch Operations**: Process multiple vectors together
4. **Index Configuration**: Choose appropriate index settings for your use case

## Performance Comparison

| Feature | PGVECTOR | Pinecone |
|---------|----------|----------|
| Setup Complexity | Medium | Low |
| Query Performance | Good | Excellent |
| Scalability | Limited | High |
| Maintenance | High | Low |
| Cost | Predictable | Usage-based |

## Support

If you encounter issues during migration:

1. Check the logs for error messages
2. Verify your environment variables
3. Test with a small dataset first
4. Contact support if needed

## Next Steps

After successful migration:

1. Monitor your Pinecone usage and costs
2. Optimize your index configuration
3. Consider implementing advanced features like namespaces
4. Set up monitoring and alerting

## Additional Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [Pinecone Best Practices](https://docs.pinecone.io/docs/best-practices)
- [Vector Similarity Search Guide](https://docs.pinecone.io/docs/vector-similarity-search)