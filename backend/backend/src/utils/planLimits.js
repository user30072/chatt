const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_LIMITS = {
  maxChatbots: 3,
  monthlyMessages: 1000,
  monthlyTokens: 200000,
  maxFileSizeMB: 10
};

async function getUserPlanLimits(userId) {
  try {
    const sub = await prisma.userSubscription.findUnique({
      where: { user_id: userId },
      include: { plan: true }
    });
    if (!sub || !sub.plan) return DEFAULT_LIMITS;
    const features = sub.plan.features || {};
    return {
      maxChatbots: Number(features.maxChatbots) || DEFAULT_LIMITS.maxChatbots,
      monthlyMessages: Number(features.monthlyMessages) || DEFAULT_LIMITS.monthlyMessages,
      monthlyTokens: Number(features.monthlyTokens) || DEFAULT_LIMITS.monthlyTokens,
      maxFileSizeMB: Number(features.maxFileSizeMB) || DEFAULT_LIMITS.maxFileSizeMB
    };
  } catch (e) {
    return DEFAULT_LIMITS;
  }
}

module.exports = { getUserPlanLimits, DEFAULT_LIMITS };


