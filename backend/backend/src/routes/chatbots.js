const express = require('express');
const { isAuthenticated, isAdmin, belongsToUser, hasActiveSubscriptionOrTrial } = require('../middleware/auth');
const { enforceChatbotCreationLimit, enforceMonthlyUsageLimit } = require('../middleware/limits');
const { validateChatbot } = require('../middleware/validation');
const { generateChatResponse } = require('../services/ai');
const { prisma } = require('../db');
const router = express.Router();

/**
 * @route GET /api/chatbots
 * @desc Get all chatbots for the current user
 * @access Private
 */
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    // Add detailed logging for debugging
    console.log(`[API] Fetching chatbots for user: ${req.user.email}, userId: ${req.user.userId}`);
    
    const chatbots = await prisma.chatbot.findMany({
      where: {
        user_id: req.user.userId
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true, 
            email: true
          }
        },
        customization: true,
        website_integrations: true,
        _count: {
          select: {
            conversations: true
          }
        }
      }
    });
    
    console.log(`[API] Found ${chatbots.length} chatbots for user ${req.user.userId}`);
    
    // Transform the response to include user_id at the top level for easier frontend validation
    const transformedChatbots = chatbots.map(chatbot => ({
      ...chatbot,
      user_id: chatbot.user.id, // Include user_id at the top level
      user: {
        id: chatbot.user.id,
        username: chatbot.user.username,
        email: chatbot.user.email
      }
    }));
    
    res.json({ chatbots: transformedChatbots });
  } catch (err) {
    console.error('[API] Error fetching chatbots:', err);
    next(err);
  }
});

/**
 * @route GET /api/chatbots/:id
 * @desc Get a single chatbot by ID, verifying user ownership
 * @access Private
 */
router.get('/:id', isAuthenticated, belongsToUser('chatbot'), async (req, res, next) => {
  try {
    console.log(`[API] Fetching chatbot with ID: ${req.params.id} for user ${req.user.email}, userId: ${req.user.userId}`);
    
    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true 
          }
        },
        customization: true,
        website_integrations: true,
        documents: {
          select: {
            id: true,
            name: true,
            file_type: true,
            status: true,
            created_at: true
          }
        }
      }
    });
    
    // Double check ownership
    if (chatbot.user.id !== req.user.userId) {
      return res.status(403).json({ 
        message: 'You do not have permission to access this chatbot',
        error: 'FORBIDDEN'
      });
    }
    
    // Include user_id at top level for frontend
    const transformedChatbot = {
      ...chatbot,
      user_id: chatbot.user.id
    };
    
    console.log(`[API] Successfully retrieved chatbot: ${chatbot.name}`);
    res.json({ chatbot: transformedChatbot });
  } catch (err) {
    console.error(`[API] Error fetching chatbot ${req.params.id}:`, err);
    next(err);
  }
});

/**
 * @route POST /api/chatbots
 * @desc Create a new chatbot for the user
 * @access Private
 */
router.post('/', isAuthenticated, hasActiveSubscriptionOrTrial, enforceChatbotCreationLimit, validateChatbot, async (req, res, next) => {
  try {
    const {
      name,
      description,
      prompt_template,
      system_message,
      max_context_length,
      temperature,
      model,
      is_active,
      customization
    } = req.body;
    
    console.log(`[API] Creating chatbot '${name}' for user ${req.user.email}`);
    
    const chatbot = await prisma.chatbot.create({
      data: {
        name,
        description,
        prompt_template,
        system_message,
        max_context_length: max_context_length || 10,
        temperature: temperature || 0.7,
        model: model || 'gpt-4o',
        is_active: is_active !== undefined ? is_active : true,
        user: {
          connect: {
            id: req.user.userId
          }
        },
        customization: customization ? {
          create: {
            theme_color: customization.theme_color || '#0084ff',
            font_family: customization.font_family || 'Inter, sans-serif',
            greeting_message: customization.greeting_message || 'Hello! How can I help you today?',
            placeholder_text: customization.placeholder_text || 'Type your message here...',
            position: customization.position || 'bottom-right'
          }
        } : undefined
      },
      include: {
        customization: true
      }
    });
    
    // Create default website integration
    await prisma.websiteIntegration.create({
      data: {
        chatbot_id: chatbot.id,
        domain: '*',
        is_active: true
      }
    });
    
    console.log(`[API] Chatbot created successfully: ${chatbot.id} for user ${req.user.userId}`);
    res.status(201).json({ chatbot });
  } catch (err) {
    console.error('[API] Error creating chatbot:', err);
    next(err);
  }
});

/**
 * @route PUT /api/chatbots/:id
 * @desc Update a chatbot, verifying user ownership
 * @access Private
 */
router.put('/:id', isAuthenticated, belongsToUser('chatbot'), async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    console.log(`[API] Updating chatbot ${chatbotId} for user ${req.user.email}`);
    
    const {
      name,
      description,
      prompt_template,
      system_message,
      max_context_length,
      temperature,
      is_active,
      customization
    } = req.body;
    
    // Update chatbot and customization in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update chatbot
      const updatedChatbot = await tx.chatbot.update({
        where: { id: chatbotId },
        data: {
          name,
          description,
          prompt_template,
          system_message,
          max_context_length,
          temperature,
          is_active
        },
        include: {
          customization: true,
          integrations: true
        }
      });
      
      // Update customization if provided
      if (customization) {
        if (updatedChatbot.customization) {
          await tx.chatbotCustomization.update({
            where: { chatbot_id: chatbotId },
            data: customization
          });
        } else {
          await tx.chatbotCustomization.create({
            data: {
              ...customization,
              chatbot_id: chatbotId
            }
          });
        }
      }
      
      return updatedChatbot;
    });
    
    console.log(`[API] Chatbot ${chatbotId} updated successfully`);
    res.json({ chatbot: result });
  } catch (err) {
    console.error(`[API] Error updating chatbot ${req.params.id}:`, err);
    next(err);
  }
});

/**
 * @route DELETE /api/chatbots/:id
 * @desc Delete a chatbot, verifying user ownership
 * @access Private
 */
router.delete('/:id', isAuthenticated, isAdmin, belongsToUser('chatbot'), async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    console.log(`[API] Deleting chatbot ${chatbotId} for user ${req.user.email}`);
    
    // Delete chatbot and all related data
    await prisma.chatbot.delete({
      where: { id: chatbotId }
    });
    
    console.log(`[API] Chatbot ${chatbotId} deleted successfully`);
    res.json({ message: 'Chatbot deleted successfully' });
  } catch (err) {
    console.error(`[API] Error deleting chatbot ${req.params.id}:`, err);
    next(err);
  }
});

/**
 * @route POST /api/chatbots/:id/chat
 * @desc Generate a chat response
 * @access Public (but requires API key) or Private (if authenticated)
 */
router.post('/:id/chat', async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    const { message, conversation_id, visitor_id, metadata } = req.body;
    const apiKey = req.headers['x-api-key'];
    const requestOrigin = req.headers.origin || req.headers.referer || '';
    let userId = null;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    if (!visitor_id) {
      return res.status(400).json({ message: 'Visitor ID is required' });
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

    // User authentication check - either via API key or JWT
    if (apiKey) {
      // Validate API key 
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
      // Optional domain enforcement: if a specific domain is configured, ensure origin matches
      if (integration.domain && integration.domain !== '*' && requestOrigin) {
        try {
          const originUrl = new URL(requestOrigin);
          const originHost = originUrl.hostname.toLowerCase();
          const allowed = integration.domain.toLowerCase();
          const matches = originHost === allowed || originHost.endsWith(`.${allowed}`);
          if (!matches) {
            return res.status(403).json({ message: 'Origin not allowed for this API key' });
          }
        } catch (_) {
          // If origin is malformed, reject
          return res.status(403).json({ message: 'Invalid origin' });
        }
      }
      
      // Use the chatbot owner's user ID
      userId = chatbot.user_id;
    } else if (req.user) {
      // If user is authenticated via JWT, ensure they own this chatbot
      if (req.user.userId !== chatbot.user_id && !req.user.isPlatformAdmin) {
        return res.status(403).json({ message: 'You do not have permission to access this chatbot' });
      }
      
      userId = req.user.userId;
    } else {
      // For public access, use the chatbot owner's user ID
      userId = chatbot.user_id;
    }

    // Ensure we have a valid user ID at this point
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Enforce owner subscription (active or trialing) even for public widget usage
    const ownerSub = await prisma.userSubscription.findUnique({
      where: { user_id: chatbot.user_id }
    });
    const ownerActive = ownerSub && ['active', 'trialing'].includes(ownerSub.status);
    if (!ownerActive) {
      return res.status(402).json({ message: 'Chatbot is unavailable due to inactive subscription' });
    }
    
  // Enforce monthly usage limits when authenticated calls (best-effort for public as well)
  try {
    if (req.user) {
      const { enforceMonthlyUsageLimit } = require('../middleware/limits');
      await new Promise((resolve, reject) => enforceMonthlyUsageLimit(req, res, (err) => err ? reject(err) : resolve()));
    }
  } catch (limitErr) {
    return; // Response already sent by limiter
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
      
      // Security check - ensure conversation belongs to the correct user
      if (conversation.user_id !== userId) {
        return res.status(403).json({ message: 'You do not have permission to access this conversation' });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          chatbot_id: chatbotId,
          visitor_id: visitor_id,
          user_id: userId, // Ensure user_id is set to the authenticated user or chatbot owner
          status: 'active',
          metadata: metadata || {},
          source_url: req.body.source_url
        },
        include: {
          messages: true
        }
      });
    }
    
    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        chatbot_id: chatbotId,
        user_id: userId,
        role: 'user',
        content: message
      }
    });
    
    // Get conversation history (limited by max_context_length)
    const history = await prisma.message.findMany({
      where: {
        conversation_id: conversation.id
      },
      orderBy: {
        created_at: 'desc'
      },
      take: (chatbot.max_context_length * 2) - 1 // Multiply by 2 to get pairs of messages, minus 1 for the new message
    });
    
    // Generate AI response
    const aiResponse = await generateChatResponse(
      chatbot,
      message,
      history.reverse().map(m => ({ role: m.role, content: m.content }))
    );
    
    // Save AI message with token count
    const botMessage = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        chatbot_id: chatbotId,
        user_id: userId,
        role: 'assistant',
        content: aiResponse.message,
        tokens_used: aiResponse.tokensUsed
      }
    });
    
    // Track usage
    await prisma.apiUsage.upsert({
      where: {
        id: `${chatbot.user_id}-${chatbotId}-${new Date().toISOString().split('T')[0]}`
      },
      update: {
        messages_count: { increment: 1 },
        tokens_used: { increment: aiResponse.tokensUsed }
      },
      create: {
        id: `${chatbot.user_id}-${chatbotId}-${new Date().toISOString().split('T')[0]}`,
        user_id: chatbot.user_id,
        chatbot_id: chatbotId,
        date: new Date(),
        messages_count: 1,
        tokens_used: aiResponse.tokensUsed
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        chatbot_id: chatbotId,
        conversation_id: conversation.id,
        event_type: 'message',
        event_data: {
          message_type: 'ai_response',
          tokens_used: aiResponse.tokensUsed
        },
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      }
    });
    
    res.json({
      message: aiResponse.message,
      conversation_id: conversation.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/chatbots/test-query
 * @desc Test a query against documents without needing a chatbot
 * @access Public (for testing)
 */
router.post('/test-query', async (req, res, next) => {
  try {
    const { query, document_ids } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return res.status(400).json({ message: 'At least one document ID is required' });
    }
    
    // Check if documents exist and are processed
    const documents = await prisma.document.findMany({
      where: {
        id: { in: document_ids },
        status: 'processed'
      },
      select: {
        id: true,
        name: true
      }
    });
    
    if (documents.length === 0) {
      return res.status(404).json({ message: 'No processed documents found with the provided IDs' });
    }
    
    // Create a temporary chatbot-like object for the generateChatResponse function
    const tempChatbot = {
      id: 'test-' + Date.now(),
      active_document_ids: documents.map(doc => doc.id),
      system_message: 'You are a helpful assistant answering questions based on the provided documents.',
      temperature: 0.5,
      model: 'gpt-4o'
    };
    
    // Generate response with RAG
    const { generateChatResponse } = require('../services/ai');
    const response = await generateChatResponse(tempChatbot, query, []);
    
    res.json({
      message: response.message,
      tokens_used: response.tokens,
      documents_used: response.documents_used
    });
  } catch (err) {
    console.error('Error in test-query endpoint:', err);
    next(err);
  }
});

module.exports = router;
