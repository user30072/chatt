'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import dynamic from 'next/dynamic';
import { getCookie, removeCookie } from '@/lib/cookies';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Dynamically import GoogleLogin to avoid SSR issues
const GoogleLogin = dynamic(
  () => import('@react-oauth/google').then((mod) => mod.GoogleLogin),
  { ssr: false }
);

export default function LoginPage() {
  const { login: loginUser, googleLogin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
  const [initializingGoogle, setInitializingGoogle] = useState(true);
  
  useEffect(() => {
    setMounted(true);
    
    // Check if Google Client ID is available
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    console.log('Google Client ID available:', !!clientId);
    if (clientId) {
      console.log('Client ID length:', clientId.length);
      console.log('Client ID starts with:', clientId.substring(0, 5) + '...');
    }
    setGoogleAvailable(!!clientId);
    setInitializingGoogle(false);
    
    // Check if we were redirected after a failed login attempt
    const errorMessage = new URLSearchParams(window.location.search).get('error');
    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
    }
  }, []);
  
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError('');
      
      // Clear any existing tokens
      removeCookie('token');
      
      console.log('Attempting to connect to backend for login...');
      
      const user = await loginUser({
        email: data.email,
        password: data.password,
      });
      
      console.log('Login successful, user:', user ? 'Yes' : 'No');
      
      // Add a small delay before redirecting
      setTimeout(() => {
        console.log('Redirecting to dashboard after successful login');
        router.push('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      setGoogleLoginLoading(true);
      setError('');
      
      // Clear any existing token
      removeCookie('token');
      
      // Only clear UI cache
      localStorage.removeItem('user_cache');
      
      console.log('Google authentication successful, processing...');
      
      // Login with Google
      const user = await googleLogin(response.credential);
      
      console.log('Google login successful, user created/logged in');
      
      // Add a small delay before redirecting
      setTimeout(() => {
        // Verify token was set correctly
        const token = getCookie('token');
        if (!token) {
          setError('Authentication error: Login was successful but session not saved. Please try again.');
          return;
        }
        
        // Redirect to dashboard
        router.push('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google authentication failed. Please try again or use email login.');
      
      // If specific error message is available, display it
      if (error.response?.data?.message) {
        setError(`Google login error: ${error.response.data.message}`);
      }
    } finally {
      setGoogleLoginLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google authentication error:', error);
    setError('Google authentication failed. Please try again or use email login.');
  };
  
  // Render Google login only when it's available
  const renderGoogleLogin = () => {
    if (!googleAvailable) {
      return null; // Don't render Google login if not available
    }
    
    return (
      <div className="mt-6">
        <div className={googleLoginLoading ? 'opacity-50 pointer-events-none' : ''}>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              text="signin_with"
              size="large"
              width="100%"
              locale="en"
              theme="filled_blue"
              logo_alignment="left"
              shape="rectangular"
            />
          </GoogleOAuthProvider>
          
          {googleLoginLoading && (
            <div className="flex justify-center mt-2">
              <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/">
            <h2 className="text-center text-3xl font-extrabold text-gray-900">any bot Sign In</h2>
          </Link>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-center text-sm text-gray-700">
            Or{' '}
            <Link href="/signup" className="font-medium text-primary-700 hover:text-primary-800 underline">
              create a new account
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-800 rounded-md p-4 text-sm font-medium">
            {error}
            {error.includes('database') && (
              <div className="mt-2 pt-2 border-t border-red-300">
                <p>It appears we're having trouble connecting to our database.</p>
                <p className="mt-1">You can:</p>
                <ul className="list-disc ml-5 mt-1">
                  <li>Try again in a few minutes</li>
                  <li>Check if your internet connection is stable</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            )}
          </div>
        )}
        
        {renderGoogleLogin()}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-700 font-medium">
                {googleAvailable ? 'Or sign in with email' : 'Sign in with email'}
              </span>
            </div>
          </div>
        </div>
        
        <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm space-y-4">
            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email address'
                }
              })}
              error={errors.email?.message}
            />
            
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              {...register('password', { required: 'Password is required' })}
              error={errors.password?.message}
            />
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-900 text-white"
              size="lg"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}