'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { CheckIcon } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [processingPlan, setProcessingPlan] = useState(null);

  const handleUpgrade = async (planId) => {
    setProcessingPlan(planId);
    
    try {
      // If user is not logged in, redirect to login page
      if (!user) {
        router.push('/login?returnUrl=/pricing');
        return;
      }
      
      // In a real implementation, this would call an API endpoint
      // Since it's not implemented yet, we'll just show a mock success message
      alert('This is a demo. In production, this would redirect to a payment gateway.');
      
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error processing upgrade:', error);
    } finally {
      setProcessingPlan(null);
    }
  };

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '$9',
      features: [
        '10 Chatbots',
        '1,000 messages per month',
        'Basic analytics',
        'Email support',
        '5 documents per chatbot'
      ],
      cta: 'Start Basic',
      recommended: false
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$29',
      features: [
        'Unlimited Chatbots',
        '10,000 messages per month',
        'Advanced analytics',
        'Priority support',
        '50 documents per chatbot',
        'Custom branding'
      ],
      cta: 'Go Pro',
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Contact Us',
      features: [
        'Unlimited everything',
        'Dedicated account manager',
        'Custom integrations',
        'SLA & uptime guarantee',
        'Advanced security features',
        'On-premise deployment option'
      ],
      cta: 'Contact Sales',
      recommended: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Upgrade Your Plan
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Choose the perfect plan for your needs
          </p>
          
          {user?.email && (
            <p className="mt-2 text-sm text-gray-600">
              You're currently logged in as: {user.email}
            </p>
          )}
        </div>

        <div className="mt-12 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-1 sm:gap-6 lg:grid-cols-3 lg:max-w-5xl lg:mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                selectedPlan === plan.id ? 'border-blue-500' : 'border-transparent'
              } ${plan.recommended ? 'ring-2 ring-blue-500' : ''}`}
            >
              {plan.recommended && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">
                  Recommended
                </span>
              )}
              <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
              <p className="mt-4 text-3xl font-bold text-gray-900">{plan.price}</p>
              <p className="mt-1 text-sm text-gray-500">per month</p>
              
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700">{feature}</p>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8">
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={processingPlan === plan.id}
                  className={`w-full ${
                    plan.recommended 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-800 hover:bg-gray-900 text-white'
                  }`}
                >
                  {processingPlan === plan.id ? 'Processing...' : plan.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <Button
            onClick={() => router.push(user ? '/dashboard' : '/')}
            variant="outline"
            className="mt-4"
          >
            {user ? 'Return to Dashboard' : 'Back to Home'}
          </Button>
        </div>
      </div>
    </div>
  );
} 