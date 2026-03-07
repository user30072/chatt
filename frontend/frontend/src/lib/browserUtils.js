'use client';

/**
 * Browser API Utilities
 * 
 * Safe methods for accessing browser-only APIs that won't break during server-side rendering.
 * These functions should be used instead of directly accessing browser APIs like localStorage,
 * sessionStorage, window, etc. in components that might be rendered on the server.
 */

// Helper to check if code is running in browser environment
export const isBrowser = typeof window !== 'undefined';

// Run cache cleanup as early as possible
if (isBrowser) {
  try {
    // Clean localStorage immediately on module load
    (function() {
      console.log('Running immediate cache validation on module load...');
      
      const knownCachedObjects = [
        'user_cache',
        'user_backup',
        'subscription_status_cache',
        '_token_refresh_in_progress',
        '_last_token_refresh_time'
      ];
      
      knownCachedObjects.forEach(key => {
        try {
          if (typeof window.localStorage === 'undefined') return;
          
          const value = window.localStorage.getItem(key);
          if (!value) return;
          
          // Remove corrupted object representation
          if (value === '[object Object]' || value === '"[object Object]"') {
            console.warn(`[Startup] Found corrupted cache value for ${key}, removing it`);
            window.localStorage.removeItem(key);
            return;
          }
          
          // Validate JSON if applicable
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              JSON.parse(value); // Test if it's valid JSON
            } catch (e) {
              console.warn(`[Startup] Invalid JSON in ${key}, removing it:`, e.message);
              window.localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Any error during validation means we should clean up
          console.error(`[Startup] Error checking ${key}, removing it:`, e);
          try {
            window.localStorage.removeItem(key);
          } catch {}
        }
      });
      
      console.log('[Startup] Initial cache validation complete');
    })();
  } catch (e) {
    console.error('[Startup] Error during initial cache cleanup:', e);
  }
}

// SessionStorage utilities
export const sessionStorage = {
  getItem: (key) => {
    if (isBrowser) {
      return window.sessionStorage.getItem(key);
    }
    return null;
  },
  
  setItem: (key, value) => {
    if (isBrowser) {
      window.sessionStorage.setItem(key, value);
    }
  },
  
  removeItem: (key) => {
    if (isBrowser) {
      window.sessionStorage.removeItem(key);
    }
  },
  
  clear: () => {
    if (isBrowser) {
      window.sessionStorage.clear();
    }
  }
};

// Safely get an item from localStorage with better error handling
const getLocalStorageItem = (key, defaultValue = null) => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    // Only attempt to parse if the item exists and isn't undefined
    if (item !== null && item !== undefined && item !== 'undefined') {
      // Check if this is an improperly stringified object
      if (item === '[object Object]' || item === '"[object Object]"') {
        console.warn(`Found improperly stringified object in localStorage for key: ${key}`);
        window.localStorage.removeItem(key);
        return defaultValue;
      }
      
      // Special handling for auth tokens that start with "Bearer"
      if (key === 'token' || key === 'auth_token_backup' || 
          (typeof item === 'string' && item.startsWith('Bearer '))) {
        return item; // Return as is without parsing
      }
      
      // Special handling for version numbers that might be numeric only
      if (key === 'app_version') {
        return item; // Return as is without parsing
      }
      
      try {
        // Check if this is a valid JSON string before parsing
        if (typeof item === 'string' && 
            ((item.startsWith('{') && item.endsWith('}')) || 
             (item.startsWith('[') && item.endsWith(']')) ||
             (item === 'null') || 
             (item === 'true') || 
             (item === 'false'))) {
          return JSON.parse(item);
        } else {
          // Not JSON format, return as is
          return item;
        }
      } catch (parseError) {
        // If it's not valid JSON, return the raw value and log warning
        console.warn(`Could not parse JSON for key ${key}:`, parseError);
        
        // If this is subscription_status_cache, clean it up
        if (key === 'subscription_status_cache' || key === 'user_cache' || key === 'user_backup') {
          console.warn(`Removing corrupted data for ${key}`);
          window.localStorage.removeItem(key);
          return defaultValue;
        }
        
        return item;
      }
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    
    // Clean up potentially corrupted data for important keys
    if (key === 'subscription_status_cache' || key === 'user_cache' || key === 'user_backup') {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    
    return defaultValue;
  }
};

// Safely set an item in localStorage with error handling
const setLocalStorageItem = (key, value) => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Handle various value types properly
    let serialized;
    
    if (value === null || value === undefined) {
      serialized = null;
    } else if (typeof value === 'string') {
      // Detect already corrupted values and prevent storing them
      if (value === "[object Object]" || value === '"[object Object]"') {
        console.warn(`Prevented storing corrupted string "${value}" for key: ${key}`);
        window.localStorage.removeItem(key);
        return false;
      }
      
      // Special handling for auth tokens - store as is
      if (key === 'token' || key === 'auth_token_backup' || value.startsWith('Bearer ')) {
        serialized = value;
      } else {
        serialized = value;
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      serialized = value.toString();
    } else {
      // For objects, arrays, etc.
      try {
        // Detect if value is already a string, bail out
        if (typeof value === 'object' && String(value) === '[object Object]') {
          console.warn(`Prevented corruption: Object would serialize to [object Object] for key: ${key}`);
          window.localStorage.removeItem(key);
          return false;
        }
        
        // Check if value is already a string that looks like JSON
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          // Try parsing it to validate it's proper JSON
          JSON.parse(value);
          serialized = value; // Use as is if it's valid JSON
        } else {
          // For objects that need proper serialization
          serialized = JSON.stringify(value);
          
          // Verify successful serialization
          if (serialized === undefined || serialized === 'undefined' || 
              serialized === '[object Object]' || serialized === '"[object Object]"') {
            console.warn(`Prevented storing corrupted JSON data "${serialized}" for ${key}`);
            window.localStorage.removeItem(key);
            return false;
          }
          
          // Special validation for user_cache and subscription_status_cache
          if (key === 'user_cache' || key === 'subscription_status_cache' || key === 'user_backup') {
            // Validate by parsing back to ensure valid JSON
            const testParse = JSON.parse(serialized);
            
            // Make sure we actually got a valid object back
            if (!testParse || typeof testParse !== 'object' || 
                String(testParse) === '[object Object]') {
              console.warn(`Prevented storing invalid object data for ${key}`);
              return false;
            }
          }
        }
      } catch (jsonError) {
        console.error(`Error stringifying value for key ${key}:`, jsonError);
        // For critical objects, don't store corrupted data
        if (key === 'user_cache' || key === 'subscription_status_cache' || key === 'user_backup') {
          console.warn(`Prevented storing corrupted data for ${key}`);
          window.localStorage.removeItem(key);
          return false;
        }
        // Don't fall back to string representation for non-critical data either
        window.localStorage.removeItem(key);
        return false;
      }
    }
    
    // Don't store undefined
    if (serialized === undefined || serialized === 'undefined') {
      window.localStorage.removeItem(key);
      return false;
    }
    
    // Final safety checks for corrupted data
    if (serialized === '[object Object]' || serialized === '"[object Object]"') {
      console.warn(`Last chance prevention of corrupted data: ${serialized} for key: ${key}`);
      window.localStorage.removeItem(key);
      return false;
    }
    
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    try {
      // If there's an error, try removing the item
      window.localStorage.removeItem(key);
    } catch {}
    return false;
  }
};

// Safe localStorage wrapper - enhanced version with better error handling
export const localStorage = {
  getItem: getLocalStorageItem,
  setItem: setLocalStorageItem,
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

// Hook for safely checking if we're in browser and it's mounted
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  return isMounted;
}

// Hook for detecting page refresh with multi-refresh support
export function useIsRefresh(key = 'page_visited') {
  const [isRefresh, setIsRefresh] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const isMounted = useIsMounted();
  
  useEffect(() => {
    if (isMounted) {
      try {
        // Check if this is a first visit or a refresh
        const wasVisited = sessionStorage.getItem(key);
        
        // If page was visited before, it's a refresh
        if (wasVisited) {
          setIsRefresh(true);
          
          // Track refresh count for debugging
          const currentCount = parseInt(sessionStorage.getItem('refresh_count') || '0');
          const newCount = currentCount + 1;
          setRefreshCount(newCount);
          sessionStorage.setItem('refresh_count', newCount.toString());
          
          // Log refresh count for debugging
          console.log(`Page refresh #${newCount} detected`);
        } else {
          // First visit, not a refresh
          setIsRefresh(false);
          setRefreshCount(0);
          sessionStorage.setItem('refresh_count', '0');
        }
        
        // Mark page as visited in any case
        sessionStorage.setItem(key, 'true');
      } catch (error) {
        console.error('Error in useIsRefresh hook:', error);
      }
    }
  }, [isMounted, key]);
  
  return {
    isRefresh,
    refreshCount,
    isFirstRefresh: isRefresh && refreshCount === 1,
    isMultipleRefresh: isRefresh && refreshCount > 1,
  };
}

// Helper functions for cookie management
export function getCookieHelper(name) {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

export function setCookieHelper(name, value) {
  if (typeof document === 'undefined') return;
  
  const options = {
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production'
  };
  
  let cookieString = `${name}=${value}`;
  cookieString += `; path=${options.path}`;
  cookieString += `; max-age=${options.maxAge}`;
  cookieString += `; samesite=${options.sameSite}`;
  if (options.secure) cookieString += '; secure';
  document.cookie = cookieString;
}

/**
 * Hook that creates a stable event handler that won't suffer from stale closure problems
 * This is especially helpful for handlers that need to survive refresh cycles
 * 
 * @param {Function} callback The function to call when the event fires
 * @param {Array} [dependencies=[]] Dependencies that should cause the handler to be regenerated
 * @returns {Function} A stable handler function
 */
export function useStableHandler(callback, dependencies = []) {
  // Store the callback in a ref that's updated on each render
  const callbackRef = useRef(callback);
  
  // Update the ref whenever the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Ensure dependencies is always an array for ESLint
  const deps = useMemo(() => {
    return Array.isArray(dependencies) ? dependencies : [];
  }, [dependencies]);
  
  // Return a stable function that calls the latest callback
  return useCallback((...args) => {
    return callbackRef.current(...args);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is intentionally dynamic
  }, deps);
}

/**
 * @deprecated Use useStableHandler hook instead
 */
export function createStableHandler(callback) {
  console.warn('createStableHandler is deprecated. Use the useStableHandler hook instead.');
  // This is just a compatibility wrapper that returns the callback directly
  // to avoid breaking existing code during migration
  return callback;
} 

// Add this function to safely clean up corrupted localStorage items
export const cleanupCache = () => {
  if (typeof window === 'undefined') return;
  
  console.log('Running cache validation and cleanup...');
  
  try {
    // List of keys to check and validate
    const jsonKeys = [
      'user_cache',
      'user_backup',
      'subscription_status_cache',
      '_token_refresh_in_progress',
      '_last_token_refresh_time',
      'token',
      'auth_token_backup',
      'refresh_count'
    ];
    
    // Check each key for valid JSON
    jsonKeys.forEach(key => {
      try {
        // Use raw localStorage to bypass our wrapper during cleanup
        // to avoid potential circular dependencies during error handling
        if (typeof window.localStorage === 'undefined') return;
        
        const value = window.localStorage.getItem(key);
        
        // Skip if key doesn't exist
        if (value === null) return;
        
        // Check for the corrupted "[object Object]" string
        if (value === '[object Object]' || value === '"[object Object]"') {
          console.warn(`Found corrupted cache value for ${key}, removing it`);
          window.localStorage.removeItem(key);
          return;
        }
        
        // If it's supposed to be JSON (starts with { or [), try to parse it
        if (typeof value === 'string' && 
            (value.startsWith('{') || value.startsWith('['))) {
          try {
            // Validate by parsing
            JSON.parse(value);
            // If it parses successfully, it's valid
          } catch (parseError) {
            // Invalid JSON, remove it
            console.warn(`Invalid JSON in ${key}, removing it:`, parseError.message);
            window.localStorage.removeItem(key);
          }
        }
      } catch (e) {
        // Any error during validation, clean up to be safe
        console.error(`Error validating ${key}, removing it:`, e);
        try {
          window.localStorage.removeItem(key);
        } catch (removeError) {
          console.error(`Failed to remove ${key}:`, removeError);
        }
      }
    });

    // Also check for any other clearly corrupted items
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        const value = window.localStorage.getItem(key);
        
        if (value === '[object Object]' || value === '"[object Object]"') {
          console.warn(`Found additional corrupted cache value for ${key}, removing it`);
          window.localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error checking additional localStorage items:', e);
    }
    
    console.log('Cache validation complete');
  } catch (e) {
    console.error('Error during cache cleanup:', e);
  }
}; 