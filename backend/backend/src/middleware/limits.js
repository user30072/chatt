const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserPlanLimits } = require('../utils/planLimits');

async function enforceChatbotCreationLimit(req, res, next) {
  try {
    const limits = await getUserPlanLimits(req.user.userId);
    const count = await prisma.chatbot.count({ where: { user_id: req.user.userId } });
    if (count >= limits.maxChatbots) {
      return res.status(402).json({ message: 'Chatbot limit reached for your plan' });
    }
    next();
  } catch (e) {
    next(e);
  }
}

async function enforceMonthlyUsageLimit(req, res, next) {
  try {
    const limits = await getUserPlanLimits(req.user ? req.user.userId : null);
    if (!req.user) return next();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = await prisma.apiUsage.aggregate({
      where: { user_id: req.user.userId, date: { gte: startOfMonth } },
      _sum: { messages_count: true, tokens_used: true }
    });
    const usedMessages = usage._sum.messages_count || 0;
    const usedTokens = usage._sum.tokens_used || 0;
    if (usedMessages >= limits.monthlyMessages) {
      return res.status(402).json({ message: 'Monthly message limit reached' });
    }
    if (usedTokens >= limits.monthlyTokens) {
      return res.status(402).json({ message: 'Monthly token limit reached' });
    }
    next();
  } catch (e) {
    next(e);
  }
}

async function enforceFileSizeLimit(req, res, next) {
  try {
    const limits = await getUserPlanLimits(req.user.userId);
    if (req.file && req.file.size) {
      const sizeMB = req.file.size / (1024 * 1024);
      if (sizeMB > limits.maxFileSizeMB) {
        return res.status(413).json({ message: `File too large. Max ${limits.maxFileSizeMB} MB` });
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { enforceChatbotCreationLimit, enforceMonthlyUsageLimit, enforceFileSizeLimit };


