/**
 * Create Subscription Plans Script
 * 
 * This script creates default subscription plans in the database.
 * You can run this script to initialize the subscription system.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default subscription plans
const subscriptionPlans = [
  {
    name: 'Basic',
    description: 'Basic plan for small teams',
    price_monthly: 9.99,
    price_yearly: 99.99,
    stripe_price_monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    stripe_price_yearly: process.env.STRIPE_PRICE_BASIC_YEARLY,
    trial_days: 7,
    is_active: true,
    features: {
      message_limit: 1000,
      token_limit: 100000,
      chatbots: 1,
      documents: 10
    }
  },
  {
    name: 'Professional',
    description: 'Professional plan for growing businesses',
    price_monthly: 29.99,
    price_yearly: 299.99,
    stripe_price_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripe_price_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    trial_days: 7,
    is_active: true,
    features: {
      message_limit: 5000,
      token_limit: 500000,
      chatbots: 5,
      documents: 50
    }
  },
  {
    name: 'Enterprise',
    description: 'Enterprise plan for large organizations',
    price_monthly: 99.99,
    price_yearly: 999.99,
    stripe_price_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    stripe_price_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    trial_days: 14,
    is_active: true,
    features: {
      message_limit: 20000,
      token_limit: 2000000,
      chatbots: 'unlimited',
      documents: 'unlimited'
    }
  }
];

async function createSubscriptionPlans() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    
    console.log('Creating subscription plans...');
    
    // Create plans
    for (const plan of subscriptionPlans) {
      // Check if plan with this name already exists
      const existingPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: plan.name }
      });
      
      if (existingPlan) {
        console.log(`Plan "${plan.name}" already exists, updating...`);
        await prisma.subscriptionPlan.update({
          where: { id: existingPlan.id },
          data: {
            description: plan.description,
            price_monthly: plan.price_monthly,
            price_yearly: plan.price_yearly,
            stripe_price_monthly: plan.stripe_price_monthly,
            stripe_price_yearly: plan.stripe_price_yearly,
            trial_days: plan.trial_days,
            is_active: plan.is_active,
            features: plan.features
          }
        });
      } else {
        console.log(`Creating new plan "${plan.name}"...`);
        await prisma.subscriptionPlan.create({
          data: plan
        });
      }
    }
    
    console.log('Subscription plans created or updated successfully');
    
    // Get all plans
    const allPlans = await prisma.subscriptionPlan.findMany();
    console.log(`Total plans in database: ${allPlans.length}`);
    allPlans.forEach(plan => {
      console.log(`- ${plan.name}: $${plan.price_monthly}/month or $${plan.price_yearly}/year`);
    });
    
  } catch (error) {
    console.error('Error creating subscription plans:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createSubscriptionPlans()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 