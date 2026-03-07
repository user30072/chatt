// Direct API endpoint for signup to avoid proxy timeout issues
import axios from 'axios';

// Get the API URL and timeout from environment variables - strip any trailing /api
const rawBackendUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
// Normalize the API URL to ensure it has the correct format
const API_URL = rawBackendUrl.endsWith('/api') 
  ? rawBackendUrl
  : rawBackendUrl + (rawBackendUrl.endsWith('/') ? 'api' : '/api');

const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '60000', 10);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Generate a request ID for tracking
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[${requestId}] Direct signup endpoint called`);
  console.log(`[${requestId}] Normalized API_URL: ${API_URL}`);
  
  try {
    // Log important pieces of the request (excluding sensitive data)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...loggableData } = req.body;
    console.log(`[${requestId}] Request body (excluding password):`, loggableData);
    
    // Extract the base URL for health checks (without /api)
    // This is used in the catch block for health checks
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const baseUrl = API_URL.replace(/\/api$/, '');
    
    // Forward the request directly to the backend with extended timeout
    console.log(`[${requestId}] Sending to: ${API_URL}/auth/signup`);
    
    const response = await axios({
      method: 'POST',
      url: `${API_URL}/auth/signup`,
      headers: {
        'Content-Type': 'application/json',
        'Origin': req.headers.origin || process.env.NEXT_PUBLIC_FRONTEND_URL || ''
      },
      data: req.body,
      timeout: API_TIMEOUT // Set a longer timeout
    });
    
    console.log(`[${requestId}] Signup successful through direct endpoint, status: ${response.status}`);
    
    // Return the response from the backend
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[${requestId}] Signup error in direct endpoint:`, error);
    
    // Detailed error logging
    if (error.response) {
      console.error(`[${requestId}] Error response status:`, error.response.status);
      console.error(`[${requestId}] Error response data:`, error.response.data);
      
      // Forward the backend response
      return res.status(error.response.status).json({
        ...error.response.data,
        requestId
      });
    } 
    
    if (error.code === 'ECONNABORTED') {
      console.error(`[${requestId}] Request timed out after ${API_TIMEOUT}ms`);
      return res.status(504).json({ 
        message: 'Request timed out. The server is taking too long to respond.', 
        error: 'timeout',
        timeout: API_TIMEOUT,
        requestId
      });
    }
    
    // Fallback error handling
    console.error(`[${requestId}] Network error details:`, {
      message: error.message,
      code: error.code,
      isAxiosError: error.isAxiosError, 
      stack: error.stack
    });
    
    // Try multiple health check endpoints using baseUrl declared in try block
    try {
      // Get the base URL from API_URL again to avoid the linting error
      const baseUrl = API_URL.replace(/\/api$/, '');
      
      console.log(`[${requestId}] Testing backend health at ${baseUrl}/api/health`);
      try {
        const healthCheck = await axios.get(`${baseUrl}/api/health`, { 
          timeout: 5000,
          headers: {
            'Origin': req.headers.origin || process.env.NEXT_PUBLIC_FRONTEND_URL || ''
          }
        });
        console.log(`[${requestId}] Health check 1 result:`, healthCheck.status, healthCheck.data);
      } catch (e) {
        console.error(`[${requestId}] Health check 1 failed:`, e.message);
        
        // Try alternative health endpoint
        console.log(`[${requestId}] Trying alternative health check at ${baseUrl}/health`);
        const healthCheck2 = await axios.get(`${baseUrl}/health`, { 
          timeout: 5000,
          headers: {
            'Origin': req.headers.origin || process.env.NEXT_PUBLIC_FRONTEND_URL || ''
          }
        });
        console.log(`[${requestId}] Health check 2 result:`, healthCheck2.status, healthCheck2.data);
      }
    } catch (healthError) {
      console.error(`[${requestId}] All health checks failed:`, healthError.message);
    }
    
    // Handle network errors
    return res.status(502).json({ 
      message: 'Unable to connect to the authentication server. Please try again later.', 
      error: error.message,
      requestId,
      backendUrl: API_URL,
      normalized: true
    });
  }
} 