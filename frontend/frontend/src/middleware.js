import { NextResponse } from 'next/server';

// Define which paths require authentication - comprehensive list
const protectedPaths = [
  '/dashboard',
  '/dashboard/chatbots',
  '/dashboard/chatbots/new',
  '/dashboard/chatbots/edit',
  '/dashboard/documents',
  '/dashboard/conversations',
  '/dashboard/analytics',
  '/dashboard/settings',
  '/dashboard/test',
  '/dashboard/profile',
  // Add any other specific paths you want to protect
];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Create response
  const response = NextResponse.next();
  
  // Set COOP headers for Google OAuth postMessage communication
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Check if this is any dashboard path (protected route)
  // Using both startsWith check and explicit path check for redundancy
  if (pathname.startsWith('/dashboard') || protectedPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    // Get the authentication token from the cookies
    const token = request.cookies.get('token')?.value;
    
    // For debugging - log token presence
    if (process.env.NODE_ENV === 'development') {
      console.log(`Middleware: Protected path check - ${pathname}, Token exists: ${!!token}`);
    }
    
    // If there's no token, redirect to the homepage
    if (!token) {
      console.log(`Middleware: Redirecting unauthenticated user from ${pathname} to homepage`);
      const url = new URL('/', request.url);
      
      // Add a query parameter to track where they came from
      url.searchParams.set('redirect_from', pathname);
      url.searchParams.set('reason', 'session_expired');
      
      // Don't redirect if it's a backend API request (which might be fetching data during loading)
      const isApiRequest = pathname.includes('/api/') || request.headers.get('accept')?.includes('application/json');
      if (isApiRequest) {
        console.log('API request detected, allowing without redirection');
        return response;
      }
      
      return NextResponse.redirect(url);
    }
  }

  return response;
}

// Configure matcher for middleware to run on all pages (to set COOP headers)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
