'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/lib/api';
import Button from '@/components/ui/Button';

export default function TrialWarning({ daysRemaining, onUpgrade }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  // Determine urgency level based on days remaining
  const isUrgent = daysRemaining <= 3;
  
  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the upgrade subscription API
      try {
        const response = await apiService.post('/subscriptions/upgrade');
        
        if (response?.data?.checkoutUrl) {
          // Redirect to Stripe's checkout page
          window.location.href = response.data.checkoutUrl;
          if (onUpgrade) {
            onUpgrade();
          }
          return;
        }
      } catch (apiError) {
        console.log('API endpoint not implemented:', apiError);
        // Continue to fallback
      }
      
      // Fallback if the API doesn't exist or doesn't return a checkout URL
      console.log('Using fallback for subscription upgrade');
      
      // First try to redirect to a dedicated pricing or payment page
      if (window.location.pathname !== '/pricing') {
        router.push('/pricing');
      } else {
        // If we're already on the pricing page, just show a message
        setError('Please contact support to upgrade your subscription.');
        
        // Mock onUpgrade callback if provided
        if (onUpgrade) {
          onUpgrade();
        }
      }
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setError('Failed to process upgrade request. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`${isUrgent ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400'} border-l-4 p-3 md:p-4 ${isUrgent ? 'shadow-sm' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start">
        <div className="flex-shrink-0 hidden sm:block">
          <svg className={`h-5 w-5 ${isUrgent ? 'text-red-400' : 'text-blue-400'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="sm:ml-3 flex-1">
          <div className="flex items-center justify-between mb-1 sm:mb-0">
            <div className="flex items-center">
              <svg className={`h-4 w-4 mr-1 sm:hidden ${isUrgent ? 'text-red-400' : 'text-blue-400'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <p className={`text-sm font-medium ${isUrgent ? 'text-red-800' : 'text-blue-800'}`}>
                {isUrgent 
                  ? <strong>Trial ending soon!</strong> 
                  : <strong>Free Trial Active</strong>}
              </p>
            </div>
            {/* Show a countdown badge for urgency */}
            {isUrgent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
              </span>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className={`mt-1 text-xs sm:text-sm ${isUrgent ? 'text-red-700' : 'text-blue-700'} max-w-lg`}>
              {isUrgent
                ? `Trial expires in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Upgrade now to maintain access.`
                : `${daysRemaining} days remaining in your free trial. Upgrade to unlock all premium features.`
              }
            </p>
            
            <div className="mt-2 sm:mt-0 flex space-x-2 sm:ml-4">
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className={`${isUrgent 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'} text-xs px-2 py-1 h-auto sm:h-8 sm:px-3 sm:py-0`}
                size="sm"
              >
                {loading ? 'Processing...' : 'Upgrade Now'}
              </Button>
              
              <Button
                onClick={() => router.push('/pricing')}
                variant="outline"
                className="text-xs px-2 py-1 h-auto sm:h-8 sm:px-3 sm:py-0"
                size="sm"
              >
                View Plans
              </Button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
} 