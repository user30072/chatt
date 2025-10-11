const express = require('express');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { 
  createCheckoutSession, 
  reactivateSubscription, 
  cancelSubscription,
  stripe
} = require('../lib/stripe');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @route GET /api/subscriptions/plans
 * @desc Get all available subscription plans
 * @access Public
 */
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { is_active: true },
      orderBy: {
        price_monthly: 'asc'
      }
    });
    
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/subscriptions/current
 * @desc Get current organization's subscription
 * @access Private
 */
router.get('/current', isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Get the default trial length from environment variable or use 7 days as default
    const DEFAULT_TRIAL_DAYS = parseInt(process.env.DEFAULT_TRIAL_DAYS || '7');
    
    // Get the user with their subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user has no subscription, create a trial subscription
    if (!user.subscription) {
      // Create trial subscription record
      const trialDays = DEFAULT_TRIAL_DAYS;
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);
      
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          status: 'trial',
          planId: 'trial',
          trialEnd: trialEnd,
          isActive: true
        }
      });
      
      return res.json({ 
        subscription: {
          ...subscription,
          trialDaysRemaining: Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24))
        },
        config: {
          defaultTrialDays: DEFAULT_TRIAL_DAYS
        }
      });
    }
    
    // Calculate trial days remaining if in trial
    let trialDaysRemaining = 0;
    if (user.subscription.status === 'trial' && user.subscription.trialEnd) {
      const trialEnd = new Date(user.subscription.trialEnd);
      const now = new Date();
      trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    }
    
    return res.json({ 
      subscription: {
        ...user.subscription,
        trialDaysRemaining
      },
      config: {
        defaultTrialDays: DEFAULT_TRIAL_DAYS
      }
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route POST /api/subscriptions/checkout
 * @desc Create a checkout session for subscription upgrade
 * @access Private
 */
router.post('/checkout', isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    const { planId, billingInterval = 'monthly' } = req.body;
    
    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }
    
    if (!['monthly', 'yearly'].includes(billingInterval)) {
      return res.status(400).json({ message: 'Billing interval must be monthly or yearly' });
    }
    
    // Check if plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });
    
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    // Get the Stripe price ID based on billing interval
    const stripePriceId = billingInterval === 'monthly' 
      ? plan.stripe_price_monthly 
      : plan.stripe_price_yearly;
    
    if (!stripePriceId) {
      return res.status(400).json({ message: 'Selected plan does not have Stripe pricing configured' });
    }
    
    // Get organization subscription
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organization_id: req.user.orgId }
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // If no Stripe customer ID yet, we can't proceed with checkout
    if (!subscription.stripe_customer_id) {
      return res.status(400).json({ 
        message: 'Organization does not have a payment method set up',
        needsCustomer: true
      });
    }
    
    // URLs for redirect after checkout
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/dashboard?checkout=success`;
    const cancelUrl = `${frontendUrl}/dashboard?checkout=canceled`;
    
    // Create checkout session
    const session = await createCheckoutSession(
      subscription.stripe_customer_id,
      stripePriceId,
      successUrl,
      cancelUrl
    );
    
    // Update plan reference in our database
    await prisma.organizationSubscription.update({
      where: { organization_id: req.user.orgId },
      data: {
        plan_id: planId
      }
    });
    
    res.json({ 
      success: true,
      message: 'Checkout session created',
      sessionId: session.id,
      checkoutUrl: session.url
    });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    next(err);
  }
});

/**
 * @route PUT /api/subscriptions/reactivate
 * @desc Reactivate a canceled subscription
 * @access Private
 */
router.put('/reactivate', isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    // Check if subscription exists
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organization_id: req.user.orgId }
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // If there's no Stripe subscription ID, we can't reactivate with Stripe
    if (!subscription.stripe_subscription_id) {
      // For free trial accounts without payment info yet
      if (subscription.status === 'trialing' || subscription.trial_end) {
        // Extend trial for 7 more days
        const newTrialEnd = new Date();
        newTrialEnd.setDate(newTrialEnd.getDate() + 7);
        
        const updatedSubscription = await prisma.organizationSubscription.update({
          where: { organization_id: req.user.orgId },
          data: {
            status: 'trialing',
            trial_end: newTrialEnd,
            current_period_end: newTrialEnd
          }
        });
        
        return res.json({ 
          success: true,
          message: 'Trial extended for 7 more days',
          subscription: updatedSubscription 
        });
      }
      
      // Just change the status locally
      const updatedSubscription = await prisma.organizationSubscription.update({
        where: { organization_id: req.user.orgId },
        data: {
          status: 'active'
        }
      });
      
      return res.json({ 
        success: true,
        message: 'Subscription reactivated successfully',
        subscription: updatedSubscription 
      });
    }
    
    // If we have a Stripe subscription ID, reactivate through Stripe
    const reactivated = await reactivateSubscription(subscription.stripe_subscription_id);
    
    // Update our records
    const updatedSubscription = await prisma.organizationSubscription.update({
      where: { organization_id: req.user.orgId },
      data: {
        status: reactivated.status,
        current_period_start: new Date(reactivated.current_period_start * 1000),
        current_period_end: new Date(reactivated.current_period_end * 1000)
      }
    });
    
    res.json({ 
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: updatedSubscription 
    });
  } catch (err) {
    console.error('Error reactivating subscription:', err);
    next(err);
  }
});

/**
 * @route PUT /api/subscriptions/cancel
 * @desc Cancel current subscription
 * @access Private
 */
router.put('/cancel', isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    // Check if subscription exists
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organization_id: req.user.orgId }
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // If there's no Stripe subscription ID, just update status locally
    if (!subscription.stripe_subscription_id) {
      const updatedSubscription = await prisma.organizationSubscription.update({
        where: { organization_id: req.user.orgId },
        data: {
          status: 'canceled'
        }
      });
      
      return res.json({ 
        success: true,
        message: 'Subscription canceled successfully',
        subscription: updatedSubscription 
      });
    }
    
    // Cancel through Stripe
    const canceled = await cancelSubscription(subscription.stripe_subscription_id);
    
    // Update our records
    const updatedSubscription = await prisma.organizationSubscription.update({
      where: { organization_id: req.user.orgId },
      data: {
        status: 'canceled'
      }
    });
    
    res.json({ 
      success: true,
      message: 'Subscription canceled successfully',
      subscription: updatedSubscription 
    });
  } catch (err) {
    console.error('Error canceling subscription:', err);
    next(err);
  }
});

/**
 * @route POST /api/subscriptions/webhook
 * @desc Handle subscription webhook events from payment provider
 * @access Public
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle specific events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // Extract metadata from the session
      const { userId, planId } = session.metadata || {};
      
      if (userId) {
        try {
          // Get subscription ID from the session
          const subscriptionId = session.subscription;
          
          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Update or create subscription in database
          await prisma.subscription.upsert({
            where: { userId: parseInt(userId) },
            update: {
              stripe_subscription_id: subscriptionId,
              status: 'active',
              planId: planId || 'pro',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              isActive: true
            },
            create: {
              userId: parseInt(userId),
              stripe_subscription_id: subscriptionId,
              status: 'active',
              planId: planId || 'pro',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              isActive: true
            }
          });
          
          console.log(`Subscription updated for user ${userId}`);
        } catch (error) {
          console.error('Error processing checkout.session.completed:', error);
        }
      }
      break;
      
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object;
      const stripeCustomerId = updatedSubscription.customer;
      
      try {
        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId },
          include: { subscription: true }
        });
        
        if (user) {
          // Update subscription status based on the event
          await prisma.subscription.update({
            where: { userId: user.id },
            data: {
              status: updatedSubscription.status,
              currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
              isActive: updatedSubscription.status === 'active'
            }
          });
          
          console.log(`Subscription updated for customer ${stripeCustomerId}`);
        }
      } catch (error) {
        console.error('Error processing customer.subscription.updated:', error);
      }
      break;
      
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      const customerIdForDeleted = deletedSubscription.customer;
      
      try {
        // Find user by Stripe customer ID
        const userForDeleted = await prisma.user.findFirst({
          where: { stripeCustomerId: customerIdForDeleted },
          include: { subscription: true }
        });
        
        if (userForDeleted && userForDeleted.subscription) {
          // Update subscription to reflect cancellation
          await prisma.subscription.update({
            where: { userId: userForDeleted.id },
            data: {
              status: 'canceled',
              isActive: false
            }
          });
          
          console.log(`Subscription canceled for customer ${customerIdForDeleted}`);
        }
      } catch (error) {
        console.error('Error processing customer.subscription.deleted:', error);
      }
      break;
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

/**
 * @route POST /api/subscriptions/setup-payment
 * @desc Create a setup session for adding a payment method
 * @access Private
 */
router.post('/setup-payment', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create a SetupIntent to securely collect payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId || undefined,
      payment_method_types: ['card'],
      metadata: {
        userId: user.id,
        email: user.email
      }
    });
    
    // If no Stripe customer yet, create one and associate with user
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: {
          userId: user.id
        }
      });
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId: customer.id
        }
      });
    }
    
    return res.json({
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return res.status(500).json({ message: 'Failed to setup payment method' });
  }
});

/**
 * @route POST /api/subscriptions/cancel
 * @desc Cancel current subscription
 * @access Private
 */
router.post('/cancel', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });
    
    if (!user || !user.subscription || !user.subscription.stripe_subscription_id) {
      return res.status(404).json({ message: 'No active subscription found' });
    }
    
    // Cancel subscription in Stripe
    await stripe.subscriptions.del(user.subscription.stripe_subscription_id);
    
    // Update local database
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'canceled',
        isActive: false
      }
    });
    
    return res.json({ message: 'Subscription successfully canceled' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

/**
 * @route POST /api/subscriptions/upgrade
 * @desc Create a Stripe checkout session for upgrading
 * @access Private
 */
router.post('/upgrade', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId = 'pro' } = req.body; // Default to pro plan if not specified
    
    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Set price ID based on selected plan
    let priceId;
    let productName;
    
    switch (planId) {
      case 'basic':
        priceId = process.env.STRIPE_BASIC_PRICE_ID;
        productName = 'Basic Plan';
        break;
      case 'enterprise':
        priceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;
        productName = 'Enterprise Plan';
        break;
      case 'pro':
      default:
        priceId = process.env.STRIPE_PRO_PRICE_ID;
        productName = 'Professional Plan';
        break;
    }
    
    if (!priceId) {
      return res.status(400).json({ message: 'Invalid plan selected or plan not configured' });
    }
    
    // Create metadata to identify the user when Stripe sends webhooks
    const metadata = {
      userId: user.id,
      email: user.email,
      planId
    };
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?checkout=canceled`,
      metadata
    });
    
    // Return checkout URL to the client
    return res.json({
      checkoutUrl: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ message: 'Failed to create checkout session' });
  }
});

module.exports = router; 