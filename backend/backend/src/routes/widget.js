const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const chatService = require('../services/chatService');

const prisma = new PrismaClient();

// Middleware to authenticate widget requests
const authenticateWidget = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    const integration = await prisma.website_integration.findFirst({
      where: { api_key: apiKey },
    });

    if (!integration || !integration.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    req.chatbotId = integration.chatbot_id;
    next();
  } catch (error) {
    next(error);
  }
};

// Get widget configuration
router.get('/config', authenticateWidget, async (req, res, next) => {
  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: req.chatbotId },
      include: {
        customization: true,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    res.json({
      theme: {
        primaryColor: chatbot.customization.theme_color,
        fontFamily: chatbot.customization.font_family,
        logoUrl: chatbot.customization.logo_url,
        bubbleIcon: chatbot.customization.chat_bubble_icon_url,
      },
      i18n: {
        greeting: chatbot.customization.greeting_message,
        placeholder: chatbot.customization.placeholder_text,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Process chat message
router.post('/chat', authenticateWidget, async (req, res, next) => {
  try {
    const { message, conversationId, visitorInfo } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await chatService.processMessage(
      req.chatbotId,
      conversationId,
      message,
      visitorInfo
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Track events
router.post('/event', authenticateWidget, async (req, res, next) => {
  try {
    const { eventType, eventData, conversationId, visitorId } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    await prisma.analytics_event.create({
      data: {
        chatbot_id: req.chatbotId,
        conversation_id: conversationId,
        event_type: eventType,
        event_data: eventData || {},
        user_agent: req.headers['user-agent'],
        ip_address: req.ip,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;