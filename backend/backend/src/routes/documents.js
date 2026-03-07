const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { validateDocument } = require('../middleware/validation');
const { processDocument } = require('../services/documents');
const { uploadSingleFile } = require('../middleware/upload');
const router = express.Router();

/**
 * @route GET /api/documents
 * @desc Get all documents for a user
 * @access Private
 */
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    const { chatbotId } = req.query;
    
    const where = {
      user_id: req.user.userId,
      ...(chatbotId && { chatbot_id: chatbotId })
    };
    
    const documents = await prisma.document.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      }
    });
    
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/documents/:id
 * @desc Get a document by ID
 * @access Private
 */
router.get('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            metadata: true,
            created_at: true
          },
          take: 5 // Only include a few chunks for preview
        }
      }
    });
    
    if (!document || document.user_id !== req.user.userId) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json({ document });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/documents
 * @desc Upload a new document
 * @access Private
 */
const { hasActiveSubscriptionOrTrial } = require('../middleware/auth');
const { enforceFileSizeLimit } = require('../middleware/limits');

router.post('/', isAuthenticated, hasActiveSubscriptionOrTrial, uploadSingleFile('file'), enforceFileSizeLimit, async (req, res, next) => {
  try {
    // Create document record from form data
    const { name } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get file type/MIME type
    const file_type = req.body.file_type || file.mimetype || file.originalname.split('.').pop();
    
    // Calculate file size
    const file_size = file.size;
    
    // Optional chatbot ID
    const chatbot_id = req.body.chatbot_id || null;
    
    // Validate chatbot if provided
    if (chatbot_id) {
      const chatbot = await prisma.chatbot.findUnique({
        where: {
          id: chatbot_id
        },
        select: {
          user_id: true
        }
      });
      
      if (!chatbot || chatbot.user_id !== req.user.userId) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
    }
    
    // Create document record
    const document = await prisma.document.create({
      data: {
        name,
        file_type,
        file_url: file.path, // Store file path
        file_size,
        status: 'processing',
        user_id: req.user.userId,
        chatbot_id
      }
    });
    
    // Return document details to frontend
    res.status(201).json({ document });
    
    // Process the document asynchronously
    try {
      // Read file from disk
      const fileContent = file.buffer || require('fs').readFileSync(file.path);
      processDocument(document, fileContent)
        .then(success => {
          console.log(`Document ${document.id} processed: ${success ? 'success' : 'failed'}`);
        })
        .catch(error => {
          console.error(`Error processing document ${document.id}:`, error);
        });
    } catch (error) {
      console.error('Error reading uploaded file:', error);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/documents/:id
 * @desc Delete a document
 * @access Private
 */
router.delete('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const documentId = req.params.id;
    
    // Check if document exists and belongs to user
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { user_id: true, file_url: true }
    });
    
    if (!document || document.user_id !== req.user.userId) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete the file from disk if it exists
    if (document.file_url && document.file_url !== 'pending') {
      try {
        require('fs').unlinkSync(document.file_url);
      } catch (err) {
        console.error(`Failed to delete file: ${document.file_url}`, err);
      }
    }
    
    // Delete document (will cascade to chunks)
    await prisma.document.delete({
      where: { id: documentId }
    });
    
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/documents/:id
 * @desc Update document information
 * @access Private
 */
router.put('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const { name, chatbot_id } = req.body;
    
    // Check if document exists and belongs to user
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { user_id: true }
    });
    
    if (!document || document.user_id !== req.user.userId) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Validate chatbot if provided
    if (chatbot_id) {
      const chatbot = await prisma.chatbot.findUnique({
        where: {
          id: chatbot_id
        },
        select: {
          user_id: true
        }
      });
      
      if (!chatbot || chatbot.user_id !== req.user.userId) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
    }
    
    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        name,
        chatbot_id
      }
    });
    
    res.json({ document: updatedDocument });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
