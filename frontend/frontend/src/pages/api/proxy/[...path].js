// Next.js API route to proxy requests to the backend
// This bypasses CORS by using your own domain

import { parse } from 'url';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import path from 'path';

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

// Production backend URL - try both possible URLs
const PRIMARY_URL = process.env.PRIMARY_BACKEND_URL || 
                   process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 
                   (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/api$/, '');
const BACKUP_URL = process.env.BACKUP_BACKEND_URL || '';

// Admin security settings from environment variables
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'eb89b59bf83ba63bc6c6c347728dbd21f927246d3230b7826574ca243cf4cb2e';

// Function to verify admin authentication
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const verifyAdminAuth = (authHeader) => {
  // For debugging
  console.log('Auth header:', authHeader);
  console.log('Expected token:', ADMIN_TOKEN);
  console.log('Match test:', authHeader === `Bearer ${ADMIN_TOKEN}`);
  
  // Accept both the exact token and mock-token for testing
  return authHeader && (
    authHeader === `Bearer ${ADMIN_TOKEN}` || 
    authHeader.includes('mock-token') ||
    authHeader === ADMIN_TOKEN
  );
};

// Helper function to fetch from backend
async function fetchFromBackend(url, req, requestId) {
  const fetch = (await import('node-fetch')).default;
  
  try {
    // Forward headers from the client request, except host
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length']; // Let fetch set this automatically
    
    // Ensure Authorization header is forwarded (case-insensitive)
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    } else if (req.headers.Authorization) {
      headers['Authorization'] = req.headers.Authorization;
    }
    
    // Make sure we have the right content-type
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }
    
    console.log(`[${requestId}] Headers being sent:`, {
      authorization: headers['Authorization'] ? 'Present' : 'Missing',
      authorizationValue: headers['Authorization'] ? (headers['Authorization'].substring(0, 20) + '...') : 'None',
      contentType: headers['Content-Type'],
      method: req.method
    });
    
    // Forward the original request method and body
    const options = {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    };
    
    console.log(`[${requestId}] Sending ${req.method} request to ${url}`);
    
    const response = await fetch(url, options);
    let data;
    
    try {
      data = await response.json();
    } catch (e) {
      console.error(`[${requestId}] Error parsing JSON response:`, e);
      data = { error: 'Invalid JSON response from backend' };
    }
    
    return {
      status: response.status,
      data
    };
  } catch (error) {
    console.error(`[${requestId}] Fetch error:`, error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Generate a unique ID for request tracking
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[${requestId}] Received ${req.method} request to proxy catch-all endpoint`);
  console.log(`[${requestId}] Request URL:`, req.url);
  console.log(`[${requestId}] PRIMARY_BACKEND_URL:`, process.env.PRIMARY_BACKEND_URL || 'NOT SET');
  
  // Get the path parts from the URL
  const { pathname } = parse(req.url, true);
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Remove 'api' and 'proxy' from the path
  if (pathParts[0] === 'api' && pathParts[1] === 'proxy') {
    pathParts.splice(0, 2);
  }
  
  // Join the remaining parts to form the endpoint
  const endpoint = pathParts.join('/');
  console.log(`[${requestId}] Endpoint: ${endpoint}`);
  
  try {
    // Determine backend URL
    let backendUrl;
    
    if (PRIMARY_URL && PRIMARY_URL !== '') {
      // Remove trailing slash and /api if present to avoid double /api
      let baseUrl = PRIMARY_URL.replace(/\/$/, '').replace(/\/api$/, '');
      backendUrl = `${baseUrl}/api/${endpoint}`;
      console.log(`[${requestId}] Using absolute backend URL: ${backendUrl}`);
    } else {
      // In production, we need PRIMARY_BACKEND_URL set
      // For now, try to use the Railway backend URL if we can infer it
      const railwayBackendUrl = process.env.RAILWAY_PUBLIC_DOMAIN || 
                                process.env.RAILWAY_STATIC_URL?.replace(/^https?:\/\//, 'https://') ||
                                'https://backy-production-92f1.up.railway.app';
      
      backendUrl = `${railwayBackendUrl}/api/${endpoint}`;
      console.log(`[${requestId}] WARNING: PRIMARY_BACKEND_URL not set, using inferred Railway URL: ${backendUrl}`);
      console.log(`[${requestId}] Please set PRIMARY_BACKEND_URL environment variable in your frontend deployment.`);
    }
    
    try {
      // Try the primary backend first
      const { status, data } = await fetchFromBackend(backendUrl, req, requestId);
      console.log(`[${requestId}] Primary backend response: ${status}`);
      console.log(`[${requestId}] Response data:`, JSON.stringify(data).substring(0, 200));
      
      // If we got "API endpoint not implemented", log more details
      if (data && data.message && data.message.includes('API endpoint not implemented')) {
        console.error(`[${requestId}] ERROR: Request hit catch-all route instead of specific route`);
        console.error(`[${requestId}] Backend URL was: ${backendUrl}`);
        console.error(`[${requestId}] Endpoint extracted: ${endpoint}`);
        console.error(`[${requestId}] Auth header present: ${!!req.headers.authorization || !!req.headers.Authorization}`);
      }
      
      res.status(status).json(data);
    } catch (primaryError) {
      console.error(`[${requestId}] Primary backend error:`, primaryError);
      
      // Try the backup URL as fallback
      if (BACKUP_URL && BACKUP_URL !== '') {
        try {
          console.log(`[${requestId}] Trying backup URL...`);
          const backupUrl = `${BACKUP_URL}/api/${endpoint}`;
          const { status, data } = await fetchFromBackend(backupUrl, req, requestId);
          console.log(`[${requestId}] Backup response: ${status}`);
          res.status(status).json(data);
        } catch (backupError) {
          console.error(`[${requestId}] Backup backend error:`, backupError);
          res.status(503).json({
            error: 'Service unavailable',
            message: 'Backend service is currently unavailable'
          });
        }
      } else {
        // No backup URL, return error
        res.status(503).json({
          error: 'Service unavailable',
          message: 'Backend service is currently unavailable. Please set PRIMARY_BACKEND_URL environment variable.'
        });
      }
    }
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
} 