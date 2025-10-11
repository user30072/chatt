const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe customer for a new user
 * @param {Object} user - User data
 * @param {String} user.email - User's email
 * @param {String} user.firstName - User's first name
 * @param {String} user.lastName - User's last name
 * @returns {Promise<Object>} Stripe customer object
 */
async function createCustomer(user) {
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user.id,
        organizationId: user.organizationId
      }
    });
    
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Create a subscription with a free trial period
 * @param {String} customerId - Stripe customer ID
 * @param {String} priceId - Stripe price ID
 * @param {Number} trialDays - Number of days for the trial
 * @returns {Promise<Object>} Stripe subscription object
 */
async function createTrialSubscription(customerId, priceId, trialDays = 7) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      }
    });
    
    return subscription;
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    throw error;
  }
}

/**
 * Create a checkout session for subscription payment
 * @param {String} customerId - Stripe customer ID
 * @param {String} priceId - Stripe price ID
 * @param {String} successUrl - URL to redirect after successful payment
 * @param {String} cancelUrl - URL to redirect after cancelled payment
 * @returns {Promise<Object>} Stripe checkout session
 */
async function createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Reactivate a canceled subscription
 * @param {String} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Updated Stripe subscription
 */
async function reactivateSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (subscription.status === 'canceled') {
      // If canceled, create a new subscription
      return await stripe.subscriptions.create({
        customer: subscription.customer,
        items: subscription.items.data.map(item => ({
          price: item.price.id,
        })),
      });
    } else if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Already active, nothing to do
      return subscription;
    } else {
      // For other statuses (like past_due, unpaid), reactivate
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        billing_cycle_anchor: 'now',
      });
    }
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription at period end
 * @param {String} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Updated Stripe subscription
 */
async function cancelSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Generate webhook signature verification function
 * @param {String} webhookSecret - Stripe webhook secret
 * @returns {Function} Verification function
 */
function verifyWebhookSignature(webhookSecret) {
  return (req, res, buffer) => {
    const signature = req.headers['stripe-signature'];
    
    try {
      const event = stripe.webhooks.constructEvent(
        buffer.toString(),
        signature,
        webhookSecret
      );
      req.stripeEvent = event;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  };
}

module.exports = {
  createCustomer,
  createTrialSubscription,
  createCheckoutSession,
  reactivateSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  stripe
}; 