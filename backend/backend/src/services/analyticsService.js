// src/services/analyticsService.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AnalyticsService {
  // Get summary metrics for an organization
  async getSummaryMetrics(organizationId, period = 'week') {
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate;
      
      switch (period) {
        case 'day':
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(endDate);
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date(endDate);
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 7);
      }
      
      // Get conversation count
      const conversationCount = await prisma.conversation.count({
        where: {
          chatbot: {
            organization_id: organizationId
          },
          created_at: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      // Get message count
      const messageCount = await prisma.message.count({
        where: {
          conversation: {
            chatbot: {
              organization_id: organizationId
            },
            created_at: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      });
      
      // Return the metrics
      return {
        conversationCount,
        messageCount
      };
    } catch (error) {
      console.error('Error getting summary metrics:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();