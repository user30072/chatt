/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Force cache bust - increment this to force rebuild
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Explicitly use environment variables from process.env in build time
  env: {
    // Make sure environment variables are available to the client with explicit default values
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://backy-production-a439.up.railway.app/api',
    NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT || '60000',
    PRIMARY_BACKEND_URL: process.env.PRIMARY_BACKEND_URL || '',
    BACKUP_BACKEND_URL: process.env.BACKUP_BACKEND_URL || '',
    // Add debug flag
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG || 'false',
    // Add explicit application URLs
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || '',
    // Fix NEXT_PUBLIC_BACKEND_URL to NOT include /api
    NEXT_PUBLIC_BACKEND_URL: (process.env.PRIMARY_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, ''),
  },
  // Enable standalone output mode for Docker deployment
  output: 'standalone',
  // Configure API routes - with improved logging
  // NOTE: We do NOT rewrite /api/proxy/* requests as these are handled by Next.js API routes
  async rewrites() {
    // Default API URL if not set
    const defaultApiUrl = '/api';
    // Use environment variable or default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl;
    // Normalize API URL to ensure it includes /api
    const normalizedApiUrl = apiUrl.endsWith('/api') 
      ? apiUrl 
      : apiUrl + (apiUrl.endsWith('/') ? 'api' : '/api');
    
    console.log('======== API CONFIGURATION ========');
    console.log('Original NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || '(not set)');
    console.log('Using API URL:', apiUrl);
    console.log('Normalized API URL:', normalizedApiUrl);
    console.log('NOTE: /api/proxy/* routes are NOT rewritten (handled by Next.js API routes)');
    console.log('==================================');
    
    // Return empty array - we don't want to rewrite API requests
    // The /api/proxy/* routes are handled by Next.js API route handlers
    // All other /api/* requests should go directly to backend (if needed)
    // But since we're using /api/proxy for everything, we don't need rewrites
    return [];
  },
  // Enable CORS for API routes
  async headers() {
    return [
      {
        // This applies to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // Apply COOP headers to all pages for Google OAuth
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ];
  },
};

// Log all environment variables for debugging
console.log('======== ENVIRONMENT VARIABLES ========');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || '(not set)');
console.log('PRIMARY_BACKEND_URL:', process.env.PRIMARY_BACKEND_URL || '(not set)');
console.log('BACKUP_BACKEND_URL:', process.env.BACKUP_BACKEND_URL || '(not set)');
console.log('NEXT_PUBLIC_FRONTEND_URL:', process.env.NEXT_PUBLIC_FRONTEND_URL || '(not set)');
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT || '(not set)');
console.log('=====================================');

// Log deployed URLs and settings
if (process.env.NODE_ENV === 'production') {
  console.log('======== PRODUCTION CONFIGURATION ========');
  
  // Get base backend URL (without /api)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.PRIMARY_BACKEND_URL || '/api';
  const backendBase = apiUrl.replace(/\/api$/, '');
  
  console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || '(using default)');
  console.log('Normalized API URL:', apiUrl.endsWith('/api') ? apiUrl : apiUrl + '/api');
  console.log('Backend Base URL:', backendBase);
  console.log('NEXT_PUBLIC_FRONTEND_URL:', process.env.NEXT_PUBLIC_FRONTEND_URL || '(using default)');
  console.log('PRIMARY_BACKEND_URL:', process.env.PRIMARY_BACKEND_URL || '(using default)');
  console.log('BACKUP_BACKEND_URL:', process.env.BACKUP_BACKEND_URL || '(using default)');
  console.log('=========================================');
}

module.exports = nextConfig; 