// src/routes/conversations.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

/**
 * @route GET /api/conversations
 * @desc Get all conversations for a chatbot
 * @access Private
 */
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    const { chatbotId, status, page = 1, limit = 20 } = req.query;
    
    if (!chatbotId) {
      return res.status(400).json({ message: 'Chatbot ID is required' });
    }
    
    // Verify chatbot belongs to user
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { user_id: true }
    });
    
    if (!chatbot || chatbot.user_id !== req.user.userId) {
      return res.status(404).json({ message: 'Chatbot not found' });
    }
    
    // Build query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = {
      chatbot_id: chatbotId,
      user_id: req.user.userId,
      ...(status && { status })
    };
    
    // Get conversations
    const [conversations, totalCount] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: {
          updated_at: 'desc'
        },
        include: {
          messages: {
            orderBy: {
              created_at: 'asc'
            },
            take: 2 // Just get first and last messages for preview
          },
          tags: {
            include: {
              tag: true
            }
          }
        },
        skip,
        take
      }),
      prisma.conversation.count({ where })
    ]);
    
    res.json({
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/conversations/:id
 * @desc Get a single conversation with all messages
 * @access Private
 */
router.get('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        messages: {
          orderBy: {
            created_at: 'asc'
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        chatbot: {
          select: {
            id: true,
            name: true,
            user_id: true
          }
        }
      }
    });
    
    if (!conversation || conversation.user_id !== req.user.userId || conversation.chatbot.user_id !== req.user.userId) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/conversations/:id
 * @desc Update conversation status or add tags
 * @access Private
 */
router.put('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const { status, tagIds } = req.body;
    
    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        chatbot: {
          select: { user_id: true }
        }
      }
    });
    
    if (!conversation || conversation.chatbot.user_id !== req.user.userId) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Update conversation
    let result = conversation;
    
    if (status) {
      result = await prisma.conversation.update({
        where: { id: req.params.id },
        data: { status }
      });
    }
    
    // Update tags if provided
    if (tagIds && Array.isArray(tagIds)) {
      // Verify all tags belong to the same user
      const tags = await prisma.conversationTag.findMany({
        where: {
          id: { in: tagIds },
          user_id: req.user.userId
        }
      });
      
      const validTagIds = tags.map(tag => tag.id);
      
      // Remove existing tags
      await prisma.conversationTagAssignment.deleteMany({
        where: { conversation_id: req.params.id }
      });
      
      // Add new tags
      if (validTagIds.length > 0) {
        await Promise.all(
          validTagIds.map(tagId =>
            prisma.conversationTagAssignment.create({
              data: {
                conversation_id: req.params.id,
                tag_id: tagId
              }
            })
          )
        );
      }
      
      // Get updated conversation with tags
      result = await prisma.conversation.findUnique({
        where: { id: req.params.id },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      });
    }
    
    res.json({ conversation: result });
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/conversations/:id
 * @desc Delete a conversation
 * @access Private
 */
router.delete('/:id', isAuthenticated, async (req, res, next) => {
  try {
    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        chatbot: {
          select: { user_id: true }
        }
      }
    });
    
    if (!conversation || conversation.chatbot.user_id !== req.user.userId) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Delete conversation (will cascade to messages)
    await prisma.conversation.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/conversations/tags
 * @desc Get all conversation tags for an organization
 * @access Private
 */
router.get('/tags', isAuthenticated, async (req, res, next) => {
  try {
    const tags = await prisma.conversationTag.findMany({
      where: {
        user_id: req.user.userId
      }
    });
    
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/conversations/tags
 * @desc Create a new conversation tag
 * @access Private
 */
router.post('/tags', isAuthenticated, async (req, res, next) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Tag name is required' });
    }
    
    const tag = await prisma.conversationTag.create({
      data: {
        name,
        color: color || '#6B7280',
        user_id: req.user.userId
      }
    });
    
    res.status(201).json({ tag });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/conversations/:id/chat
 * @desc Create a new conversation with a chatbot
 * @access Private
 */
router.post('/:id/chat', async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    const { message, conversation_id, visitor_id, metadata } = req.body;
    const apiKey = req.headers['x-api-key'];
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    if (!visitor_id) {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }
    
    // Validate API key if provided
    if (apiKey) {
      const integration = await prisma.websiteIntegration.findFirst({
        where: {
          api_key: apiKey,
          chatbot_id: chatbotId,
          is_active: true
        }
      });
      
      if (!integration) {
        return res.status(401).json({ message: 'Invalid API key' });
      }
    }
    
    // Get chatbot with settings
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        customization: true
      }
    });
    
    if (!chatbot || !chatbot.is_active) {
      return res.status(404).json({ message: 'Chatbot not found or inactive' });
    }
    
    // Get or create conversation
    let conversation;
    if (conversation_id) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversation_id },
        include: {
          messages: {
            orderBy: { created_at: 'asc' }
          }
        }
      });
      
      if (!conversation || conversation.chatbot_id !== chatbotId) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
    } else {
      // Make sure to get the user_id from the chatbot to associate with the conversation
      conversation = await prisma.conversation.create({
        data: {
          chatbot_id: chatbotId,
          visitor_id: visitor_id,
          user_id: chatbot.user_id,
          status: 'active',
          metadata: metadata || {},
          source_url: req.body.source_url
        },
        include: {
          messages: true
        }
      });
    }
    
    // ... rest of the code ...
  } catch (err) {
    next(err);
  }
});

module.exports = router;