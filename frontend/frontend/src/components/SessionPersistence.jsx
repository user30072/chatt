'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { setCookie, getCookie } from '@/lib/cookies';
import { useIsRefresh } from '@/lib/browserUtils';

// Check if token refresh is in progress via localStorage for cross-component coordination
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

// Get the last refresh time from localStorage
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

/**
 * SessionPersistence component that ensures users remain logged in across page refreshes
 * 
 * This component:
 * 1. Synchronizes token storage between cookies and localStorage
 * 2. Prevents accidental logouts during page refresh
 * 3. Provides recovery mechanisms for network issues
 */
export default function SessionPersistence() {
  const { user, refreshToken } = useAuth();
  const { isRefresh } = useIsRefresh('global_session');
  const hasRefreshedOnLoadRef = useRef(false);
  
  // Sync tokens between storage mechanisms
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const syncTokens = () => {
      try {
        const cookieToken = getCookie('token');
        const localToken = localStorage.getItem('token');
        const backupToken = localStorage.getItem('auth_token_backup');
        
        // If we have a token in any storage, make sure it's in all storage
        const bestToken = cookieToken || localToken || backupToken;
        
        if (bestToken) {
          // Update cookie if needed
          if (!cookieToken) {
            console.log('Restoring token to cookie from backup storage');
            setCookie('token', bestToken, {
              path: '/',
              maxAge: 24 * 60 * 60, // 24 hours
              sameSite: 'Strict'
            });
          }
          
          // Update localStorage if needed
          if (!localToken) {
            console.log('Restoring token to localStorage from backup storage');
            localStorage.setItem('token', bestToken);
          }
          
          // Update backup if needed
          if (!backupToken) {
            console.log('Creating backup token in localStorage');
            localStorage.setItem('auth_token_backup', bestToken);
          }
        }
      } catch (error) {
        console.error('Error syncing tokens:', error);
      }
    };
    
    // Run immediately
    syncTokens();
    
    // Also run when localStorage changes
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'auth_token_backup') {
        syncTokens();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Handle token refresh on page refresh - but only once
  useEffect(() => {
    if (!user || hasRefreshedOnLoadRef.current) return;
    
    // Only perform a refresh if needed and if no other refresh is in progress
    const checkIfRefreshNeeded = () => {
      // Check if another refresh is already in progress
      if (isRefreshInProgress()) {
        console.log('Token refresh already in progress elsewhere, skipping on page load');
        return false;
      }
      
      const MIN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
      
      // Check when the token was last refreshed globally
      const lastRefreshTime = getLastRefreshTime();
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      
      // Only refresh if it's been at least the minimum interval since the last refresh
      return timeSinceLastRefresh >= MIN_REFRESH_INTERVAL;
    };
    
    // If this is a page refresh and we have a user, refresh the token
    // to ensure it doesn't expire during the user's session - but only if needed
    if (isRefresh && !hasRefreshedOnLoadRef.current && checkIfRefreshNeeded()) {
      // Mark as refreshed to prevent multiple refreshes
      hasRefreshedOnLoadRef.current = true;
      
      console.log('Page refresh detected, checking if token refresh needed');
      
      // Get current token
      const token = getCookie('token');
      if (!token) {
        console.log('No token found for refresh');
        return;
      }
      
      // Only refresh if the token is about to expire soon
      try {
        // Extract expiry from JWT token
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.exp) {
            const expiresInSeconds = payload.exp - Math.floor(Date.now() / 1000);
            const expiresInMinutes = Math.floor(expiresInSeconds / 60);
            
            // Only refresh if token expires in less than 30 minutes
            if (expiresInMinutes < 30) {
              console.log(`Token expires in ${expiresInMinutes} minutes, refreshing on page load`);
              refreshToken()
                .then(() => {
                  console.log('Token refreshed after page load');
                })
                .catch(error => {
                  console.error('Token refresh on page load failed:', error);
                });
            } else {
              console.log(`Token still valid for ${expiresInMinutes} minutes, no refresh needed on page load`);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing token expiry:', error);
      }
    } else {
      // Mark as refreshed to prevent future attempts
      hasRefreshedOnLoadRef.current = true;
      
      if (isRefresh) {
        console.log('Skipping token refresh on page load (not needed or recently refreshed)');
      }
    }
  }, [user, isRefresh, refreshToken]);
  
  // Check token when tab visibility changes
  useEffect(() => {
    if (!user) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh when becoming visible
        refreshToken().catch(console.error);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshToken]);
  
  // This component doesn't render anything
  return null;
} 