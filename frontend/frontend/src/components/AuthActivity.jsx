'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { setCookie, getCookie } from '@/lib/cookies';
import apiService from '@/lib/api';

// Create a more persistent tracking mechanism using localStorage
const setLastRefreshTime = (time = Date.now()) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('_last_token_refresh_time', time.toString());
    }
  } catch (e) {
    console.error('Error setting last refresh time:', e);
  }
};

const getLastRefreshTime = () => {
  try {
    if (typeof window !== 'undefined') {
      const timeStr = localStorage.getItem('_last_token_refresh_time');
      if (timeStr) {
        return parseInt(timeStr, 10);
      }
    }
  } catch (e) {
    console.error('Error getting last refresh time:', e);
  }
  return 0;
};

const setRefreshInProgress = (inProgress = true) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('_token_refresh_in_progress', inProgress ? 'true' : 'false');
      // Also set as a window property for in-memory access
      // @ts-expect-error - Setting dynamically added window property
      window._tokenRefreshInProgress = inProgress;
    }
  } catch (e) {
    console.error('Error setting refresh in progress:', e);
  }
};

const isRefreshInProgress = () => {
  try {
    if (typeof window !== 'undefined') {
      // First check window property for faster access
      // @ts-expect-error - Accessing dynamically added window property
      if (window._tokenRefreshInProgress === true) {
        return true;
      }
      
      // If not found, check localStorage
      const inProgress = localStorage.getItem('_token_refresh_in_progress');
      return inProgress === 'true';
    }
  } catch (e) {
    console.error('Error checking if refresh is in progress:', e);
  }
  return false;
};

/**
 * Check if a JWT token is expired or will expire soon
 * @param {string} token - The JWT token to check
 * @param {number} bufferMinutes - Minutes before actual expiration to consider it "expiring soon"
 * @returns {object} - Object with expired and expiresInMinutes properties
 */
function checkTokenExpiration(token, bufferMinutes = 10) {
  if (!token) return { expired: true, expiresInMinutes: 0 };
  
  try {
    // For custom tokens (non-JWT format), assume not expired
    if (!token.includes('.')) {
      return { expired: false, expiresInMinutes: 60 }; // Assume 60 minutes for non-JWT tokens
    }
    
    // JWT tokens consist of three parts: header.payload.signature
    const parts = token.split('.');
    
    // For custom tokens with dots but not JWT format, assume not expired
    if (parts.length !== 3) return { expired: false, expiresInMinutes: 60 };
    
    const base64Payload = parts[1];
    if (!base64Payload) return { expired: true, expiresInMinutes: 0 };
    
    // Decode the base64 payload
    try {
      const normalized = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      
      // No expiration = not expired
      if (!payload.exp) return { expired: false, expiresInMinutes: 60 };
      
      // Compare expiration time with current time
      const now = Math.floor(Date.now() / 1000);
      const expTime = payload.exp;
      const expiresInSeconds = expTime - now;
      const expiresInMinutes = Math.floor(expiresInSeconds / 60);
      
      // Consider token expired if it's within buffer period
      const expired = expiresInMinutes <= bufferMinutes;
      
      return { 
        expired, 
        expiresInMinutes,
        expiry: new Date(expTime * 1000).toISOString() 
      };
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      return { expired: false, expiresInMinutes: 30 }; // Assume not expired on error
    }
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return { expired: false, expiresInMinutes: 30 }; // Assume not expired on error
  }
}

/**
 * Component that handles token refresh to ensure session persistence
 * - Checks token validity frequently
 * - Refreshes token proactively before expiration
 * - Provides backup mechanisms to prevent unnecessary logouts
 */
export function AuthActivity() {
  const { refreshToken, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const consecutiveErrorsRef = useRef(0);
  const initialMountDoneRef = useRef(false);
  
  // Main effect for token refresh management
  useEffect(() => {
    if (!user) return;
    
    // Only log this message once to avoid console spam
    if (!initialMountDoneRef.current) {
    console.log('AuthActivity component mounted');
      initialMountDoneRef.current = true;
      
      // Check if there was a pending logout that was blocked by navigation timing
      if (typeof window !== 'undefined') {
        try {
          const pendingLogout = window.sessionStorage.getItem('pending_logout') === 'true';
          if (pendingLogout) {
            console.log('Found pending logout, completing it now');
            // Clear the flag first to avoid loops
            window.sessionStorage.removeItem('pending_logout');
            // Force logout with a small delay to ensure the app is ready
            setTimeout(() => {
              logout({ force: true });
            }, 500);
            return; // Exit early to avoid setting up refresh
          }
        } catch (e) {
          console.error('Error checking for pending logout:', e);
        }
      }
    }
    
    // Minimum time between token refreshes to prevent loops
    const MIN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes - very conservative
    // We'll only refresh if token is about to expire in less than this time
    const REFRESH_WHEN_EXPIRES_IN = 15; // minutes
    
    // Function to safely refresh token with lockout
    const safeRefreshToken = async () => {
      // Check if another refresh is already in progress
      if (isRefreshInProgress()) {
        console.log('Token refresh already in progress, skipping duplicate');
        return false;
      }
      
      // Check when the token was last refreshed
      const lastRefreshTime = getLastRefreshTime();
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      
      // Only refresh if it's been a while since last refresh
      if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
        console.log(`Token was refreshed ${Math.floor(timeSinceLastRefresh/1000)}s ago (< ${MIN_REFRESH_INTERVAL/1000}s), skipping`);
        return false;
      }
      
      // Set refresh in progress flag
      setRefreshInProgress(true);
      console.log('Setting refresh in progress flag');
      
      try {
        // Try to refresh the token
        console.log('Attempting to refresh token (safe method)');
        const success = await refreshToken();
        
        if (success) {
          console.log('Token refresh successful');
          // Update last refresh time
          setLastRefreshTime(Date.now());
          consecutiveErrorsRef.current = 0;
          return true;
        } else {
          console.warn('Token refresh returned false');
          return false;
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        consecutiveErrorsRef.current++;
        
        // Only log out after multiple consecutive refresh failures
        if (consecutiveErrorsRef.current > 3) {
          console.warn('Multiple token refresh failures, logging out');
        logout();
        }
        
        return false;
      } finally {
        // Always reset in progress flag after a delay
        setTimeout(() => {
          console.log('Clearing refresh in progress flag');
          setRefreshInProgress(false);
        }, 2000);
      }
    };
    
    // Check token and refresh if needed
    const checkAndRefreshToken = async () => {
      try {
        // Skip if a refresh is already in progress
        if (isRefreshInProgress()) {
          console.log('Refresh in progress, skipping token check');
          return;
        }
        
        // Check when the token was last refreshed
        const lastRefreshTime = getLastRefreshTime();
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        
        // Skip frequent checks
        if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
          console.log(`Last refresh was ${Math.floor(timeSinceLastRefresh/1000)}s ago, skipping check`);
          return;
        }
        
        // Get current token from cookie
        const token = getCookie('token');
        if (!token) {
          console.log('No token available, skipping check');
          return;
        }
        
        // Check expiration status
        const { expired, expiresInMinutes } = checkTokenExpiration(token);
        console.log(`Token check: expires in ~${expiresInMinutes} minutes`);
        
        // Skip if token is still valid for a long time
        if (!expired && expiresInMinutes > REFRESH_WHEN_EXPIRES_IN * 2) {
          console.log(`Token valid for ${expiresInMinutes} minutes, no refresh needed`);
          return;
        }
        
        // If token is expired or expires soon, refresh it
        if (expired || expiresInMinutes < REFRESH_WHEN_EXPIRES_IN) {
          console.log(`Token expires soon (${expiresInMinutes} min), initiating refresh`);
          await safeRefreshToken();
        }
      } catch (error) {
        console.error('Error checking token:', error);
      }
    };
    
    // Initial check after a delay to prevent immediate refresh on mount
    const initialCheckTimeout = setTimeout(() => {
      checkAndRefreshToken();
    }, 5000); // 5 second delay for initial check
    
    // Then check regularly but not too frequently
    const interval = setInterval(() => {
      checkAndRefreshToken();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Also check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking token');
        checkAndRefreshToken();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clear on unmount
    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshToken, logout]);
  
  // Sync token between localStorage and cookies
  useEffect(() => {
    // Function to sync tokens
    const syncTokenStorage = () => {
      // Check if we have a token in localStorage but not in cookies
      const localToken = localStorage.getItem('token');
      const cookieToken = getCookie('token');

      if (localToken && !cookieToken) {
        console.log('Syncing token from localStorage to cookie');
        setCookie('token', localToken, {
          path: '/',
          maxAge: 24 * 60 * 60, // 24 hours
          sameSite: 'Strict'
        });
      } else if (cookieToken && !localToken) {
        console.log('Syncing token from cookie to localStorage');
        localStorage.setItem('token', cookieToken);
      }
    };

    // Run on initial load
    syncTokenStorage();

    // Create event listener for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        syncTokenStorage();
      }
    };

    // Listen for localStorage changes
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);
  
  // This component doesn't render anything
  return null;
}

export default AuthActivity; 