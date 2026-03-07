'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { BellIcon, PlusIcon, Menu as MenuIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import TrialWarning from '@/components/TrialWarning';
import apiService from '@/lib/api';
import { useIsMounted, useIsRefresh, useStableHandler, localStorage } from '@/lib/browserUtils';
import { useRouter } from 'next/navigation';

// Cache key for subscription status
const SUBSCRIPTION_CACHE_KEY = 'subscription_status_cache';

// Global flag to prevent concurrent subscription checks
if (typeof window !== 'undefined') {
  // @ts-expect-error - Adding non-standard property to window object for subscription check state tracking
  window._subscriptionCheckInProgress = window._subscriptionCheckInProgress || false;
  // @ts-expect-error - Adding non-standard property to window object for subscription check timestamp
  window._lastSubscriptionCheckTime = window._lastSubscriptionCheckTime || 0;
}

export default function Header({ toggleSidebar, cachedUser }) {
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    loading: true,
    isActive: false,
    trialDaysRemaining: 0
  });
  const [subscriptionConfig, setSubscriptionConfig] = useState({
    defaultTrialDays: 0
  });
  const isMounted = useIsMounted();
  const { isRefresh, isMultipleRefresh } = useIsRefresh('dashboard_session');
  const router = useRouter();
  const hasCheckedSubscriptionRef = useRef(false);
  
  // For display, prioritize auth user over cached user
  const displayUser = user || cachedUser;
  
  // Add debug info on render
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Header render state:', { 
        authUser: !!user, 
        cachedUser: !!cachedUser,
        isRefresh,
        isMultipleRefresh
      });
    }
  }, [user, cachedUser, isRefresh, isMultipleRefresh]);
  
  // Special logout for refresh scenarios
  const handleLogout = useStableHandler(() => {
    // First close the user menu
    setUserMenuOpen(false);
    
    // Small delay to ensure UI updates before logout
    setTimeout(() => {
      // Don't clear localStorage or manipulate cookies directly
      // Just use the auth system's logout function with force option
      logout({ redirect: true, force: true });
    }, 50);
  }, [logout]);
  
  // Load subscription status from cache on mount
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      const cachedStatus = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (cachedStatus) {
        // Ensure cachedStatus is a string
        if (typeof cachedStatus !== 'string') {
          console.warn('Found non-string subscription cache data, clearing it:', typeof cachedStatus);
          localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
          return;
        }
        
        // Check if this is an improperly stringified object
        if (cachedStatus === '[object Object]' || cachedStatus === '"[object Object]"') {
          console.warn('Found improperly formatted subscription cache data, clearing it');
          localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
          return;
        }
        
        try {
          const parsedStatus = JSON.parse(cachedStatus);
          console.log('Loaded subscription status from cache:', parsedStatus);
          setSubscriptionStatus(parsedStatus);
          hasCheckedSubscriptionRef.current = true;
        } catch (parseError) {
          console.error('Error parsing cached subscription JSON:', parseError);
          localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Error reading cached subscription status:', error);
      // Don't overwrite current state on error
      try {
        localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
      } catch {}
    }
  }, [isMounted]);
  
  // Fetch subscription status when user info is available
  useEffect(() => {
    // Skip if: not mounted, no display user
    if (!isMounted || !displayUser) return;
    
    // For multiple refreshes, use cached status if available to avoid API hammering
    if (isMultipleRefresh && !subscriptionStatus.loading && subscriptionStatus.trialDaysRemaining >= 0) {
      console.log('Using cached subscription status for multi-refresh');
      return;
    }
    
    // Use global flag to prevent concurrent subscription checks
    if (typeof window !== 'undefined') {
      // @ts-expect-error - Accessing dynamically added window property for subscription check state
      if (window._subscriptionCheckInProgress) {
        console.log('Subscription check already in progress, skipping duplicate call');
        return;
      }
      
      // @ts-expect-error - Accessing dynamically added window property for subscription timestamp
      const lastCheckTime = window._lastSubscriptionCheckTime || 0;
      const timeSinceLastCheck = Date.now() - lastCheckTime;
      
      // Skip if checked in the last 30 seconds
      if (timeSinceLastCheck < 30000) { // 30 seconds
        console.log(`Subscription was checked ${Math.floor(timeSinceLastCheck/1000)}s ago, skipping`);
        return;
      }
      
      // Skip if we already have valid data from cache and this is a refresh
      if (hasCheckedSubscriptionRef.current && isRefresh && !subscriptionStatus.loading) {
        console.log('Already have valid subscription data and this is a refresh, skipping check');
        return;
      }
      
      // Set global check in progress flag
      // @ts-expect-error - Setting dynamically added window property for subscription check state
      window._subscriptionCheckInProgress = true;
    }
    
    async function checkSubscriptionStatus() {
      try {
        console.log('Checking subscription status...');
        const response = await apiService.get('/subscriptions/current');
        // Record last check time
        if (typeof window !== 'undefined') {
          // @ts-expect-error - Updating dynamically added window property for subscription timestamp
          window._lastSubscriptionCheckTime = Date.now();
        }
        
        console.log('Subscription response in Header:', response.data);
        
        let newStatus;
        
        if (response.data && response.data.subscription) {
          const subscription = response.data.subscription;
          
          // Store config values if available
          if (response.data.config) {
            setSubscriptionConfig(response.data.config);
          }
          
          const trialDaysRemaining = subscription.trialDaysRemaining || 0;
          console.log('Trial days remaining:', trialDaysRemaining);
          
          newStatus = {
            loading: false,
            isActive: subscription.isActive,
            trialDaysRemaining: trialDaysRemaining,
          };
        } else {
          newStatus = {
            loading: false,
            isActive: true, // Default to active if no data
            trialDaysRemaining: 0,
          };
        }
        
        // Update state with the new status
        setSubscriptionStatus(newStatus);
        hasCheckedSubscriptionRef.current = true;
        
        // Cache the status for faster loading next time
        try {
          const safeObj = {
            loading: false,
            isActive: Boolean(newStatus.isActive),
            trialDaysRemaining: Number(newStatus.trialDaysRemaining || 0)
          };
          
          // First, convert to string and verify it's not corrupted
          const serializedStatus = JSON.stringify(safeObj);
          
          // Detect corrupted serialization
          if (!serializedStatus || 
              serializedStatus === 'undefined' || 
              serializedStatus === '[object Object]' || 
              serializedStatus === '"[object Object]"') {
            console.error("Prevented storing corrupted subscription status");
            localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
            return;
          }
          
          // Additional validation - try parsing it back
          try {
            const testParse = JSON.parse(serializedStatus);
            // Make sure we got a proper object back
            if (!testParse || typeof testParse !== 'object' || String(testParse) === '[object Object]') {
              console.error("Validation failed for subscription status");
              localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
              return;
            }
          } catch (parseError) {
            console.error("Serialization validation failed:", parseError);
            localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
            return;
          }
          
          localStorage.setItem(SUBSCRIPTION_CACHE_KEY, serializedStatus);
        } catch (cacheError) {
          console.error('Error caching subscription status:', cacheError);
          // Try to clear corrupted cache
          try {
            localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
          } catch {}
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        // On network error during multi-refresh, keep using existing data
        if (isMultipleRefresh && !subscriptionStatus.loading) {
          console.log('Network error during multi-refresh - keeping existing subscription data');
          return;
        }
        
        // On error, only update if we don't already have valid data
        if (subscriptionStatus.loading) {
          const fallbackStatus = {
            loading: false,
            isActive: true, // Default to active on error
            trialDaysRemaining: 0,
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
    }
    
    checkSubscriptionStatus();
  }, [displayUser, isMounted, isRefresh, isMultipleRefresh, subscriptionStatus.loading, subscriptionStatus.trialDaysRemaining]);
  
  // For development only - simulate a trial
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isMounted) {
      // Check if we should force a trial for testing
      const forceTrialParam = new URLSearchParams(window.location.search).get('forceTrial');
      if (forceTrialParam === 'true') {
        console.log('Forcing trial mode for testing UI');
        const days = parseInt(new URLSearchParams(window.location.search).get('days') || '7');
        const forcedStatus = {
          loading: false,
          isActive: true,
          trialDaysRemaining: days
        };
        
        setSubscriptionStatus(forcedStatus);
        
        // Cache forced trial status
        try {
          localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(forcedStatus));
        } catch (cacheError) {
          console.error('Error caching forced trial status:', cacheError);
          // Try to clear corrupted cache
          try {
            localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
          } catch {}
        }
      } else {
        // Set a default trial status for development if no data is available
        if (subscriptionStatus.loading) {
          console.log('Setting default trial mode for development');
          setSubscriptionStatus({
            loading: false,
            isActive: true,
            trialDaysRemaining: 7
          });
        }
      }
    }
  }, [isMounted, subscriptionStatus.loading]);
  
  const toggleMenu = () => setUserMenuOpen(!userMenuOpen);
  
  const handleProfileClick = useStableHandler(() => {
    router.push('/dashboard/profile');
  }, [router]);
  
  return (
    <div className="sticky top-0 z-20">
      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 p-2 text-xs">
          Trial days: {subscriptionStatus.trialDaysRemaining}, 
          isActive: {subscriptionStatus.isActive ? 'true' : 'false'},
          loading: {subscriptionStatus.loading ? 'true' : 'false'}
        </div>
      )}
      
      {/* Trial warning banner */}
      {(subscriptionStatus.trialDaysRemaining > 0) && (
        <TrialWarning 
          daysRemaining={subscriptionStatus.trialDaysRemaining}
          onUpgrade={() => console.log('User initiated upgrade from header')}
        />
      )}
      
      <header className="bg-white shadow-sm h-16 z-10">
        <div className="px-4 h-full flex items-center justify-between">
          <div className="flex items-center lg:hidden">
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary border border-gray-300"
            >
              <span className="sr-only">Open sidebar</span>
              <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Brand logo for mobile */}
          <div className="lg:hidden flex items-center justify-center pl-2">
            <span className="text-xl font-bold ml-2">any bot&trade;</span>
          </div>

          <div className="flex-1 flex justify-center lg:justify-end">
            {/* Search bar removed, but maintaining spacing for layout */}
          </div>

          <div className="flex items-center">
            <div className="mr-3 hidden sm:block">
              <Link href="/dashboard/chatbots/new">
                <Button size="sm" variant="black" className="font-medium border border-gray-900 bg-gray-900 text-white hover:bg-gray-800">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New Chatbot
                </Button>
              </Link>
            </div>
          
            <div className="relative mr-3">
              {/* Always render the button during refreshes, and only show loading state when no cached user data */}
              {(displayUser || isRefresh) ? (
                <>
                  <button
                    type="button"
                    className="bg-white p-1 rounded-full text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-gray-300"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                  >
                    <span className="sr-only">View notifications</span>
                    <BellIcon className="h-6 w-6" />
                  </button>
                  
                  {/* Notification badge */}
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                  
                  {/* Notification dropdown */}
                  {notificationsOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-700">Notifications</p>
                        </div>
                        
                        <div className="max-h-96 overflow-y-auto">
                          {/* Example notification */}
                          <div className="px-4 py-3 hover:bg-gray-100 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">New conversation started</p>
                            <p className="text-xs text-gray-500 mt-1">Customer support chatbot - 10 min ago</p>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-100 text-center">
                          <a href="#" className="block px-4 py-2 text-sm text-primary hover:text-primary-700">
                            View all notifications
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              )}
            </div>
            
            {/* Profile dropdown */}
            <div className="relative">
              {/* Always render the button during refreshes, and only show loading state when no cached user data */}
              {(displayUser || isRefresh) ? (
                <>
                  <div>
                    <button
                      type="button"
                      className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-gray-300"
                      id="user-menu-button"
                      onClick={toggleMenu}
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
                        {displayUser?.firstName?.charAt(0) || displayUser?.email?.charAt(0) || 'U'}
                      </div>
                    </button>
                  </div>
                  
                  {userMenuOpen && (
                    <div
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <Link 
                        href="/dashboard/settings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-900 hover:text-white"
                        onClick={toggleMenu}
                      >
                        Your Profile
                      </Link>
                      
                      <Link 
                        href="/dashboard/settings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-900 hover:text-white"
                        onClick={toggleMenu}
                      >
                        Settings
                      </Link>
                      
                      <button
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-900 hover:text-white"
                        onClick={handleLogout}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}