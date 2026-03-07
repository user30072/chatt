const axios = require('axios');
// Handle OpenAI SDK v4+ (new API) vs v3 (old API)
let OpenAI;
let openai;
try {
  const openaiModule = require('openai');
  
  // OpenAI SDK v4+ exports OpenAI class directly
  // v3 exports Configuration and OpenAIApi
  if (openaiModule.OpenAI && typeof openaiModule.OpenAI === 'function') {
    // v4+ API
    OpenAI = openaiModule.OpenAI;
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('Using OpenAI SDK v4+');
  } else if (openaiModule.Configuration && openaiModule.OpenAIApi) {
    // v3 API - fallback
    const { Configuration, OpenAIApi } = openaiModule;
    const openaiConfig = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    openai = new OpenAIApi(openaiConfig);
    console.log('Using OpenAI SDK v3');
  } else {
    throw new Error('Unsupported OpenAI SDK version');
  }
} catch (error) {
  console.warn('OpenAI SDK not available:', error.message);
  openai = null;
}

const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../lib/prisma');
const pineconeService = require('./pineconeService');

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Retrieve relevant document chunks for a query using vector similarity search
 * @param {string} chatbotId - The chatbot ID
 * @param {string} query - The user query
 * @param {number} limit - Maximum number of chunks to retrieve
 * @returns {Promise<Array>} - Array of document chunks
 */
async function retrieveRelevantDocuments(chatbotId, query, limit = 5) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      console.error('Failed to generate embedding for query');
      return [];
    }
    
    // Get the chatbot to find active document IDs
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { active_document_ids: true }
    });
    
    if (!chatbot) {
      console.error(`Chatbot ${chatbotId} not found`);
      return [];
    }
    
    // Find documents associated with this chatbot
    const documentIds = chatbot.active_document_ids || [];
    
    // If no documents are associated, return empty result
    if (documentIds.length === 0) {
      console.log(`No active documents for chatbot ${chatbotId}`);
      return [];
    }
    
    // Verify documents are processed
    const processedDocuments = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        status: 'processed'
      },
      select: { id: true }
    });
    
    const processedDocumentIds = processedDocuments.map(doc => doc.id);
    
    if (processedDocumentIds.length === 0) {
      console.log(`No processed documents for chatbot ${chatbotId}`);
      return [];
    }
    
    // Perform vector similarity search using Pinecone
    const documentChunks = await pineconeService.searchSimilarChunks(
      queryEmbedding,
      processedDocumentIds,
      limit
    );
    
    return documentChunks;
  } catch (error) {
    console.error('Error retrieving relevant documents:', error);
    return [];
  }
}

/**
 * Generates a response from the AI based on user message and conversation history
 */
async function generateChatResponse(chatbot, userMessage, history = []) {
  try {
    // Start tracking token usage
    let tokensUsed = 0;
    
    // Format system message based on chatbot settings
    let systemMessage = chatbot.system_message || "You are a helpful assistant.";
    
    // Add prompt template to system message if available
    if (chatbot.prompt_template) {
      systemMessage = `${systemMessage}\n\n${chatbot.prompt_template}`;
    }
    
    // Retrieve relevant documents for RAG if chatbot has any documents
    let contextFromDocuments = '';
    let documentChunks = [];
    
    try {
      documentChunks = await retrieveRelevantDocuments(chatbot.id, userMessage);
      
      if (documentChunks.length > 0) {
        contextFromDocuments = `I'm providing you with some relevant information from our knowledge base that might help you answer the user's question:\n\n`;
        
        documentChunks.forEach((chunk, index) => {
          contextFromDocuments += `[Document: "${chunk.document_name}"]\n${chunk.content}\n\n`;
        });
        
        // Add to system message
        systemMessage += `\n\n${contextFromDocuments}\n\nPlease use this information to answer the user's questions accurately. If the provided information doesn't contain the answer, respond based on your general knowledge but make it clear to the user that the information might not be from their official documents.`;
      }
    } catch (docError) {
      console.error('Error retrieving documents for RAG:', docError);
      // Continue without document context
    }
    
    // Select the AI model to use based on chatbot settings
    const model = chatbot.model || 'gpt-4o';
    
    // Temperature
    const temperature = chatbot.temperature || 0.7;
    
    // Generate response using the appropriate API
    let response;
    
    if (model.startsWith('claude')) {
      // Use Anthropic API for Claude models
      response = await generateClaudeResponse(systemMessage, userMessage, history, model, temperature);
      tokensUsed = response.tokensUsed;
    } else {
      // Use OpenAI API for GPT models
      response = await generateOpenAIResponse(systemMessage, userMessage, history, model, temperature);
      tokensUsed = response.tokensUsed;
    }
    
    return {
      message: response.message,
      tokensUsed: tokensUsed,
      documents_used: documentChunks.length > 0 ? documentChunks.map(chunk => ({
        id: chunk.document_id,
        name: chunk.document_name
      })) : []
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Return a fallback response
    return {
      message: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
      tokens: 0,
      documents_used: []
    };
  }
}

/**
 * Generate a response using OpenAI API
 */
async function generateOpenAIResponse(systemMessage, userMessage, history, model, temperature) {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }
  
  // Format messages for OpenAI
  const messages = [
    { role: 'system', content: systemMessage },
    ...history,
    { role: 'user', content: userMessage }
  ];
  
  // Handle both v4+ and v3 APIs
  let response;
  if (openai.chat && typeof openai.chat.completions.create === 'function') {
    // v4+ API
    response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: 2000,
    });
    
    return {
      message: response.choices[0].message.content,
      tokensUsed: response.usage.total_tokens
    };
  } else if (openai.createChatCompletion) {
    // v3 API
    response = await openai.createChatCompletion({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: 2000,
    });
    
    return {
      message: response.data.choices[0].message.content,
      tokensUsed: response.data.usage.total_tokens
    };
  } else {
    throw new Error('Unsupported OpenAI API version');
  }
}

/**
 * Generate a response using Anthropic API
 */
async function generateClaudeResponse(systemMessage, userMessage, history, model, temperature) {
  // Format messages according to the latest Anthropic SDK
  const messages = [];
  
  // Add history messages
  for (const msg of history) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    });
  }
  
  // Add the system message and current user message
  messages.push({
    role: 'user',
    content: userMessage
  });
  
  // Create the response
  const response = await anthropic.messages.create({
    model: model,
    messages: messages,
    system: systemMessage,
    temperature: temperature,
    max_tokens: 2000,
  });
  
  // Estimate token usage (Anthropic doesn't provide exact count)
  const estimatedTokens = estimateTokenCount(
    systemMessage + userMessage + history.reduce((acc, msg) => acc + msg.content, '') + response.content[0].text
  );
  
  return {
    message: response.content[0].text,
    tokensUsed: estimatedTokens
  };
}

/**
 * Simple token count estimator
 * This is a rough estimate, actual token count may vary
 */
function estimateTokenCount(text) {
  // Very rough estimation: ~4 chars per token
  return Math.ceil(text.length / 4);
}


/**
 * Generates an embedding vector for text using OpenAI's embedding API
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<Array<number>>} - The embedding vector
 */
async function generateEmbedding(text) {
  if (!openai) {
    console.error('OpenAI client not initialized');
    return null;
  }
  
  try {
    // Truncate text if it's too long (OpenAI's embedding API has token limits)
    const maxLength = 8000; // Approximate character limit for embedding
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) 
      : text;
    
    // Handle both v4+ and v3 APIs
    let response;
    if (openai.embeddings && typeof openai.embeddings.create === 'function') {
      // v4+ API
      response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: truncatedText,
      });
      
      return response.data[0].embedding;
    } else if (openai.createEmbedding) {
      // v3 API
      response = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: truncatedText,
      });
      
      return response.data.data[0].embedding;
    } else {
      throw new Error('Unsupported OpenAI API version');
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

module.exports = {
  generateChatResponse,
  generateEmbedding
}; 