# Pinecone Setup Guide

This document outlines the steps to configure Pinecone for vector storage in your application.

## Environment Variables

Add the following environment variables to your `.env` file or deployment environment:

```bash
# Pinecone Configuration
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX_NAME="document-chunks"
```

## Getting Your Pinecone API Key

1. Sign up for a Pinecone account at [https://www.pinecone.io/](https://www.pinecone.io/)
2. Create a new project
3. Navigate to the API Keys section in your dashboard
4. Copy your API key

## Environment Configuration

- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_ENVIRONMENT`: The environment/region for your Pinecone project (e.g., "us-east-1-aws", "us-west-2-aws")
- `PINECONE_INDEX_NAME`: The name of your Pinecone index (default: "document-chunks")

## Index Configuration

The application will automatically create a Pinecone index with the following specifications:
- **Dimension**: 1536 (for OpenAI text-embedding-ada-002)
- **Metric**: cosine
- **Cloud**: AWS
- **Region**: Based on your PINECONE_ENVIRONMENT setting

## Migration from PGVECTOR

If you're migrating from PGVECTOR, you'll need to:

1. Set up your Pinecone environment variables
2. Run the migration script to transfer existing embeddings
3. Update your database schema to remove vector columns

## Testing the Setup

You can test your Pinecone configuration by:

1. Starting your application
2. Uploading a document
3. Verifying that embeddings are stored in Pinecone
4. Testing similarity search functionality

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Verify your Pinecone API key is correct
2. **Environment Not Found**: Check that your PINECONE_ENVIRONMENT matches your Pinecone project
3. **Index Creation Failed**: Ensure you have sufficient permissions in your Pinecone project

### Debug Mode

To enable debug logging for Pinecone operations, set:
```bash
DEBUG=pinecone:*
```

## Cost Considerations

Pinecone pricing is based on:
- Number of vectors stored
- Number of queries performed
- Index size and performance tier

Monitor your usage in the Pinecone dashboard to manage costs effectively.

