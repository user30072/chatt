// Direct API handler for the chatbots endpoint
// This forwards all requests to the real backend API to ensure persistence

export const config = {
  api: {
    bodyParser: true,
  },
};

// Helper function to forward requests to the backend
async function forwardToBackend(req, endpoint, options = {}) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${requestId}] Forwarding ${req.method} request to backend: ${endpoint}`);
  
  try {
    // Get backend URL from environment or use a fallback
    const backendUrl = process.env.PRIMARY_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '') : '');
    
    // Determine the full URL
    let url;
    if (backendUrl && backendUrl !== '') {
      url = `${backendUrl}/api${endpoint}`;
    } else {
      // Fallback for local development
      url = `http://localhost:5000/api${endpoint}`;
      console.log(`[${requestId}] WARNING: Using localhost fallback (PRIMARY_BACKEND_URL not set)`);
    }
    
    console.log(`[${requestId}] Backend URL: ${url}`);
    
    // Forward the original headers, especially authorization
    const headers = { 
      ...req.headers,
    };
    
    // Remove host header as it would be invalid for the backend
    delete headers.host;
    delete headers['content-length'];
    
    // Ensure Authorization header is present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    } else if (req.headers.Authorization) {
      headers['Authorization'] = req.headers.Authorization;
    }
    
    // Set content type for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }
    
    console.log(`[${requestId}] Headers being sent:`, {
      authorization: headers['Authorization'] ? 'Present' : 'Missing',
      contentType: headers['Content-Type']
    });
    
    // Prepare the request options
    const fetchOptions = {
      method: req.method,
      headers,
      ...options,
    };
    
    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    console.log(`[${requestId}] Making request to ${url}`);
    
    // Make the request to the backend
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, fetchOptions);
    
    console.log(`[${requestId}] Backend response status: ${response.status}`);
    
    // Get the response data
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error(`[${requestId}] Error parsing backend response:`, e);
      data = { error: 'Invalid response from backend', message: e.message };
    }
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`[${requestId}] Error forwarding request:`, error);
    return { 
      status: 500, 
      data: { 
        error: 'Failed to communicate with backend',
        message: error.message 
      }
    };
  }
}

export default async function handler(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  console.log(`[${requestId}] ${req.method} /api/proxy/chatbots`);
  console.log(`[${requestId}] Query params:`, req.query);
  console.log(`[${requestId}] Request URL:`, req.url);
  
  try {
    // Get the chatbot ID from query parameters or URL path
    // The URL might be /api/proxy/chatbots or /api/proxy/chatbots/:id
    const chatbotId = req.query.id || req.query.chatbotId;
    
    // Also check if there's an ID in the URL path
    // If req.url is /api/proxy/chatbots/123, extract 123
    let pathId = null;
    if (req.url && req.url.includes('/chatbots/')) {
      const match = req.url.match(/\/chatbots\/([^/?]+)/);
      if (match) {
        pathId = match[1];
      }
    }
    
    const id = chatbotId || pathId;
    
    // Construct the endpoint
    let endpoint = '/chatbots';
    if (id) {
      endpoint = `/chatbots/${id}`;
    }
    
    console.log(`[${requestId}] Using endpoint: ${endpoint}`);
    
    // Check authentication - log header for debugging
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log(`[${requestId}] Auth header present:`, !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`[${requestId}] Missing or invalid auth header`);
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Forward the request to the backend
    const { status, data } = await forwardToBackend(req, endpoint);
    
    console.log(`[${requestId}] Backend returned status ${status}`, data);
    
    // Normalize response format for the frontend
    // If it's a POST request (chatbot creation)
    if (req.method === 'POST') {
      console.log(`[${requestId}] Normalizing POST response:`, data);
      
      // Check if data has direct id (backend format)
      if (data && data.id && !data.chatbot) {
        console.log(`[${requestId}] Found direct id in response data, wrapping in chatbot object`);
        return res.status(status).json({
          chatbot: data
        });
      }
      
      // If data already has a chatbot property with id, it's already in the expected format
      if (data && data.chatbot && data.chatbot.id) {
        console.log(`[${requestId}] Response already has chatbot.id structure`);
        return res.status(status).json(data);
      }
    }
    
    // If it's a GET request to list chatbots
    if (req.method === 'GET' && !id) {
      // Normalize the response format if needed
      if (Array.isArray(data)) {
        return res.status(status).json({ chatbots: data });
      }
      
      // If data already has a chatbots property, use it
      if (data && data.chatbots) {
        return res.status(status).json(data);
      }
    }
    
    // Return the response from the backend
    return res.status(status).json(data);
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
} 