'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

/**
 * A wrapper component that provides Google OAuth context to its children
 * This component should be used to wrap components that need access to Google OAuth functionality
 */
export default function GoogleOAuthWrapper({ children }) {
  // Get client ID from environment variable
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // If no client ID, still render children but without Google OAuth context
  if (!clientId) {
    console.warn('Google OAuth client ID not found. Google Sign-in will not be available.');
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
} 