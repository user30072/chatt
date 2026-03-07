// Handle Pinecone import - try official SDK first, then fallback to pinecone-client
let Pinecone;
let isPineconeAvailable = false;

try {
  // Try official @pinecone-database/pinecone first
  try {
    const officialPinecone = require('@pinecone-database/pinecone');
    Pinecone = officialPinecone.Pinecone || officialPinecone.default || officialPinecone;
    if (typeof Pinecone === 'function') {
      console.log('Using official @pinecone-database/pinecone SDK');
      isPineconeAvailable = true;
    }
  } catch (e) {
    // Fallback to pinecone-client
    try {
      const pineconeModule = require('pinecone-client');
      
      // pinecone-client v1.x exports as default or named export
      if (pineconeModule.default && typeof pineconeModule.default === 'function') {
        Pinecone = pineconeModule.default;
        isPineconeAvailable = true;
      } else if (pineconeModule.Pinecone && typeof pineconeModule.Pinecone === 'function') {
        Pinecone = pineconeModule.Pinecone;
        isPineconeAvailable = true;
      } else if (typeof pineconeModule === 'function') {
        Pinecone = pineconeModule;
        isPineconeAvailable = true;
      } else if (pineconeModule && typeof pineconeModule.init === 'function') {
        // Object with init method
        Pinecone = pineconeModule;
        isPineconeAvailable = true;
      } else {
        throw new Error('pinecone-client does not export a usable constructor');
      }
      
      if (isPineconeAvailable) {
        console.log('Using pinecone-client package');
      }
    } catch (innerError) {
      throw new Error(`Failed to load pinecone-client: ${innerError.message}`);
    }
  }
  
  // Final validation - ensure we have something usable
  if (!isPineconeAvailable || (!Pinecone || (typeof Pinecone !== 'function' && typeof Pinecone.init !== 'function'))) {
    throw new Error('Pinecone is not a constructor or usable object');
  }
} catch (error) {
  console.warn('Pinecone client not available:', error.message);
  Pinecone = null;
  isPineconeAvailable = false;
}

class PineconeService {
  constructor() {
    // Check if Pinecone is available
    if (!isPineconeAvailable || !Pinecone) {
      console.warn('Pinecone client not available. Pinecone operations will be disabled.');
      this.pinecone = null;
      this.indexName = null;
      this.index = null;
      return;
    }
    
    // Check if API key is configured
    if (!process.env.PINECONE_API_KEY) {
      console.warn('PINECONE_API_KEY not configured. Pinecone operations will be disabled.');
      this.pinecone = null;
      this.indexName = null;
      this.index = null;
      return;
    }
    
    try {
      // Double-check Pinecone is actually usable before trying to use it
      if (!Pinecone || (typeof Pinecone !== 'function' && typeof Pinecone.init !== 'function')) {
        throw new Error('Pinecone is not available or not a constructor');
      }
      
      // Handle different Pinecone constructor patterns
      if (typeof Pinecone === 'function') {
        // SDK v1.1.2 - based on errors, it seems to only accept apiKey and controllerHostUrl
        // The 'environment' parameter causes "additional properties" error
        // So we use controllerHostUrl to specify the correct endpoint
        const config = {
          apiKey: process.env.PINECONE_API_KEY,
          controllerHostUrl: process.env.PINECONE_CONTROLLER_HOST || 'https://api.pinecone.io'
        };
        
        this.pinecone = new Pinecone(config);
        console.log('Pinecone client initialized with API key and controller host:', config.controllerHostUrl);
      } else if (Pinecone && typeof Pinecone.init === 'function') {
        // Alternative initialization pattern (old SDK)
        this.pinecone = Pinecone.init({
          apiKey: process.env.PINECONE_API_KEY,
          environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws'
        });
        console.log('Pinecone client initialized using init() method');
      } else {
        throw new Error('Unsupported Pinecone client structure');
      }
      this.indexName = process.env.PINECONE_INDEX_NAME || 'document-chunks';
      this.index = null;
    } catch (error) {
      console.error('Failed to initialize Pinecone client:', error);
      console.error('Pinecone config:', {
        hasApiKey: !!process.env.PINECONE_API_KEY,
        apiKeyLength: process.env.PINECONE_API_KEY?.length || 0,
        environment: process.env.PINECONE_ENVIRONMENT,
        indexName: process.env.PINECONE_INDEX_NAME
      });
      this.pinecone = null;
      this.indexName = null;
      this.index = null;
    }
  }

  /**
   * Initialize the Pinecone index
   */
  async initialize() {
    if (!this.pinecone) {
      console.warn('Pinecone client not available, skipping initialization');
      return false;
    }
    
    try {
      this.index = this.pinecone.index(this.indexName);
      console.log(`Pinecone index '${this.indexName}' initialized successfully`);
      return true;
    } catch (error) {
      console.error('Failed to initialize Pinecone index:', error);
      return false;
    }
  }

  /**
   * Create the Pinecone index if it doesn't exist
   * @param {number} dimension - Vector dimension (default: 1536 for OpenAI embeddings)
   * @param {string} metric - Distance metric (default: 'cosine')
   */
  async createIndex(dimension = 1536, metric = 'cosine') {
    try {
      // New SDK uses different API structure
      let indexes;
      if (this.pinecone.listIndexes) {
        indexes = await this.pinecone.listIndexes();
      } else if (this.pinecone.IndexOperations && this.pinecone.IndexOperations.listIndexes) {
        indexes = await this.pinecone.IndexOperations.listIndexes();
      } else {
        throw new Error('Unable to find listIndexes method');
      }
      
      // Handle different response formats
      // SDK v1 may return array directly or wrapped in object
      const indexList = Array.isArray(indexes) ? indexes : (indexes?.indexes || []);
      const indexExists = indexList.some(index => {
        const indexName = typeof index === 'string' ? index : (index?.name || index);
        return indexName === this.indexName;
      });
      
      if (!indexExists) {
        const region = process.env.PINECONE_ENVIRONMENT?.replace('-aws', '') || 'us-east-1';
        console.log(`Creating Pinecone index '${this.indexName}'...`);
        console.log(`Index configuration: dimension=${dimension}, metric=${metric}, region=${region}, cloud=aws`);
        
        // New SDK uses different createIndex format
        const createConfig = {
          name: this.indexName,
          dimension: dimension,
          metric: metric,
          spec: {
            serverless: {
              cloud: 'aws',
              region: region
            }
          }
        };
        
        if (this.pinecone.createIndex) {
          await this.pinecone.createIndex(createConfig);
        } else if (this.pinecone.IndexOperations && this.pinecone.IndexOperations.createIndex) {
          await this.pinecone.IndexOperations.createIndex(createConfig);
        } else {
          throw new Error('Unable to find createIndex method');
        }
        
        console.log(`Pinecone index '${this.indexName}' created successfully`);
      } else {
        console.log(`Pinecone index '${this.indexName}' already exists`);
      }
      
      // Initialize the index
      await this.initialize();
      return true;
    } catch (error) {
      console.error('Failed to create Pinecone index:', error);
      console.error('Error details:', {
        message: error.message,
        cause: error.cause?.message,
        hostname: error.cause?.hostname
      });
      
      // If it's a DNS/network error, provide helpful message
      if (error.cause?.code === 'ENOTFOUND') {
        console.error('DNS lookup failed. Check:');
        console.error('1. PINECONE_API_KEY is correct');
        console.error('2. Network connectivity to Pinecone');
        console.error('3. API key format (should start with your project key)');
      }
      
      return false;
    }
  }

  /**
   * Upsert vectors to Pinecone
   * @param {Array} vectors - Array of vector objects with id, values, and metadata
   */
  async upsertVectors(vectors) {
    try {
      if (!this.index) {
        await this.initialize();
      }
      
      const response = await this.index.upsert(vectors);
      console.log(`Successfully upserted ${vectors.length} vectors to Pinecone`);
      return response;
    } catch (error) {
      console.error('Failed to upsert vectors to Pinecone:', error);
      throw error;
    }
  }

  /**
   * Query similar vectors from Pinecone
   * @param {Array} queryVector - The query vector
   * @param {number} topK - Number of similar vectors to return
   * @param {Object} filter - Optional metadata filter
   * @param {boolean} includeMetadata - Whether to include metadata in results
   */
  async queryVectors(queryVector, topK = 5, filter = null, includeMetadata = true) {
    try {
      if (!this.index) {
        await this.initialize();
      }
      
      const queryRequest = {
        vector: queryVector,
        topK: topK,
        includeMetadata: includeMetadata
      };
      
      if (filter) {
        queryRequest.filter = filter;
      }
      
      const response = await this.index.query(queryRequest);
      return response.matches || [];
    } catch (error) {
      console.error('Failed to query vectors from Pinecone:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   * @param {Array} ids - Array of vector IDs to delete
   */
  async deleteVectors(ids) {
    try {
      if (!this.index) {
        await this.initialize();
      }
      
      const response = await this.index.deleteMany(ids);
      console.log(`Successfully deleted ${ids.length} vectors from Pinecone`);
      return response;
    } catch (error) {
      console.error('Failed to delete vectors from Pinecone:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by metadata filter
   * @param {Object} filter - Metadata filter to match vectors for deletion
   */
  async deleteVectorsByFilter(filter) {
    try {
      if (!this.index) {
        await this.initialize();
      }
      
      const response = await this.index.deleteMany(filter);
      console.log('Successfully deleted vectors by filter from Pinecone');
      return response;
    } catch (error) {
      console.error('Failed to delete vectors by filter from Pinecone:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    try {
      if (!this.index) {
        await this.initialize();
      }
      
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Failed to get index stats from Pinecone:', error);
      throw error;
    }
  }

  /**
   * Store document chunk with embedding in Pinecone
   * @param {string} chunkId - Unique identifier for the chunk
   * @param {Array} embedding - The embedding vector
   * @param {Object} metadata - Metadata to store with the vector
   */
  async storeDocumentChunk(chunkId, embedding, metadata) {
    try {
      const vector = {
        id: chunkId,
        values: embedding,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      };
      
      await this.upsertVectors([vector]);
      return true;
    } catch (error) {
      console.error('Failed to store document chunk in Pinecone:', error);
      return false;
    }
  }

  /**
   * Search for similar document chunks
   * @param {Array} queryEmbedding - The query embedding vector
   * @param {Array} documentIds - Array of document IDs to filter by
   * @param {number} limit - Maximum number of results to return
   */
  async searchSimilarChunks(queryEmbedding, documentIds = null, limit = 5) {
    try {
      let filter = null;
      
      if (documentIds && documentIds.length > 0) {
        filter = {
          documentId: { $in: documentIds }
        };
      }
      
      const results = await this.queryVectors(queryEmbedding, limit, filter, true);
      
      return results.map(match => ({
        id: match.id,
        content: match.metadata?.content || '',
        documentId: match.metadata?.documentId || '',
        documentName: match.metadata?.documentName || '',
        similarityScore: match.score || 0,
        metadata: match.metadata || {}
      }));
    } catch (error) {
      console.error('Failed to search similar chunks in Pinecone:', error);
      return [];
    }
  }
}

// Create and export a singleton instance
// Only create if Pinecone is available
let pineconeService;
try {
  pineconeService = new PineconeService();
} catch (error) {
  console.error('Failed to create PineconeService:', error);
  // Create a dummy service that returns empty results
  pineconeService = {
    initialize: async () => false,
    createIndex: async () => false,
    upsertVectors: async () => ({ upsertedCount: 0 }),
    queryVectors: async () => [],
    deleteVectors: async () => ({ deletedCount: 0 }),
    deleteVectorsByFilter: async () => ({ deletedCount: 0 }),
    getIndexStats: async () => ({}),
    storeDocumentChunk: async () => false,
    searchSimilarChunks: async () => []
  };
}

module.exports = pineconeService;


