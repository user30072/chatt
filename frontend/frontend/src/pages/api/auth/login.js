// Direct API endpoint for login to avoid proxy timeout issues
import axios from 'axios';

// Get the API URL and timeout from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '60000', 10);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  console.log('Direct login endpoint called');
  
  try {
    // Forward the request directly to the backend with extended timeout
    const response = await axios({
      method: 'POST',
      url: `${API_URL}/auth/login`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: req.body,
      timeout: API_TIMEOUT // Set a longer timeout
    });
    
    console.log('Login successful through direct endpoint');
    
    // Return the response from the backend
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Login error in direct endpoint:', error);
    
    if (error.response) {
      // Forward the backend response
      return res.status(error.response.status).json(error.response.data);
    } 
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        message: 'Request timed out. The server is taking too long to respond.', 
        error: 'timeout',
        timeout: API_TIMEOUT
      });
    }
    
    // Handle network errors
    return res.status(502).json({ 
      message: 'Unable to connect to the authentication server', 
      error: error.message 
    });
  }
} 