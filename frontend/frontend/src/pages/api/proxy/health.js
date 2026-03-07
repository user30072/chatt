// Health check endpoint for the application
// This serves as both a frontend check and a proxy for the backend health

export default async function handler(req, res) {
  // Generate a unique identifier for this health check
  const checkId = Math.random().toString(36).substring(2, 10);
  console.log(`[${checkId}] Health check requested`);
  
  try {
    // Try to connect to the backend
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
    
    try {
      // Try the real backend first with a short timeout
      const backendResponse = await fetch(`${BACKEND_URL}/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 2000 // Short timeout to prevent hanging
      });
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        console.log(`[${checkId}] Backend health check success:`, backendData);
        
        // Return the backend health data with our additions
        return res.status(200).json({
          status: 'ok',
          source: 'backend',
          frontend: {
            status: 'ok',
            timestamp: new Date().toISOString()
          },
          backend: backendData
        });
      } else {
        throw new Error(`Backend responded with status: ${backendResponse.status}`);
      }
    } catch (backendError) {
      console.error(`[${checkId}] Backend health check failed:`, backendError.message);
      
      // Return error status since backend is required
      return res.status(503).json({
        status: 'error',
        source: 'frontend',
        timestamp: new Date().toISOString(),
        message: 'Backend service unavailable',
        error: backendError.message
      });
    }
  } catch (error) {
    console.error(`[${checkId}] Health check error:`, error);
    
    return res.status(500).json({
      status: 'error',
      source: 'frontend',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error during health check'
    });
  }
} 