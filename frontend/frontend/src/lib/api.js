import axios from 'axios';
import { getCookie, setCookie, removeCookie } from './cookies';

// API base URL - use the proxy to avoid CORS issues
const API_URL = '/api/proxy';

// Direct auth endpoints that bypass the proxy (hit backend directly)
const AUTH_API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');
const AUTH_API_URL = `${AUTH_API_BASE}/auth`;

// Direct backend URL for certain scenarios (used in some environments)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DIRECT_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Get timeout from environment variables or use 30 seconds default
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10);

// Create axios instance with request interceptor for token
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: API_TIMEOUT, // Use environment variable for timeout
});

// Create a separate client for authentication with longer timeout
export const authClient = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: API_TIMEOUT * 2, // Double timeout for auth operations
});

// Add request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = getCookie('token');
    if (token) {
      // Only log in development and only if explicitly enabled
      if (process.env.NODE_ENV === 'development' && window._enableApiDebugLogs) {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      // Always attach token with Bearer prefix regardless of format
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    
    // If sending FormData, remove Content-Type to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Same interceptor for auth client
authClient.interceptors.request.use(
  (config) => {
    const token = getCookie('token');
    if (token) {
      // Always attach token with Bearer prefix regardless of format
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Auth Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors consistently
apiClient.interceptors.response.use(
  (response) => {
    // Only log in development and only if explicitly enabled
    if (process.env.NODE_ENV === 'development' && window._enableApiDebugLogs) {
      console.log(`API Response: ${response.status} - ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Track network error counts to avoid excessive redirects
    if (!window._networkErrorCount) {
      window._networkErrorCount = 0;
    }
    
    if (error.response) {
      // Only log server errors and auth errors
      if (error.response.status >= 500 || error.response.status === 401) {
        console.error('API Error:', error.message, 'Status:', error.response.status, 'URL:', error.config?.url);
      }
      
      // Handle authentication errors
      if (error.response.status === 401) {
        console.log('Authentication error detected');
        
        // Don't remove the token on every 401, only if it's explicitly about token validity
        const isTokenInvalid = 
          error.response.data?.message?.includes('invalid') ||
          error.response.data?.message?.includes('expired') ||
          error.response.data?.message?.includes('token');
          
        if (isTokenInvalid) {
          removeCookie('token');
          delete apiClient.defaults.headers.common['Authorization'];
          
          // Only redirect if we're in a browser environment and on a protected route
          // and not already on login page
          if (typeof window !== 'undefined' && 
              !window.location.pathname.startsWith('/login') && 
              !window.location.pathname.startsWith('/register') &&
              !window.location.pathname.startsWith('/auth')) {
            
            // Store the current URL to redirect back after login
            try {
              sessionStorage.setItem('login_redirect', window.location.pathname);
            } catch (e) {
              console.error('Failed to store login redirect path:', e);
            }
            
            // Only redirect after multiple authentication failures
            // to avoid disrupting the user experience on temporary issues
            const authFailCount = parseInt(sessionStorage.getItem('auth_fail_count') || '0');
            if (authFailCount > 2) { // Only redirect after multiple failures
              console.log('Multiple authentication failures, redirecting to login');
              window.location.href = '/login';
            } else {
              // Increment the counter
              try {
                sessionStorage.setItem('auth_fail_count', (authFailCount + 1).toString());
              } catch (e) {
                console.error('Failed to update auth fail count:', e);
              }
            }
          }
        }
      }
      
      // Handle organization permission errors
      if (error.response.status === 403 && 
          error.response.data?.message?.includes('organization')) {
        console.error('Organization permission error:', error.response.data.message);
      }
    } else if (error.request) {
      // For network errors, don't clear auth state
      window._networkErrorCount++;
      console.error(`Network error (${window._networkErrorCount}) - no response received:`, error.message);
      
      // Only log detailed information for repeated network failures
      if (window._networkErrorCount > 3) {
        console.error('Repeated network failures, details:', error);
      }
    }
    
    return Promise.reject(error);
  }
);

// Same interceptor for auth client
authClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('Auth Error:', error.message, 'Status:', error.response.status, 'URL:', error.config?.url);
    } else if (error.request) {
      console.error('Auth Network error - no response received:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API endpoint functions

// Health Check
export const checkHealth = async () => {
  try {
    const response = await axios.get('/api/proxy/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

// Auth - using direct endpoints
export const apiSignup = async (userData) => {
  console.log('Using direct signup endpoint for better reliability');
  return authClient.post('/signup', userData);
};

export const apiLogin = async (credentials) => {
  console.log('Using direct login endpoint for better reliability');
  return authClient.post('/login', credentials);
};

// Chatbots
export const apiGetChatbots = async () => {
  try {
    console.log('API: Getting chatbots');
    const response = await apiClient.get('/chatbots');
    return response;
  } catch (error) {
    console.error('Error fetching chatbots:', error.message);
    // Add permission context to error
    if (error.response?.status === 403) {
      error.permissionError = true;
    }
    throw error;
  }
};

export const apiGetChatbot = async (id) => {
  try {
    console.log(`API: Getting chatbot with ID: ${id}`);
    const response = await apiClient.get(`/chatbots/${id}`);
    return response;
  } catch (error) {
    console.error(`Error fetching chatbot ${id}:`, error.message);
    // Add permission context to error
    if (error.response?.status === 403) {
      error.permissionError = true;
      error.message = 'You do not have permission to access this chatbot';
    }
    throw error;
  }
};

export const apiCreateChatbot = async (chatbotData) => {
  try {
    console.log('API: Creating chatbot with data:', chatbotData);
    const response = await apiClient.post('/chatbots', chatbotData);
    console.log('API: Chatbot created successfully, raw response:', response);
    
    // Add debugging to show the exact structure received
    if (response.data) {
      console.log('API: Response data:', JSON.stringify(response.data));
      
      // Log if we can find an ID
      if (response.data.chatbot?.id) {
        console.log('API: Found ID in response.data.chatbot.id:', response.data.chatbot.id);
      } else if (response.data.id) {
        console.log('API: Found ID in response.data.id:', response.data.id);
      } else {
        console.log('API: No obvious ID found in response');
      }
    }
    
    return response;
  } catch (error) {
    console.error('API: Error creating chatbot:', error.message);
    throw error;
  }
};

// Helper methods
export const apiService = {
  setToken(token) {
    // Set cookie
    if (token) {
      setCookie('token', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
      // Set the authorization header on the API client
      apiClient.defaults.headers.common['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      
      // Also save to localStorage as a backup
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('auth_token_backup', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
        } catch (e) {
          console.error('Error saving token to localStorage:', e);
        }
      }
    }
  },

  removeToken() {
    removeCookie('token');
    delete apiClient.defaults.headers.common['Authorization'];
    
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('auth_token_backup');
      } catch (e) {
        console.error('Error removing token from localStorage:', e);
      }
    }
  },

  getClient() {
    return apiClient;
  },

  checkHealth() {
    return checkHealth();
  },

  login(credentials) {
    return apiLogin(credentials);
  },

  register(userData) {
    return apiSignup(userData);
  },

  getChatbots() {
    return apiGetChatbots();
  },

  getChatbot(id) {
    return apiGetChatbot(id);
  },

  createChatbot(data) {
    return apiCreateChatbot(data);
  },

  updateChatbot(id, data) {
    return apiClient.put(`/chatbots/${id}`, data);
  },

  deleteChatbot(id) {
    return apiClient.delete(`/chatbots/${id}`);
  },

  getChatbotCustomization(id) {
    return apiClient.get(`/chatbots/${id}/customization`);
  },

  updateChatbotCustomization(id, data) {
    return apiClient.put(`/chatbots/${id}/customization`, data);
  },

  getWebsiteIntegration(id) {
    return apiClient.get(`/chatbots/${id}/website-integration`);
  },

  // Get all documents for the current user
  getAllDocuments() {
    return apiClient.get('/documents');
  },

  // Get documents for a specific chatbot
  getDocuments(chatbotId) {
    return apiClient.get(`/chatbots/${chatbotId}/documents`);
  },

  uploadDocument(formData) {
    // The request interceptor will auto-detect FormData and set the correct Content-Type
    return apiClient.post('/documents', formData);
  },

  deleteDocument(id) {
    return apiClient.delete(`/documents/${id}`);
  },

  getConversations(params) {
    return apiClient.get('/conversations', { params });
  },

  getConversation(id) {
    return apiClient.get(`/conversations/${id}`);
  },

  getAnalyticsSummary(period) {
    return apiClient.get('/analytics/summary', { params: { period } });
  },

  getConversationMetrics(params) {
    return apiClient.get('/analytics/conversations', { params });
  },

  getUsageMetrics(params) {
    return apiClient.get('/analytics/usage', { params });
  },

  getOrganizations(params) {
    return apiClient.get('/organizations', { params });
  },

  getOrganizationDetails(id) {
    return apiClient.get(`/organizations/${id}`);
  },

  getPlatformStats() {
    return apiClient.get('/platform/stats');
  },

  get(endpoint, config) {
    return apiClient.get(endpoint, config);
  },

  post(endpoint, data, config) {
    return apiClient.post(endpoint, data, config);
  },

  put(endpoint, data, config) {
    return apiClient.put(endpoint, data, config);
  },

  delete(endpoint, config) {
    return apiClient.delete(endpoint, config);
  },

  // Database Admin Methods
  getDatabaseTables() {
    return apiClient.get('/admin/database/tables');
  },

  getDatabaseTableData(tableName, page = 1, pageSize = 10, searchQuery = '') {
    return apiClient.get(`/admin/database/tables/${tableName}`, {
      params: { page, pageSize, search: searchQuery }
    });
  },

  createDatabaseRecord(tableName, recordData) {
    return apiClient.post(`/admin/database/tables/${tableName}`, recordData);
  },

  updateDatabaseRecord(tableName, primaryKeyColumn, primaryKeyValue, recordData) {
    return apiClient.put(`/admin/database/tables/${tableName}/${primaryKeyColumn}/${primaryKeyValue}`, recordData);
  },

  deleteDatabaseRecord(tableName, primaryKeyColumn, primaryKeyValue) {
    return apiClient.delete(`/admin/database/tables/${tableName}/${primaryKeyColumn}/${primaryKeyValue}`);
  },

  exportDatabaseTable(tableName) {
    return apiClient.get(`/admin/database/tables/${tableName}/export`, {
      responseType: 'blob'
    });
  },

  runDatabaseQuery(query) {
    return apiClient.post('/admin/database/query', { query });
  },
};

// Create and export the useApi hook
export function useApi() {
  return apiService;
}

// Export apiService as the default export
export default apiService;