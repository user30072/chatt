'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { apiService } from '@/lib/api';
import TestUploadComponent from './test-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import PaymentRequired from '@/components/PaymentRequired';
import TrialWarning from '@/components/TrialWarning';
import { localStorage, sessionStorage, useIsMounted, useIsRefresh } from '@/lib/browserUtils';
import Loading from '@/components/ui/Loading';

// Custom hook for caching data in localStorage
const useCache = (key, initialValue) => {
  const [value, setValue] = useState(initialValue);
  const isMounted = useIsMounted();
  
  // Load the cached value on component mount
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      // Use our browserUtils localStorage to get the value safely
      const cachedValue = localStorage.getItem(key);
      
      // Only update state if we got a non-null value
      if (cachedValue !== null && cachedValue !== undefined) {
        // Try to detect if this is a stringified object
        if (typeof cachedValue === 'string' && 
            (cachedValue.startsWith('{') || cachedValue.startsWith('['))) {
          try {
            // Parse the JSON string
            const parsedValue = JSON.parse(cachedValue);
            setValue(parsedValue);
          } catch (parseError) {
            console.error(`Error parsing JSON for key "${key}":`, parseError);
            setValue(cachedValue); // Use the raw string as fallback
          }
        } else {
          // Use as is for non-object values
          setValue(cachedValue);
        }
      }
    } catch (error) {
      console.error(`Error reading cache for key "${key}":`, error);
      // Fall back to initial value on error
      setValue(initialValue);
    }
  }, [key, isMounted, initialValue]);
  
  // Return function to update both state and cache
  const updateValue = (newValue) => {
    try {
      // For function updates, handle them specially
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      
      // Don't store undefined or null
      if (valueToStore === undefined || valueToStore === null) {
        // Remove from localStorage
        if (isMounted && typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
        // Still update state
        setValue(valueToStore);
        return;
      }
      
      // Save to state
      setValue(valueToStore);
      
      // Save to localStorage - ensure objects are stringified
      if (isMounted && typeof window !== 'undefined') {
        if (typeof valueToStore === 'object') {
          // For objects, we need to stringify them properly
          try {
            const jsonValue = JSON.stringify(valueToStore);
            localStorage.setItem(key, jsonValue);
          } catch (jsonError) {
            console.error(`Error stringifying object for key "${key}":`, jsonError);
          }
        } else {
          // For primitive values, store directly
          localStorage.setItem(key, valueToStore);
        }
      }
    } catch (error) {
      console.error(`Error updating cache for key "${key}":`, error);
      // Still update state even if localStorage fails
      setValue(newValue instanceof Function ? newValue(value) : newValue);
    }
  };
  
  return [value, updateValue];
};

// Create a persistent dashboard UI that doesn't flicker during refreshes
export default function DashboardPage() {
  // Get auth context but don't immediately use it for conditional rendering
  const { user, logout, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const isMounted = useIsMounted();
  const { isRefresh } = useIsRefresh('dashboard_session');
  
  // Basic state management
  const [pageLoading, setPageLoading] = useState(true);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    loading: true,
    isActive: false,
    trialDaysRemaining: 0,
    isTrialUser: false,
  });
  const [showDebug, setShowDebug] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Perform direct API auth check on mount, but only for redeployment cases
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    const verifySessionDirectly = async () => {
      // Skip verification if we have no cached user or already redirecting
      if (redirectAttempted || !localStorage.getItem('user_cache')) {
        return;
      }
      
      try {
        // Try to make a direct API call to check auth status
        const response = await apiService.get('/auth/me');
        
        if (!isMounted) return;
        
        // Auth is valid, update user from response if needed
        if (response.data && response.data.user) {
          setCurrentUser(response.data.user);
          setSessionExpired(false);
        }
      } catch (error) {
        // If we get here, the API call failed - likely due to invalid auth
        if (!isMounted) return;
        
        console.error('Direct auth check failed:', error);
        
        // Check if this is a 401/403 error (unauthorized/forbidden)
        // These indicate invalid auth token rather than network issues
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          console.log('Session expired or invalid token detected');
          
          // Only log out the user if this is not a refresh or it's a clear auth failure
          if (!isRefresh) {
            // Force session expiration and redirect only for auth errors
            setSessionExpired(true);
            setCurrentUser(null);
            
            // Clean up any cached data
            localStorage.removeItem('user_cache');
            localStorage.removeItem('subscription_status_cache');
            
            // Redirect to homepage if not already attempted, with a slight delay
            if (!redirectAttempted) {
              setRedirectAttempted(true);
              timeoutId = setTimeout(() => {
                router.push('/');
              }, 500);
            }
          }
        } else {
          // For network errors or other non-auth errors, don't log out the user
          console.log('API check failed due to network issue, not forcing logout');
        }
      }
    };
    
    // Check for a specific app version in localStorage vs window
    const detectRedeployment = () => {
      // Use the document's last modified time as a version indicator
      const currentVersion = document.lastModified;
      const storedVersion = localStorage.getItem('app_version');
      
      if (!storedVersion) {
        // First load, store the current version
        localStorage.setItem('app_version', currentVersion);
        return false;
      }
      
      // Check if version changed (redeployment happened)
      if (storedVersion !== currentVersion) {
        console.log('App version changed, possible redeployment detected');
        localStorage.setItem('app_version', currentVersion);
        return true;
      }
      
      return false;
    };
    
    // Only verify on redeployment or when coming back to the page
    const maybeVerify = () => {
      // If we detect a redeployment or resuming from a background state
      if (detectRedeployment() || document.visibilityState === 'visible') {
        // Slight delay to allow other initialization
        setTimeout(verifySessionDirectly, 300);
      }
    };
    
    // Run immediately
    maybeVerify();
    
    // Also run verification when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        maybeVerify();
      }
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [router, redirectAttempted]);
  
  // Immediately initialize from cache on first render to prevent flicker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Safely parse JSON with error handling for corrupted data
        const safeParseJSON = (jsonString, defaultValue = null) => {
          if (!jsonString) return defaultValue;
          
          // Ensure jsonString is actually a string
          if (typeof jsonString !== 'string') {
            console.warn('safeParseJSON received non-string value:', typeof jsonString, jsonString);
            return defaultValue;
          }
          
          // Handle the corrupted "[object Object]" string case
          if (jsonString === '[object Object]' || jsonString === '"[object Object]"') {
            console.warn('Found corrupted JSON data (literal [object Object] string), removing it');
            return defaultValue;
          }
          
          try {
            return JSON.parse(jsonString);
          } catch (e) {
            console.error('Error parsing JSON:', e);
            // Actively clean up the corrupted data for specific keys
            if (typeof window !== 'undefined' && 
                typeof jsonString === 'string' &&
                (jsonString.includes('subscription_status_cache') || 
                 jsonString.includes('user_cache') || 
                 jsonString.includes('user_backup'))) {
              try {
                window.localStorage.removeItem('subscription_status_cache');
                window.localStorage.removeItem('user_cache');
                window.localStorage.removeItem('user_backup');
              } catch (cleanupError) {
                console.error('Error cleaning corrupted data:', cleanupError);
              }
            }
            return defaultValue;
          }
        };
        
        // Try to initialize from cached user data for UI performance only
        // Use raw localStorage.getItem to get the string value directly
        const cachedUserStr = typeof window !== 'undefined' ? window.localStorage.getItem('user_cache') : null;
        
        if (cachedUserStr) {
          // Use the safe parsing function instead of direct JSON.parse
          const cachedUser = safeParseJSON(cachedUserStr);
          
          // Validate cached user data has basic expected structure
          if (cachedUser && cachedUser.id && cachedUser.email) {
            setCurrentUser(cachedUser);
            
            // Immediately stop loading if we have cached data
            setPageLoading(false);
            
            // If this was a refresh, try to use cached subscription status
            if (isRefresh) {
              try {
                // Use raw localStorage.getItem to get the string value directly
                const cachedSubscriptionStr = typeof window !== 'undefined' ? window.localStorage.getItem('subscription_status_cache') : null;
                // Use safe parsing here too
                const cachedSubscription = safeParseJSON(cachedSubscriptionStr);
                
                // Make sure cached subscription data is valid
                if (cachedSubscription && 
                    typeof cachedSubscription === 'object' && 
                    'isActive' in cachedSubscription && 
                    'loading' in cachedSubscription) {
                  setSubscriptionStatus(cachedSubscription);
                } else {
                  // Invalid data, remove it
                  localStorage.removeItem('subscription_status_cache');
                }
              } catch (e) {
                console.error('Error handling cached subscription:', e);
                localStorage.removeItem('subscription_status_cache');
              }
            }
          } else {
            console.warn('Invalid user cache data structure, removing it');
            localStorage.removeItem('user_cache');
          }
        }
      } catch (error) {
        console.error('Error initializing from cache:', error);
        // Clean up any potentially corrupted cache data
        try {
          localStorage.removeItem('user_cache');
          localStorage.removeItem('subscription_status_cache');
          localStorage.removeItem('user_backup');
        } catch (cleanupError) {
          console.error('Error during cache cleanup:', cleanupError);
        }
      }
    }
  }, [isRefresh]);
  
  // Check auth status and handle session expiration
  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

    // If user is authenticated, update our state
    if (user) {
      setCurrentUser(user);
      setPageLoading(false);
      setSessionExpired(false);
      
      // Safely cache user data for faster UI transitions
      try {
        // Create a safe object with only the properties we need
        const safeUserCache = {
          id: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          username: user.username || '',
          role: user.role || 'user',
        };
        
        // Properly stringify the object to avoid [object Object]
        const userJson = JSON.stringify(safeUserCache);
        
        // Verify serialization worked correctly
        if (userJson !== '[object Object]' && userJson) {
          localStorage.setItem('user_cache', userJson);
        }
      } catch (e) {
        console.error('Error caching user data:', e);
        // Remove potentially corrupted data
        localStorage.removeItem('user_cache');
      }
      
      // Get subscription data
      getSubscriptionStatus(user.id).catch(console.error);
    } else {
      // Auth is done loading and no user found
      
      // Don't immediately log out on refresh, especially if we have cached data
      if (isRefresh && currentUser) {
        console.log('Page refresh detected with cached user data, attempting to recover');
        
        // We have cached user data from a refresh, try to rely on it temporarily
        setPageLoading(false);
        
        // Don't clear cached data on refresh even if auth check momentarily fails
        // This allows the UI to remain stable during refresh
        
        // Try to verify auth directly with the API
        apiService.get('/auth/me').then(response => {
          if (response.data && response.data.user) {
            setCurrentUser(response.data.user);
            setSessionExpired(false);
          }
        }).catch(error => {
          console.log('Auth verification attempt during refresh failed:', error);
          // Don't redirect or clear cache on refresh auth failure
        });
      } else if (!isRefresh) {
        // Not a refresh and no authenticated user, clear cache and redirect
        localStorage.removeItem('user_cache');
        localStorage.removeItem('subscription_status_cache');
        
        // Indicate session expiration and redirect to homepage
        setSessionExpired(true);
        setCurrentUser(null);
        setPageLoading(false);
        
        // Use a timeout to avoid immediate redirect during initial load
        if (!redirectAttempted) {
          setRedirectAttempted(true);
          setTimeout(() => {
            router.push('/');
          }, 50);
        }
      }
    }
  }, [user, authLoading, isRefresh, currentUser, redirectAttempted, router]);
  
  // Handle session expired state
  useEffect(() => {
    // If session is expired, redirect to home after showing message
    if (sessionExpired && !redirectAttempted) {
      setRedirectAttempted(true);
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, redirectAttempted, router]);

  // Improved subscription status function
  const getSubscriptionStatus = async (userId) => {
    if (!userId) return;
    
    // Respect the global subscription check flag
    if (typeof window !== 'undefined') {
      // Get current cached subscription status
      let cachedStatus = null;
      try {
        const cachedStatusStr = localStorage.getItem('subscription_status_cache');
        if (cachedStatusStr && cachedStatusStr !== '[object Object]') {
          cachedStatus = JSON.parse(cachedStatusStr);
        }
      } catch (e) {
        console.error('Error parsing cached subscription status:', e);
      }

      // @ts-expect-error - Accessing dynamically added window property for subscription check state
      if (window._subscriptionCheckInProgress) {
        console.log('[Dashboard] Subscription check already in progress, skipping duplicate call');
        return cachedStatus || { 
          loading: false,
          isActive: true, 
          trialDaysRemaining: 0, 
          isTrialUser: false 
        };
      }
      
      // @ts-expect-error - Accessing dynamically added window property for subscription timestamp
      const lastCheckTime = window._lastSubscriptionCheckTime || 0;
      const timeSinceLastCheck = Date.now() - lastCheckTime;
      
      // Skip if checked in the last 30 seconds
      if (timeSinceLastCheck < 30000) { // 30 seconds
        console.log(`Dashboard: Subscription was checked ${Math.floor(timeSinceLastCheck/1000)}s ago, skipping duplicate check`);
        return;
      }
      
      // Set global check in progress flag
      // @ts-expect-error - Setting dynamically added window property for subscription check state
      window._subscriptionCheckInProgress = true;
    }
    
    try {
      const response = await apiService.get('/subscriptions/current');
      
      // Record last check time
      if (typeof window !== 'undefined') {
        // @ts-expect-error - Updating dynamically added window property for subscription timestamp
        window._lastSubscriptionCheckTime = Date.now();
      }
      
      if (response.data && response.data.subscription) {
        const subscription = response.data.subscription;
        const newStatus = {
          loading: false,
          isActive: subscription.isActive || true,
          trialDaysRemaining: subscription.trialDaysRemaining || 0,
          isTrialUser: subscription.isTrialUser || false,
        };
        
        setSubscriptionStatus(newStatus);
        
        // Cache subscription status for quicker access on refresh - UI performance only
        try {
          // Safely serialize the object
          const safeObj = {
            loading: Boolean(newStatus.loading),
            isActive: Boolean(newStatus.isActive),
            trialDaysRemaining: Number(newStatus.trialDaysRemaining || 0),
            isTrialUser: Boolean(newStatus.isTrialUser)
          };
          
          // Properly serialize the object to avoid [object Object]
          const serializedStatus = JSON.stringify(safeObj);
          
          // Verify the serialization worked correctly
          if (!serializedStatus || 
              serializedStatus === 'undefined' || 
              serializedStatus === '[object Object]' || 
              serializedStatus === '"[object Object]"') {
            console.error("Failed to properly serialize subscription status");
            localStorage.removeItem('subscription_status_cache');
            return;
          }
          
          // Additional validation - try parsing it back
          try {
            const testParse = JSON.parse(serializedStatus);
            // Make sure we got a proper object back
            if (!testParse || typeof testParse !== 'object' || String(testParse) === '[object Object]') {
              console.error("Validation failed for subscription status");
              localStorage.removeItem('subscription_status_cache');
              return;
            }
          } catch (parseError) {
            console.error("Serialization validation failed:", parseError);
            localStorage.removeItem('subscription_status_cache');
            return;
          }
          
          // If all checks pass, store in localStorage
          localStorage.setItem('subscription_status_cache', serializedStatus);
        } catch (cacheError) {
          console.error('Error caching subscription status:', cacheError);
          // Ensure we don't leave corrupted data
          localStorage.removeItem('subscription_status_cache');
        }
      } else {
        const defaultStatus = {
          loading: false,
          isActive: true, // Default to active if no subscription data
          trialDaysRemaining: 0,
          isTrialUser: false,
        };
        
        setSubscriptionStatus(defaultStatus);
        
        // Cache the default status for UI performance
        try {
          const serializedStatus = JSON.stringify(defaultStatus);
          
          // Verify it's not corrupted before storing
          if (!serializedStatus || 
              serializedStatus === 'undefined' || 
              serializedStatus === '[object Object]' || 
              serializedStatus === '"[object Object]"') {
            console.error("Failed to properly serialize default subscription status");
            localStorage.removeItem('subscription_status_cache');
            return;
          }
          
          // Additional validation - try parsing it back
          try {
            const testParse = JSON.parse(serializedStatus);
            // Make sure we got a proper object back
            if (!testParse || typeof testParse !== 'object' || String(testParse) === '[object Object]') {
              console.error("Validation failed for default subscription status");
              localStorage.removeItem('subscription_status_cache');
              return;
            }
          } catch (parseError) {
            console.error("Serialization validation failed for default status:", parseError);
            localStorage.removeItem('subscription_status_cache');
            return;
          }
          
          localStorage.setItem('subscription_status_cache', serializedStatus);
        } catch (cacheError) {
          console.error('Error caching default subscription status:', cacheError);
          localStorage.removeItem('subscription_status_cache');
        }
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      
      if (!isRefresh) {
        const fallbackStatus = {
          loading: false,
          isActive: true, // Default to active on error
          trialDaysRemaining: 0,
          isTrialUser: false,
        };
        
        setSubscriptionStatus(fallbackStatus);
      }
    } finally {
      // Reset the in progress flag with a small delay
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          // @ts-expect-error - Resetting dynamically added window property for subscription state
          window._subscriptionCheckInProgress = false;
        }, 1000);
      }
    }
  };
  
  // Show session expired message with home link
  if (sessionExpired) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Expired</h1>
          <p className="mb-4">Your session has expired. Redirecting to homepage...</p>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mt-4 mb-4"></div>
          <div>
            <Button 
              onClick={() => router.push('/')}
              variant="black"
              className="font-medium"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Only show loading UI if we're not a refresh and don't have cached data
  if (pageLoading && !isRefresh && !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle no user case for non-refresh scenarios
  if (!currentUser && !isRefresh && !pageLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Expired</h1>
          <p className="mb-4">Your session has expired or you are not logged in.</p>
          <Button 
            onClick={() => router.push('/login')}
            variant="black"
            className="font-medium"
          >
            Log In
          </Button>
        </div>
      </div>
    );
  }
  
  // For all other cases, immediately show the dashboard
  // This includes refresh scenarios using cached data
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 md:mb-0">Dashboard</h1>
          {currentUser?.username && (
            <p className="text-sm text-gray-500">
              Username: {currentUser.username}
            </p>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500">
            Logged in as: {currentUser?.email || '...'}
          </p>
          <p className="text-xs text-right mt-1">
            Subscription: <span className={`font-medium ${subscriptionStatus.isActive ? 'text-green-600' : 'text-red-600'}`}>
              {subscriptionStatus.needsPaymentMethod 
                ? 'Payment Required' 
                : subscriptionStatus.isActive 
                  ? subscriptionStatus.trialDaysRemaining > 0 
                    ? `Trial (${subscriptionStatus.trialDaysRemaining} days left)` 
                    : 'Active' 
                  : 'Inactive'}
            </span>
          </p>
        </div>
      </div>
      
      {/* Main content */}
      <Tabs defaultValue="upload-test" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload-test">Document Upload Test</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Overview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload-test" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload Test</CardTitle>
              <CardDescription>
                Test uploading and querying documents using the API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestUploadComponent />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="dashboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Overview</CardTitle>
              <CardDescription>
                View all your chatbots, documents, and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Dashboard content will go here in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 