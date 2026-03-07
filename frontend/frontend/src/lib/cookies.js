/**
 * Cookie utilities with improved resiliency
 */

// Default options for cookies
const DEFAULT_COOKIE_OPTIONS = {
  path: '/',          // Available on all paths
  sameSite: 'Strict', // Strictly same-site
  secure: process.env.NODE_ENV === 'production', // Secure in production
  maxAge: 24 * 60 * 60 // 24 hours in seconds
};

/**
 * Get a cookie value by name
 * 
 * @param {string} name - The cookie name
 * @returns {string|null} The cookie value or null if not found
 */
export function getCookie(name) {
  try {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      
      // Check if this cookie starts with the name we're looking for
      if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
      }
    }
  } catch (e) {
    console.error(`Error getting cookie ${name}:`, e);
  }
  
  return null;
}

/**
 * Set a cookie with the given name and value
 * 
 * @param {string} name - The cookie name
 * @param {string} value - The cookie value
 * @param {Object} options - Cookie options
 */
export function setCookie(name, value, options = {}) {
  try {
    if (typeof document === 'undefined') return;
    
    // Merge default options with provided options
    const cookieOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
    
    // Build the cookie string
    let cookieString = `${name}=${value}`;
    
    // Add all options
    if (cookieOptions.path) {
      cookieString += `; path=${cookieOptions.path}`;
    }
    
    if (cookieOptions.domain) {
      cookieString += `; domain=${cookieOptions.domain}`;
    }
    
    if (cookieOptions.maxAge) {
      cookieString += `; max-age=${cookieOptions.maxAge}`;
    }
    
    if (cookieOptions.expires) {
      cookieString += `; expires=${cookieOptions.expires.toUTCString()}`;
    }
    
    if (cookieOptions.secure) {
      cookieString += '; secure';
    }
    
    if (cookieOptions.sameSite) {
      cookieString += `; samesite=${cookieOptions.sameSite}`;
    }
    
    // Set the cookie
    document.cookie = cookieString;
  } catch (e) {
    console.error(`Error setting cookie ${name}:`, e);
  }
}

/**
 * Remove a cookie by name
 * 
 * @param {string} name - The cookie name
 * @param {Object} options - Cookie options
 */
export function removeCookie(name, options = {}) {
  try {
    if (typeof document === 'undefined') return;
    
    // Merge default options with provided options
    const cookieOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
    
    // To remove a cookie, set its expiration in the past
    setCookie(name, '', {
      ...cookieOptions,
      expires: new Date(0), // Date in the past
      maxAge: -1,           // Immediate expiration
    });
  } catch (e) {
    console.error(`Error removing cookie ${name}:`, e);
  }
}

/**
 * Refresh a cookie by extending its expiration
 * 
 * @param {string} name - The cookie name
 * @param {Object} options - Cookie options
 */
export function refreshCookie(name, options = {}) {
  try {
    const value = getCookie(name);
    if (value) {
      setCookie(name, value, options);
      return true;
    }
  } catch (e) {
    console.error(`Error refreshing cookie ${name}:`, e);
  }
  
  return false;
}

// Export cookie utility functions as an object
const cookieUtils = {
  setCookie,
  getCookie,
  removeCookie,
  refreshCookie
};

export default cookieUtils; 