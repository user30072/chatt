const fs = require('fs');
const path = require('path');
const { generateEmbedding } = require('./ai');
const pdfParse = require('pdf-parse');

/**
 * Process an uploaded document
 * @param {Object} document - The document object from the database
 * @param {Buffer|string} fileContent - The file content as buffer or string
 * @returns {Promise<boolean>} - Success status
 */
const processDocument = async (document, fileContent) => {
  try {
    let textContent;
    
    // Extract text based on file type
    switch (document.file_type.toLowerCase()) {
      case 'txt':
      case 'text/plain':
        textContent = fileContent.toString('utf8');
        break;
        
      case 'pdf':
      case 'application/pdf':
        try {
          // Extract text from PDF using pdf-parse
          const pdfData = await pdfParse(fileContent);
          textContent = pdfData.text;
          
          // Remove excessive whitespace and normalize line breaks
          textContent = textContent.replace(/\s+/g, ' ').trim();
          
          console.log(`Extracted ${textContent.length} characters from PDF document`);
        } catch (pdfError) {
          console.error('Error extracting PDF text:', pdfError);
          await updateDocumentStatus(document.id, 'failed', 'Failed to extract text from PDF');
          return false;
        }
        break;
        
      case 'docx':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // For a production system, you'd use a DOCX extraction library like mammoth
        textContent = "DOCX content would be extracted here";
        break;
        
      default:
        console.error(`Unsupported file type: ${document.file_type}`);
        await updateDocumentStatus(document.id, 'failed', 'Unsupported file type');
        return false;
    }
    
    // Validate extracted content
    if (!textContent || textContent.length < 10) {
      await updateDocumentStatus(document.id, 'failed', 'Failed to extract text or content too short');
      return false;
    }
    
    // Chunk the document
    const chunks = chunkText(textContent);
    console.log(`Document split into ${chunks.length} chunks`);
    
    // Process chunks
    await processChunks(document.id, chunks);
    
    // Update document status
    await updateDocumentStatus(document.id, 'processed');
    
    return true;
  } catch (error) {
    console.error('Error processing document:', error);
    await updateDocumentStatus(document.id, 'failed', error.message);
    return false;
  }
};

/**
 * Update document status in the database
 * @param {string} documentId - The document ID
 * @param {string} status - The new status
 * @param {string} errorMessage - Optional error message
 */
const updateDocumentStatus = async (documentId, status, errorMessage = null) => {
  const metadata = errorMessage ? { error: errorMessage } : {};
  
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status,
      metadata: errorMessage ? { error: errorMessage } : undefined
    }
  });
};

/**
 * Chunk text into smaller pieces
 * @param {string} text - The text to chunk
 * @param {number} maxChunkSize - Maximum chunk size in characters
 * @returns {Array<string>} - Array of text chunks
 */
const chunkText = (text, maxChunkSize = 1000) => {
  const chunks = [];
  
  // Simple splitting by paragraphs and then combining to reach target chunk size
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Skip empty paragraphs
    if (paragraph.trim().length === 0) continue;
    
    if (currentChunk.length + paragraph.length < maxChunkSize) {
      // Add to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      // Current chunk is full, start a new one
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If paragraph is longer than max chunk size, split it further
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length < maxChunkSize) {
            sentenceChunk += sentence;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
            sentenceChunk = sentence;
          }
        }
        
        if (sentenceChunk) {
          currentChunk = sentenceChunk;
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

/**
 * Process and store document chunks with embeddings
 * @param {string} documentId - The document ID
 * @param {Array<string>} chunks - Array of text chunks
 */
const processChunks = async (documentId, chunks) => {
  for (const [index, content] of chunks.entries()) {
    try {
      // Generate embedding
      const embedding = await generateEmbedding(content);
      
      if (!embedding) {
        console.warn(`Failed to generate embedding for chunk ${index} of document ${documentId}`);
        continue;
      }
      
      // Store chunk in database
      await prisma.documentChunk.create({
        data: {
          document_id: documentId,
          content,
          embedding,
          metadata: {
            chunkIndex: index,
            chunkCount: chunks.length
          }
        }
      });
    } catch (error) {
      console.error(`Error processing chunk ${index} of document ${documentId}:`, error);
    }
  }
};

module.exports = {
  processDocument,
  chunkText,
  updateDocumentStatus
}; 