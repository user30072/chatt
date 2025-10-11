const jwt = require('jsonwebtoken');
const { prisma } = require('../db');

/**
 * IMPORTANT: This application has been refactored to use user-based permissions
 * rather than organization-based permissions. All references to organizations
 * have been removed and resources are now directly associated with users.
 */

/**
 * Middleware to authenticate JWT tokens
 */
const isAuthenticated = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    // Verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Middleware to check if user is an admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied, admin privileges required' });
  }
  next();
};

/**
 * Middleware to check if user is a platform admin
 */
const isPlatformAdmin = (req, res, next) => {
  if (!req.user.isPlatformAdmin) {
    return res.status(403).json({ message: 'Access denied, platform admin privileges required' });
  }
  next();
};

/**
 * Middleware to check if user has an active subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const hasActiveSubscription = async (req, res, next) => {
  try {
    // Skip check for platform admins
    if (req.user.isPlatformAdmin) {
      return next();
    }
    
    // Get user subscription
    const subscription = await prisma.userSubscription.findUnique({
      where: { user_id: req.user.userId }
    });
    
    if (!subscription) {
      return res.status(403).json({ 
        message: 'Subscription not found',
        code: 'subscription_missing'
      });
    }
    
    // Check if subscription is active (either paid or on trial)
    const isActive = ['active', 'trialing'].includes(subscription.status);
    
    if (!isActive) {
      // Consider grace period - 2 days after expiry
      let hasGracePeriod = false;
      
      if (subscription.current_period_end) {
        const gracePeriodEnd = new Date(subscription.current_period_end);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2); // Add 2 days grace period
        
        if (new Date() < gracePeriodEnd) {
          hasGracePeriod = true;
        }
      }
      
      if (!hasGracePeriod) {
        return res.status(402).json({ 
          message: 'Subscription inactive',
          code: 'subscription_inactive',
          status: subscription.status
        });
      }
      
      // User is in grace period - log but allow access
      console.log(`User in grace period: ${req.user.email}, username: ${req.user.username}`);
    }
    
    next();
  } catch (error) {
    console.error('Error checking subscription status:', error);
    next(error);
  }
};

/**
 * Middleware to check if user has an active subscription or is on trial
 */
const hasActiveSubscriptionOrTrial = async (req, res, next) => {
  try {
    // Skip check for platform admins
    if (req.user.isPlatformAdmin) {
      return next();
    }
    
    // Get user subscription
    const subscription = await prisma.userSubscription.findUnique({
      where: { user_id: req.user.userId }
    });
    
    // If no subscription found, check if user was created in the last 7 days
    // and automatically grant trial access
    if (!subscription) {
      // Get user creation date
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { created_at: true }
      });
      
      if (user) {
        const creationDate = new Date(user.created_at);
        const trialEndDate = new Date(creationDate);
        trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 day trial
        
        // If within trial period, allow access
        if (new Date() < trialEndDate) {
          console.log(`Auto-granting trial access to new user: ${req.user.email}, registered: ${creationDate.toISOString()}`);
          return next();
        }
      }
      
      return res.status(403).json({ 
        message: 'Subscription not found',
        code: 'subscription_missing'
      });
    }
    
    // Check if subscription is active or on trial
    const isActiveOrTrial = ['active', 'trialing'].includes(subscription.status);
    
    if (!isActiveOrTrial) {
      // Consider grace period - 2 days after expiry
      let hasGracePeriod = false;
      
      if (subscription.current_period_end) {
        const gracePeriodEnd = new Date(subscription.current_period_end);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2); // Add 2 days grace period
        
        if (new Date() < gracePeriodEnd) {
          hasGracePeriod = true;
        }
      }
      
      if (!hasGracePeriod) {
        return res.status(402).json({ 
          message: 'Subscription inactive',
          code: 'subscription_inactive',
          status: subscription.status
        });
      }
      
      // User is in grace period - log but allow access
      console.log(`User in grace period: ${req.user.email}, username: ${req.user.username}`);
    }
    
    next();
  } catch (error) {
    console.error('Error checking subscription status:', error);
    next(error);
  }
};

/**
 * Middleware to check if user has a payment method on file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const hasPaymentMethod = async (req, res, next) => {
  try {
    // Skip check for platform admins
    if (req.user.isPlatformAdmin) {
      return next();
    }
    
    // Get user subscription
    const subscription = await prisma.userSubscription.findUnique({
      where: { user_id: req.user.userId }
    });
    
    if (!subscription) {
      return res.status(402).json({ 
        message: 'Subscription not found',
        code: 'payment_required',
        type: 'missing_subscription'
      });
    }
    
    // If no Stripe customer ID or no subscription ID, payment method is required
    if (!subscription.stripe_customer_id || !subscription.stripe_subscription_id) {
      return res.status(402).json({ 
        message: 'Payment method required',
        code: 'payment_required',
        type: 'no_payment_method'
      });
    }
    
    // User has a payment method on file
    next();
  } catch (error) {
    console.error('Error checking payment method:', error);
    next(error);
  }
};

/**
 * Middleware to check if a resource belongs to the current user
 * @param {string} resourceType - Type of resource to check (e.g., 'chatbot', 'document')
 * @param {string} paramName - Name of the request parameter containing the resource ID (default: 'id')
 * @returns {Function} - Express middleware function
 */
const belongsToUser = (resourceType, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        return res.status(400).json({ message: `Missing ${paramName} parameter` });
      }
      
      // Skip check for platform admins
      if (req.user.isPlatformAdmin) {
        return next();
      }
      
      // Determine model and field name based on resourceType
      let model, userField;
      
      switch (resourceType) {
        case 'chatbot':
          model = prisma.chatbot;
          userField = 'user_id';
          break;
        case 'document':
          model = prisma.document;
          userField = 'user_id';
          break;
        case 'conversation':
          model = prisma.conversation;
          userField = 'user_id';
          break;
        default:
          return res.status(500).json({ message: `Invalid resource type: ${resourceType}` });
      }
      
      // Find the resource
      const resource = await model.findUnique({
        where: { id: resourceId },
        select: { [userField]: true }
      });
      
      // Check if resource exists
      if (!resource) {
        return res.status(404).json({ message: `${resourceType} not found` });
      }
      
      // Check if resource belongs to the current user
      if (resource[userField] !== req.user.userId) {
        return res.status(403).json({ 
          message: `You do not have permission to access this ${resourceType}` 
        });
      }
      
      next();
    } catch (error) {
      console.error(`Error in belongsToUser middleware:`, error);
      next(error);
    }
  };
};

// Alias for backwards compatibility
const authenticate = isAuthenticated;
const isOrganizationAdmin = isAdmin;

// Export all middleware functions
module.exports = {
  isAuthenticated,
  isAdmin,
  isPlatformAdmin,
  hasActiveSubscription,
  hasActiveSubscriptionOrTrial,
  hasPaymentMethod,
  belongsToUser,
  // Aliases for backwards compatibility
  authenticate,
  isOrganizationAdmin
};
