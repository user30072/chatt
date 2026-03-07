'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import SessionPersistence from '@/components/SessionPersistence';
import { AuthActivity } from '@/components/AuthActivity';

// Helper to ensure we only have one instance of auth components
// and clean up any corrupted localStorage data
function ensureSingleInstance() {
  if (typeof window === 'undefined') return;
  
  // Reset any stale flags on initialization
  try {
    // Clear token refresh state to avoid being stuck
    if (window.localStorage.getItem('_token_refresh_in_progress') === 'true') {
      console.log('Clearing stale token refresh in progress flag on app initialization');
      window.localStorage.setItem('_token_refresh_in_progress', 'false');
    }
    
    // Check for and clean up corrupted localStorage data
    const keysToCheck = [
      'user_cache', 
      'subscription_status_cache', 
      'user_backup', 
      'token'
    ];
    
    for (const key of keysToCheck) {
      try {
        const value = window.localStorage.getItem(key);
        
        // Check for direct string corruption
        if (value === '[object Object]') {
          console.log(`Clearing corrupted localStorage value for ${key}`);
          window.localStorage.removeItem(key);
          continue;
        }
        
        // For JSON data, verify it's valid
        if (value && typeof value === 'string' && 
            (value.startsWith('{') || value.startsWith('['))) {
          try {
            // Test parse it to verify it's valid
            JSON.parse(value);
          } catch (jsonError) {
            console.log(`Removing invalid JSON in localStorage for ${key}`);
            window.localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error(`Error checking localStorage key ${key}:`, e);
      }
    }
    
    // Clear session counts to avoid excessive refreshes
    window.sessionStorage.setItem('refresh_count', '0');
  } catch (e) {
    console.error('Error ensuring single instance:', e);
  }
}

export function Providers({ children }) {
  // Initialize on mount
  useEffect(() => {
    ensureSingleInstance();
  }, []);
  
  return (
    <AuthProvider>
      <SessionPersistence />
      <AuthActivity />
      {children}
    </AuthProvider>
  );
} 