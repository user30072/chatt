// src/routes/organizations.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

/**
 * @route GET /api/organizations
 * @desc Get organization details
 * @access Private
 */
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.orgId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Get usage statistics
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const usage = await prisma.apiUsage.aggregate({
      where: {
        organization_id: req.user.orgId,
        date: {
          gte: startOfMonth,
        },
      },
      _sum: {
        messages_count: true,
        tokens_used: true,
      },
    });

    // Count users
    const userCount = await prisma.user.count({
      where: {
        organization_id: req.user.orgId,
      },
    });

    // Count chatbots
    const chatbotCount = await prisma.chatbot.count({
      where: {
        organization_id: req.user.orgId,
      },
    });

    res.json({
      ...organization,
      statistics: {
        userCount,
        chatbotCount,
        monthlyUsage: {
          messages: usage._sum.messages_count || 0,
          tokens: usage._sum.tokens_used || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/organizations
 * @desc Update organization (admin only)
 * @access Private (Admin only)
 */
router.put('/', isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: req.user.orgId },
      data: { name },
    });

    res.json(updatedOrganization);
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/organizations/usage
 * @desc Get organization usage statistics
 * @access Private
 */
router.get('/usage', isAuthenticated, async (req, res, next) => {
  try {
    const { period = 'month', start_date, end_date } = req.query;

    let startDate, endDate;
    const today = new Date();

    // Calculate date range based on period
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else if (period === 'week') {
      // Last 7 days
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      endDate = today;
    } else if (period === 'month') {
      // Current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
    } else if (period === 'year') {
      // Current year
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = today;
    } else {
      return res.status(400).json({ message: 'Invalid period specified' });
    }

    // Get daily usage
    const dailyUsage = await prisma.apiUsage.findMany({
      where: {
        organization_id: req.user.orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get totals
    const totals = await prisma.apiUsage.aggregate({
      where: {
        organization_id: req.user.orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        messages_count: true,
        tokens_used: true,
      },
    });

    // Get usage by chatbot
    const chatbotUsage = await prisma.apiUsage.groupBy({
      by: ['chatbot_id'],
      where: {
        organization_id: req.user.orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        messages_count: true,
        tokens_used: true,
      },
    });

    // Get chatbot details
    const chatbots = await prisma.chatbot.findMany({
      where: {
        id: {
          in: chatbotUsage.map(u => u.chatbot_id).filter(id => id !== null),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Combine chatbot usage with names
    const chatbotUsageWithNames = chatbotUsage.map(usage => {
      const chatbot = chatbots.find(c => c.id === usage.chatbot_id);
      return {
        chatbot_id: usage.chatbot_id,
        chatbot_name: chatbot ? chatbot.name : 'Unknown',
        messages: usage._sum.messages_count,
        tokens: usage._sum.tokens_used,
      };
    });

    res.json({
      period: {
        start: startDate,
        end: endDate,
      },
      daily: dailyUsage,
      totals: {
        messages: totals._sum.messages_count || 0,
        tokens: totals._sum.tokens_used || 0,
      },
      by_chatbot: chatbotUsageWithNames,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;