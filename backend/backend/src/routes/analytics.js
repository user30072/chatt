// src/routes/analytics.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isOrganizationAdmin } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

const prisma = new PrismaClient();

// Get summary metrics
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    
    const metrics = await analyticsService.getSummaryMetrics(
      req.user.organizationId,
      period
    );
    
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// Get conversation metrics
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const { 
      start_date = '', 
      end_date = '', 
      chatbot_id = '', 
      interval = 'day' 
    } = req.query;
    
    const metrics = await analyticsService.getConversationMetrics(
      req.user.organizationId,
      {
        startDate: start_date ? new Date(start_date) : undefined,
        endDate: end_date ? new Date(end_date) : undefined,
        chatbotId: chatbot_id || undefined,
        interval
      }
    );
    
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// Get usage metrics
router.get('/usage', authenticate, async (req, res, next) => {
  try {
    const { 
      start_date = '', 
      end_date = '', 
      chatbot_id = '', 
      interval = 'day' 
    } = req.query;
    
    const metrics = await analyticsService.getUsageMetrics(
      req.user.organizationId,
      {
        startDate: start_date ? new Date(start_date) : undefined,
        endDate: end_date ? new Date(end_date) : undefined,
        chatbotId: chatbot_id || undefined,
        interval
      }
    );
    
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// Get common topics/keywords
router.get('/topics', authenticate, async (req, res, next) => {
  try {
    const { 
      start_date = '', 
      end_date = '', 
      chatbot_id = '',
      limit = 10
    } = req.query;
    
    const topics = await analyticsService.getCommonTopics(
      req.user.organizationId,
      {
        startDate: start_date ? new Date(start_date) : undefined,
        endDate: end_date ? new Date(end_date) : undefined,
        chatbotId: chatbot_id || undefined,
        limit: parseInt(limit, 10)
      }
    );
    
    res.json(topics);
  } catch (error) {
    next(error);
  }
});

// Get chatbot performance comparison
router.get('/chatbot-comparison', authenticate, isOrganizationAdmin, async (req, res, next) => {
  try {
    const { 
      start_date = '', 
      end_date = ''
    } = req.query;
    
    const comparison = await analyticsService.getChatbotComparison(
      req.user.organizationId,
      {
        startDate: start_date ? new Date(start_date) : undefined,
        endDate: end_date ? new Date(end_date) : undefined
      }
    );
    
    res.json(comparison);
  } catch (error) {
    next(error);
  }
});

module.exports = router;