'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import dynamic from 'next/dynamic';

// Dynamically import GoogleOAuthProvider to avoid SSR issues
const GoogleOAuthProvider = dynamic(
  () => import('@react-oauth/google').then((mod) => mod.GoogleOAuthProvider),
  { ssr: false }
);

// Only show Google OAuth warnings once
let hasShownGoogleWarning = false;

export function Providers({ children }) {
  const [mounted, setMounted] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);

  useEffect(() => {
    setMounted(true);
    
    // Get client ID from env variable
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      // Avoid logging sensitive environment variables
      const safeEnvKeys = Object.keys(process.env)
        .filter(key => key.startsWith('NEXT_PUBLIC_') && !key.includes('KEY') && !key.includes('SECRET'));
      
      console.log('Public environment variables available:', safeEnvKeys);
    }
    
    if (clientId) {
      setGoogleClientId(clientId);
      if (process.env.NODE_ENV === 'development') {
        console.log('Google Client ID is configured');
      }
    } else {
      // Only show the warning once to reduce console noise
      if (!hasShownGoogleWarning) {
        console.warn('Google OAuth is not configured. Sign-in with Google will not be available.');
        hasShownGoogleWarning = true;
      }
    }
  }, []);

  // During server-side rendering or when not mounted, just use AuthProvider
  if (!mounted) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  // If we have a Google client ID, wrap with GoogleOAuthProvider
  if (googleClientId) {
    // Only log in development and first render
    if (process.env.NODE_ENV === 'development' && !window._googleOAuthLogged) {
      console.log('Initialized Google OAuth provider');
      window._googleOAuthLogged = true;
    }
    
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </GoogleOAuthProvider>
    );
  }

  // Fallback to just AuthProvider if no Google client ID
  return <AuthProvider>{children}</AuthProvider>;
} 