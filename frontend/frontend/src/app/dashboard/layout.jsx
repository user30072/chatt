'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import Header from './Header';
import Loading from '@/components/ui/Loading';
import { localStorage, sessionStorage, useIsMounted, useIsRefresh } from '@/lib/browserUtils';
import { apiService } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function DashboardLayout({ children }) {
  const auth = useAuth();
  const router = useRouter();
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);
  const isMounted = useIsMounted();
  const { isRefresh } = useIsRefresh('dashboard_session');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cachedUser, setCachedUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Use auth data as the source of truth once loaded
  useEffect(() => {
    if (!auth.loading && auth.user) {
      setCachedUser(auth.user);
      setSessionExpired(false);
    }
  }, [auth.loading, auth.user]);
  
  // Only check session validity on visibility change or after long inactivity
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    // Only verify when coming back after tab was hidden for a while
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only run verification if we have a user and the tab was hidden
        if (auth.user || cachedUser) {
          timeoutId = setTimeout(() => {
            verifySessionIfNeeded();
          }, 300);
        }
      }
    };
    
    const verifySessionIfNeeded = async () => {
      // Skip if no authentication or already redirecting
      if (hasAttemptedRedirect || (!auth.user && !cachedUser)) {
        return;
      }
      
      try {
        // Make a lightweight ping to check auth
        const response = await apiService.get('/auth/me');
        
        if (!isMounted) return;
        
        // Auth is valid, update user if needed
        if (response.data && response.data.user) {
          setCachedUser(response.data.user);
          setSessionExpired(false);
        }
      } catch (error) {
        if (!isMounted) return;
        
        // Check if it's a clear auth failure (401/403)
        const status = error.response?.status;
        
        // Only handle actual auth failures, not network issues
        if (status === 401 || status === 403) {
          console.warn('Session expired or invalid token detected');
          
          // Clear user data
          try {
            window.localStorage.removeItem('user_cache');
            window.localStorage.removeItem('subscription_status_cache');
          } catch (e) {
            console.error('Error clearing localStorage:', e);
          }
          
          setSessionExpired(true);
          setCachedUser(null);
          
          // Redirect if needed
          if (!hasAttemptedRedirect) {
            setHasAttemptedRedirect(true);
            timeoutId = setTimeout(() => {
              router.push('/');
            }, 1000);
          }
        } else if (error.response) {
          // For other HTTP errors, log but don't log out the user
          console.warn('API error but not logging out user:', error.response.status);
        } else {
          // For network errors, keep the user logged in
          console.warn('Network error occurred, keeping user session');
        }
      }
    };
    
    // Set up visibility listener
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
  }, [router, hasAttemptedRedirect, auth.user, cachedUser]);
  
  // Immediately check for cached user on mount - before any network requests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Get user from cache but handle parsing errors
        const userCacheRaw = window.localStorage.getItem('user_cache');
        
        if (userCacheRaw) {
          try {
            // Skip processing if it's the corrupted string
            if (userCacheRaw === '[object Object]') {
              console.warn('Found corrupted user cache, removing it');
              window.localStorage.removeItem('user_cache');
            } else {
              // Safely parse the JSON
              const userCache = JSON.parse(userCacheRaw);
              if (userCache && typeof userCache === 'object') {
                setCachedUser(userCache);
                // When refreshing, consider the layout ready immediately with cached data
                if (isRefresh) {
                  setIsReady(true);
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing cached user:', parseError);
            // Clean up corrupted cache
            window.localStorage.removeItem('user_cache');
          }
        }
      } catch (e) {
        console.error('Error accessing localStorage:', e);
      }
      
      // Set a timeout to eventually mark as ready even if auth is slow
      const timeoutId = setTimeout(() => {
        if (!isReady) {
          console.log('Forcing layout ready state after timeout');
          setIsReady(true);
        }
      }, 1000); // 1 second max wait
      
      return () => clearTimeout(timeoutId);
    }
  }, [isRefresh, isReady]);
  
  // Auth state tracking effect
  useEffect(() => {
    // If auth data loads or completes loading, we're ready
    if (auth.user || !auth.loading) {
      setIsReady(true);
    }
  }, [auth.user, auth.loading]);
  
  // Only redirect if not authenticated and not a refresh and no cached user
  useEffect(() => {
    // Skip if not mounted yet or during refresh
    if (!isMounted || isRefresh) return;
    
    // If we have a cached user, don't redirect even during auth loading
    if (cachedUser) return;
    
    // Only check after loading is complete
    if (auth.loading) return;
    
    // If not authenticated and haven't tried to redirect yet
    if (!auth.isAuthenticated && !hasAttemptedRedirect) {
      setHasAttemptedRedirect(true);
      router.push('/');
    }
  }, [auth.loading, auth.isAuthenticated, router, hasAttemptedRedirect, isMounted, isRefresh, cachedUser]);

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Update cached user when auth user changes
  useEffect(() => {
    if (!auth.loading && auth.user) {
      setCachedUser(auth.user);
      setSessionExpired(false);
      
      // Also update localStorage for consistency
      try {
        const jsonString = JSON.stringify(auth.user);
        window.localStorage.setItem('user_cache', jsonString);
      } catch (e) {
        console.error('Error updating user cache:', e);
      }
    }
  }, [auth.user, auth.loading]);
  
  // Create stable props for child components to prevent unnecessary re-renders
  const sidebarProps = useMemo(() => ({
    isOpen: sidebarOpen,
    setIsOpen: setSidebarOpen,
    cachedUser: cachedUser || auth.user
  }), [sidebarOpen, setSidebarOpen, cachedUser, auth.user]);
  
  const headerProps = useMemo(() => ({
    toggleSidebar,
    cachedUser: cachedUser || auth.user
  }), [toggleSidebar, cachedUser, auth.user]);

  // Show session expired message
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

  // Always render the layout during refresh with cached user data
  if (isRefresh && cachedUser) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} cachedUser={cachedUser} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header toggleSidebar={toggleSidebar} cachedUser={cachedUser} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
            <Suspense fallback={<div className="h-full flex items-center justify-center"><Loading /></div>}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  // Standard render for authenticated sessions
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          <Suspense fallback={<div className="h-full flex items-center justify-center"><Loading /></div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}