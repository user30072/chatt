const express = require('express');
const router = express.Router();
const { stripe, verifyWebhookSignature } = require('../lib/stripe');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configure body parser for raw body (needed for Stripe webhook signature verification)
const stripeWebhookMiddleware = express.json({
  verify: verifyWebhookSignature(process.env.STRIPE_WEBHOOK_SECRET),
  raw: true
});

/**
 * @route POST /api/webhooks/stripe
 * @desc Handle Stripe webhook events
 * @access Public
 */
router.post('/stripe', stripeWebhookMiddleware, async (req, res, next) => {
  try {
    const event = req.stripeEvent;
    
    console.log('Stripe webhook received:', event.type);
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;
        
        // Find user subscription by Stripe customer ID
        const userSub = await prisma.userSubscription.findFirst({
          where: { stripe_customer_id: stripeCustomerId },
          include: { user: true }
        });
        
        if (!userSub) {
          console.error('User subscription not found for Stripe customer:', stripeCustomerId);
          return res.status(200).send('No matching subscription found');
        }
        
        // Update subscription status and period in our database
        await prisma.userSubscription.update({
          where: { user_id: userSub.user_id },
          data: {
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000)
          }
        });
        
        console.log(`Subscription ${subscription.id} updated for user ${userSub.user?.email || userSub.user_id}`);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Find user subscription by Stripe subscription ID
        const userSub = await prisma.userSubscription.findFirst({
          where: { stripe_subscription_id: subscription.id }
        });
        
        if (userSub) {
          // Update subscription status to canceled
          await prisma.userSubscription.update({
            where: { user_id: userSub.user_id },
            data: { status: 'canceled' }
          });
          
          console.log(`Subscription ${subscription.id} marked as canceled`);
        }
        break;
      }
      
      case 'customer.subscription.trial_will_end': {
        // Sent 3 days before trial ends
        const subscription = event.data.object;
        
        // Find user subscription by Stripe subscription ID
        const userSub = await prisma.userSubscription.findFirst({
          where: { stripe_subscription_id: subscription.id },
          include: { user: true }
        });
        
        if (userSub) {
          // Here you would send an email to notify the user that trial is ending
          console.log(`Trial ending soon for user ${userSub.user?.email || userSub.user_id}`);
          // You could implement email notification logic here
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        if (invoice.billing_reason === 'subscription_create' || 
            invoice.billing_reason === 'subscription_update' ||
            invoice.billing_reason === 'subscription_cycle') {
          
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          
          // Find user subscription by Stripe subscription ID
          const userSub = await prisma.userSubscription.findFirst({
            where: { stripe_subscription_id: invoice.subscription }
          });
          
          if (userSub) {
            // Update subscription status to active (in case it was past_due)
            await prisma.userSubscription.update({
              where: { user_id: userSub.user_id },
              data: { status: 'active' }
            });
            
            console.log(`Payment succeeded for subscription ${invoice.subscription}`);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        // Find user subscription by Stripe subscription ID
        const userSub = await prisma.userSubscription.findFirst({
          where: { stripe_subscription_id: invoice.subscription },
          include: { user: true }
        });
        
        if (userSub) {
          // Update subscription status to past_due
          await prisma.userSubscription.update({
            where: { user_id: userSub.user_id },
            data: { status: 'past_due' }
          });
          
          console.log(`Payment failed for subscription ${invoice.subscription}`);
          // You could implement email notification logic here
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

module.exports = router; 