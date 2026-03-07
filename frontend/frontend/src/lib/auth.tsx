'use client';

import * as React from 'react';
import { useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api, { authClient } from './api';
import { User, AuthContextType, UserRegistrationData } from './types/auth';
import { setCookie, getCookie, removeCookie } from './cookies';

// Constants for token handling
const TOKEN_COOKIE_NAME = 'token';

// Default auth state properties
const defaultAuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

// Default auth methods (no-op functions)
const defaultAuthMethods = {
  login: async () => { return undefined; },
  logout: () => {},
  register: async () => { return undefined; },
  googleLogin: async () => { return undefined; },
  refreshToken: async () => { return false; },
};

// Create the auth context with safer defaults
const AuthContext = React.createContext<AuthContextType>({
  ...defaultAuthState,
  ...defaultAuthMethods,
});

// Global flag to prevent concurrent token refreshes
if (typeof window !== 'undefined') {
  // @ts-expect-error - Adding non-standard property to window object for token refresh state tracking
  window._tokenRefreshInProgress = window._tokenRefreshInProgress || false;
  // @ts-expect-error - Adding non-standard property to window object for token refresh timestamp
  window._lastTokenRefreshTime = window._lastTokenRefreshTime || Date.now();
}

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

// Set the refresh in progress flag
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

// Set the last refresh time in localStorage
const setLastRefreshTime = (time = Date.now()) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('_last_token_refresh_time', time.toString());
      // Also update window property
      // @ts-expect-error - Setting dynamically added window property
      window._lastTokenRefreshTime = time;
    }
  } catch (e) {
    console.error('Error setting last refresh time:', e);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Single authentication check effect that runs once on mount
  useEffect(() => {
    // Prevent double initialization
    if (hasCheckedAuth) return;

    const checkAuth = async () => {
      try {
        console.log('Auth: Starting authentication check');
        let token = getCookie(TOKEN_COOKIE_NAME);
        
        if (token) {
          console.log('Auth: Found token in cookie');
        } else {
          console.log('Auth: No token in cookie, checking localStorage backup');
        }
        
        // If no token in cookie, try to get from localStorage backup
        if (!token && typeof window !== 'undefined') {
          try {
            token = window.localStorage.getItem('auth_token_backup');
            if (token) {
              console.log('Auth: Restored token from localStorage backup');
              // Restore the cookie from the localStorage backup
              setCookie(TOKEN_COOKIE_NAME, token, {
                path: '/',
                maxAge: 24 * 60 * 60, // 24 hours
                sameSite: 'Strict'
              });
              
              // Make sure the token is set for API calls
              api.setToken(token);
            }
          } catch (e) {
            console.error('Auth: Error checking localStorage for token backup:', e);
          }
        }
        
        // No token, user is not authenticated
        if (!token) {
          console.log('Auth: No token found, user is not authenticated');
          setIsLoading(false);
          setIsAuthenticated(false);
          setUser(null);
          setHasCheckedAuth(true);
          return;
        }
        
        // Set token for API calls
        api.setToken(token);
        
        try {
          console.log('Auth: Verifying token with server...');
          // Try to get user info
          const response = await api.get('/auth/me');
          const userData = response.data.user;
          
          console.log('Auth: User verified successfully');
          
          // Valid authentication
          setUser(userData);
          setIsAuthenticated(true);
          
          // Additional backup - store user in localStorage for extreme cases
          if (typeof window !== 'undefined' && userData) {
            try {
              // Create a safe subset of user data to prevent circular references
              const safeUserBackup = {
                id: userData.id,
                email: userData.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                role: userData.role || 'user',
              };
              
              // Properly stringify the object
              const backupJson = JSON.stringify(safeUserBackup);
              
              // Verify it worked before storing
              if (backupJson && backupJson !== '[object Object]') {
                window.localStorage.setItem('user_backup', backupJson);
              }
            } catch (e) {
              console.error('Auth: Error backing up user data:', e);
              // Clean up potentially corrupted data
              try {
                window.localStorage.removeItem('user_backup');
              } catch {}
            }
          }
          
          setIsLoading(false);
          setHasCheckedAuth(true);
        } catch (error) {
          console.log('Auth: Error during authentication check:', error);
          
          // Only clear auth for actual auth failures (401/403)
          // @ts-expect-error - Error type is not well-defined in catch blocks
          const status = error.response?.status;
          
          if (status === 401 || status === 403) {
            console.log('Auth: Received 401/403 status, clearing invalid token');
            // Clear invalid token
            removeCookie(TOKEN_COOKIE_NAME);
            api.removeToken();
          } else {
            // For network errors, try to recover with cached user if available
            console.log('Auth: Network or server error, attempting recovery');
            if (typeof window !== 'undefined') {
              try {
                const cachedUser = window.localStorage.getItem('user_backup');
                if (cachedUser) {
                  // Check if it's the corrupted string
                  if (cachedUser === '[object Object]') {
                    console.warn('Auth: Found corrupted user backup, removing it');
                    window.localStorage.removeItem('user_backup');
                  } else {
                    try {
                      const userData = JSON.parse(cachedUser);
                      
                      // Validate basic user structure
                      if (userData && userData.id && userData.email) {
                        console.log('Auth: Recovered user from backup:', userData);
                        setUser(userData);
                        setIsAuthenticated(true);
                        setIsLoading(false);
                        setHasCheckedAuth(true);
                        return;
                      } else {
                        console.warn('Auth: Invalid user backup structure, removing it');
                        window.localStorage.removeItem('user_backup');
                      }
                    } catch (parseError) {
                      console.error('Auth: Error parsing user backup:', parseError);
                      window.localStorage.removeItem('user_backup');
                    }
                  }
                }
              } catch (e) {
                console.error('Auth: Error recovering user from backup:', e);
              }
            }
          }
          
          // In any error case where we couldn't recover, user is not authenticated
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          setHasCheckedAuth(true);
        }
      } catch (e) {
        // Something went wrong checking auth
        console.error('Auth: Unexpected error during auth check:', e);
        
        // Last chance recovery from user backup if available
        if (typeof window !== 'undefined') {
          try {
            const cachedUser = window.localStorage.getItem('user_backup');
            if (cachedUser) {
              // Check if it's the corrupted string
              if (cachedUser === '[object Object]') {
                console.warn('Auth: Found corrupted user backup, removing it');
                window.localStorage.removeItem('user_backup');
              } else {
                try {
                  const userData = JSON.parse(cachedUser);
                  
                  // Validate basic user structure
                  if (userData && userData.id && userData.email) {
                    console.log('Auth: Last chance recovery with cached user:', userData);
                    setUser(userData);
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    setHasCheckedAuth(true);
                    return;
                  } else {
                    console.warn('Auth: Invalid user backup structure in last chance recovery, removing it');
                    window.localStorage.removeItem('user_backup');
                  }
                } catch (parseError) {
                  console.error('Auth: Error parsing user backup in last chance recovery:', parseError);
                  window.localStorage.removeItem('user_backup');
                }
              }
            }
          } catch (recoveryError) {
            console.error('Auth: Final recovery attempt failed:', recoveryError);
          }
        }
        
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        setHasCheckedAuth(true);
      }
    };
    
    checkAuth();
  }, [hasCheckedAuth]);
  
  // Define auth operations with useCallback to ensure stable identity
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      
      // Clear any existing auth
      removeCookie(TOKEN_COOKIE_NAME);
      api.removeToken();
      
      // Reset auth failure counter
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem('auth_fail_count');
        } catch (e) {
          console.error('Error clearing auth fail count:', e);
        }
      }
      
      // Attempt login
      const response = await api.login(credentials);
      const { token, user } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Set cookie and token
      setCookie(TOKEN_COOKIE_NAME, token, {
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        sameSite: 'Strict'
      });
      api.setToken(token);
      
      // Backup user data
      if (typeof window !== 'undefined') {
        try {
          // Create a safe subset of user data
          const safeUserBackup = {
            id: user.id,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role || 'user',
          };
          
          // Properly stringify the object
          const backupJson = JSON.stringify(safeUserBackup);
          
          // Verify it worked before storing
          if (backupJson && backupJson !== '[object Object]') {
            window.localStorage.setItem('user_backup', backupJson);
          }
        } catch (e) {
          console.error('Error backing up user data on login:', e);
          // Clean up potentially corrupted data
          try {
            window.localStorage.removeItem('user_backup');
          } catch {}
        }
      }
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const register = useCallback(async (userData: UserRegistrationData) => {
    try {
      setIsLoading(true);
      
      // Clear any existing auth
      removeCookie(TOKEN_COOKIE_NAME);
      api.removeToken();
      
      // Attempt registration
      const response = await api.register(userData);
      const { token, user } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Set cookie and token
      setCookie(TOKEN_COOKIE_NAME, token, {
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        sameSite: 'Strict'
      });
      api.setToken(token);
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const googleLogin = useCallback(async (token: string) => {
    try {
      setIsLoading(true);
      
      // Clear any existing auth
      removeCookie(TOKEN_COOKIE_NAME);
      api.removeToken();
      
      // Attempt Google login - use authClient to bypass proxy and hit auth endpoint directly
      console.log('Google login: Sending request to /google via authClient');
      const response = await authClient.post('/google', { token });
      console.log('Google login: Response received', { 
        status: response.status, 
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
      
      const { token: authToken, user } = response.data || {};
      
      if (!authToken) {
        console.error('Google login: No token in response', response.data);
        throw new Error('No token received from server');
      }
      
      // Set cookie and token
      setCookie(TOKEN_COOKIE_NAME, authToken, {
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        sameSite: 'Strict'
      });
      api.setToken(authToken);
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const logout = useCallback((options: { redirect?: boolean, force?: boolean } = { redirect: true }) => {
    console.log('Logging out user...');
    
    // Prevent accidental logout during page load/refresh
    // by checking if this is happening during a page initialization
    if (!options.force && typeof window !== 'undefined' && window.performance) {
      const navigationEntries = window.performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        // @ts-expect-error - PerformanceNavigationTiming might not have a type property
        const navigationType = navigationEntries[0].type; 
        
        if (navigationType === 'reload' && Date.now() - window.performance.timeOrigin < 3000) {
          console.warn('Blocked logout attempt during page reload');
          
          // Store that this was a blocked logout, so we can retry it
          try {
            window.sessionStorage.setItem('pending_logout', 'true');
          } catch (e) {
            console.error('Error setting pending logout flag:', e);
          }
          
          return; // Don't logout during page reload within first 3 seconds
        }
      }
    }
    
    // Clear pending logout flag
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem('pending_logout');
      } catch (e) {
        console.error('Error clearing pending logout flag:', e);
      }
    }
    
    // Clear auth cookie
    removeCookie(TOKEN_COOKIE_NAME);
    api.removeToken();
    
    // Also clear related localStorage items for consistency
    if (typeof window !== 'undefined') {
      try {
        // Don't clear entire sessionStorage, just auth-related items
        window.sessionStorage.removeItem('auth_fail_count');
        
        // Clear localStorage items that might contain user data
        window.localStorage.removeItem('user_cache');
        window.localStorage.removeItem('subscription_status_cache');
        window.localStorage.removeItem('currentUser');
        window.localStorage.removeItem('user_backup');
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('auth_token_backup');
        window.localStorage.removeItem('_token_refresh_in_progress');
        window.localStorage.removeItem('_last_token_refresh_time');
      } catch (e) {
        console.error('Error clearing storage during logout:', e);
      }
    }
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    // Mark as having checked authentication to prevent immediate recheck
    setHasCheckedAuth(true);
    
    // Redirect if requested
    if (options.redirect !== false) {
      router.push('/');
    }
  }, [router]);

  const refreshToken = useCallback(async () => {
    // Prevent concurrent refresh operations globally across the app
    if (isRefreshInProgress()) {
      console.log('Token refresh already in progress, skipping duplicate call');
      return false;
    }
    
    // Check if token was refreshed recently
    const lastRefreshTime = getLastRefreshTime();
    const timeSinceLastRefresh = Date.now() - lastRefreshTime;
    const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      console.log(`Token was refreshed ${Math.floor(timeSinceLastRefresh/1000)}s ago (< ${MIN_REFRESH_INTERVAL/1000}s), skipping`);
      return false;
    }
    
    // Set global refresh in progress flag
    setRefreshInProgress(true);
    console.log('Setting refresh in progress flag');

    try {
      // Get current token
      const token = getCookie(TOKEN_COOKIE_NAME);
      
      if (!token) {
        console.log('No token to refresh');
        // Reset flag and exit
        setRefreshInProgress(false);
        throw new Error('No token available');
      }
      
      // Call token refresh endpoint
      console.log('Attempting to refresh token');
      const response = await api.get('/auth/refresh');
      
      // Extract new token
      const { token: newToken, user: userData } = response.data;
      
      if (!newToken) {
        // Reset flag and exit
        setRefreshInProgress(false);
        throw new Error('No token received from refresh endpoint');
      }
      
      // Set new token in cookie
      setCookie(TOKEN_COOKIE_NAME, newToken, {
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        sameSite: 'Strict'
      });
      
      // Also update API client with new token
      api.setToken(newToken);
      
      // Check if user data was returned and update state if needed
      if (userData) {
        setUser(userData);
      }
      
      // Also store in localStorage for backup
      try {
        localStorage.setItem('auth_token_backup', newToken);
        // Update the global last refresh time
        setLastRefreshTime(Date.now());
      } catch (e) {
        console.error('Error backing up refreshed token:', e);
      }
      
      // Token refresh successful
      console.log('Token refresh completed successfully');
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    } finally {
      // Always reset the in-progress flag after a delay
      setTimeout(() => {
        console.log('Clearing refresh in progress flag');
        setRefreshInProgress(false);
      }, 2000);
    }
  }, []);

  // Create stable auth context value using memoization
  const value: AuthContextType = React.useMemo(() => ({
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    googleLogin,
    refreshToken,
  }), [user, isLoading, isAuthenticated, login, logout, register, googleLogin, refreshToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType & { loading: boolean } {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth must be used within an AuthProvider');
    // Return safe defaults instead of throwing (more resilient to timing issues)
    return {
      ...defaultAuthState, 
      ...defaultAuthMethods,
      loading: true
    };
  }
  return {
    ...context,
    loading: context.isLoading // Add backward compatibility for loading
  };
} 