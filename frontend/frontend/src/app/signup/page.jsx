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

export default function SignupPage() {
  const { register: registerUser, googleLogin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [signupAttempts, setSignupAttempts] = useState(0);
  const [googleSignupLoading, setGoogleSignupLoading] = useState(false);
  const [initializingGoogle, setInitializingGoogle] = useState(true);
  
  useEffect(() => {
    setMounted(true);
    // Check if Google Client ID is available
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    setGoogleAvailable(!!clientId);
    setInitializingGoogle(false);
    
    // Check if we were redirected after a failed signup attempt
    const errorParam = new URLSearchParams(window.location.search).get('error');
    if (errorParam) {
      setErrorType('redirect');
      setErrorMessage(decodeURIComponent(errorParam));
    }
  }, []);
  
  const methods = useForm({
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      username: ''
    }
  });
  const { register, handleSubmit, formState: { errors }, watch, reset } = methods;
  const password = watch('password', '');
  
  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setErrorType('');
      setErrorMessage('');
      
      // Clear any existing tokens
      removeCookie('token');
      
      console.log('Attempting to connect to backend for registration...');
      
      // Add a small artificial delay for better UX when server responds too quickly
      const startTime = Date.now();
      
      try {
        const user = await registerUser({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username
        });
        
        console.log('Registration successful, user created:', user ? 'Yes' : 'No');
        
        // Verify token was set correctly
        const token = getCookie('token');
        if (!token) {
          setErrorType('token');
          setErrorMessage('Registration was successful but session not saved. Please try again or try logging in.');
          setIsLoading(false);
          return;
        }
        
        // Ensure we show loading state for at least 800ms for better UX
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 800 - elapsed);
        
        setTimeout(() => {
          console.log('Redirecting to dashboard after successful registration');
          router.push('/dashboard');
        }, delay);
      } catch (error) {
        console.error('Registration error:', error);
        setSignupAttempts(prev => prev + 1);
        
        // Handle specific error cases
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          setErrorType('timeout');
          setErrorMessage('Registration timed out. The server is taking too long to respond. Please try again later.');
        } else if (error.message?.includes('Network Error')) {
          setErrorType('network');
          setErrorMessage('Network error. Please check your internet connection and try again.');
        } else if (error.response?.status === 409) {
          setErrorType('duplicate');
          setErrorMessage('This email is already registered. Please try logging in instead.');
        } else if (error.response?.status === 500) {
          setErrorType('server');
          setErrorMessage('Server error. Our team has been notified and is working on it. Please try again later.');
        } else if (error.response?.data?.message?.includes('database')) {
          setErrorType('database');
          setErrorMessage('Database connection error. Please try again later.');
        } else {
          setErrorType('unknown');
          setErrorMessage(error.response?.data?.message || 'Registration failed. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      setGoogleSignupLoading(true);
      setErrorType('');
      setErrorMessage('');
      
      // Clear any existing token
      removeCookie('token');
      
      // Only clear UI cache
      localStorage.removeItem('user_cache');
      
      console.log('Google authentication successful, processing...');
      
      const startTime = Date.now();
      
      // Register/login with Google
      const user = await googleLogin(response.credential);
      
      console.log('Google sign-up successful, user created/logged in');
      
      // Ensure we show loading state for at least 800ms for better UX
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 800 - elapsed);
      
      setTimeout(() => {
        // Verify token was set correctly
        const token = getCookie('token');
        if (!token) {
          setErrorType('token');
          setErrorMessage('Authentication error: Registration was successful but session not saved. Please try again.');
          return;
        }
        
        // Redirect to dashboard
        router.push('/dashboard');
      }, delay);
    } catch (error) {
      console.error('Google registration error:', error);
      setSignupAttempts(prev => prev + 1);
      
      // Handle specific error cases
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setErrorType('timeout');
        setErrorMessage('Google authentication timed out. Please try again later.');
      } else if (error.message?.includes('Network Error')) {
        setErrorType('network');
        setErrorMessage('Network error. Please check your internet connection and try again.');
      } else if (error.response?.status === 409) {
        setErrorType('duplicate');
        setErrorMessage('This Google account is already registered. Please try logging in instead.');
      } else {
        setErrorType('google');
        setErrorMessage(error.response?.data?.message || 'Google authentication failed. Please try again or use email signup.');
      }
    } finally {
      setGoogleSignupLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google authentication error:', error);
    setErrorType('google');
    setErrorMessage('Google authentication failed. Please try again or use email signup.');
  };
  
  const retrySignup = () => {
    setErrorType('');
    setErrorMessage('');
  };
  
  const renderGoogleLogin = () => {
    if (!googleAvailable) {
      return null; // Don't render Google login if not available
    }
    
    return (
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-700 font-medium">Sign up with</span>
          </div>
        </div>

        <div className="mt-6">
          <div className={googleSignupLoading ? 'opacity-50 pointer-events-none' : ''}>
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                text="signup_with"
                size="large"
                width="100%"
                locale="en"
                theme="filled_blue"
                logo_alignment="left"
                shape="rectangular"
                disabled={isLoading}
              />
            </GoogleOAuthProvider>
            
            {googleSignupLoading && (
              <div className="flex justify-center mt-2">
                <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderErrorMessage = () => {
    if (!errorMessage) return null;
    
    const getErrorColor = () => {
      switch (errorType) {
        case 'timeout':
        case 'network':
        case 'database':
          return 'bg-amber-50 border-amber-400 text-amber-800';
        case 'duplicate':
          return 'bg-blue-50 border-blue-400 text-blue-800';
        default:
          return 'bg-red-50 border-red-400 text-red-800';
      }
    };
    
    return (
      <div className={`border rounded-md p-4 text-sm font-medium ${getErrorColor()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {errorType === 'duplicate' ? (
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">
              {errorMessage}
            </h3>
            
            {errorType === 'timeout' && (
              <div className="mt-2 pt-2 border-t border-amber-300">
                <p>The server is taking longer than expected to respond.</p>
                <p className="mt-1">This could be due to:</p>
                <ul className="list-disc ml-5 mt-1">
                  <li>High server load</li>
                  <li>Slow internet connection</li>
                  <li>Temporary service disruption</li>
                </ul>
                <button 
                  onClick={retrySignup}
                  className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
                >
                  Try again
                </button>
              </div>
            )}
            
            {errorType === 'network' && (
              <div className="mt-2 pt-2 border-t border-amber-300">
                <p>We couldn't connect to our servers.</p>
                <p className="mt-1">Please check:</p>
                <ul className="list-disc ml-5 mt-1">
                  <li>Your internet connection</li>
                  <li>Any network restrictions (firewalls, etc.)</li>
                </ul>
                <button 
                  onClick={retrySignup}
                  className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
                >
                  Try again
                </button>
              </div>
            )}
            
            {errorType === 'database' && (
              <div className="mt-2 pt-2 border-t border-amber-300">
                <p>We're having trouble connecting to our database.</p>
                <p className="mt-1">You can:</p>
                <ul className="list-disc ml-5 mt-1">
                  <li>Try again in a few minutes</li>
                  <li>Contact support if the issue persists</li>
                </ul>
                <button 
                  onClick={retrySignup}
                  className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
                >
                  Try again
                </button>
              </div>
            )}
            
            {errorType === 'duplicate' && (
              <div className="mt-2">
                <p>Please use the login page instead.</p>
                <Link 
                  href="/login"
                  className="mt-2 inline-block text-sm font-medium text-blue-700 hover:text-blue-800 underline"
                >
                  Go to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute w-full h-full">
        <div className="absolute top-1/4 -left-4 w-24 h-24 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 -right-4 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-36 h-36 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-sm relative z-10">
        <div>
          <Link href="/">
            <h2 className="text-center text-3xl font-extrabold text-gray-900">any bot Sign Up</h2>
          </Link>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">Create your account!</h2>
          <p className="mt-2 text-center text-sm text-gray-700">
            Or{' '}
            <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800 underline">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        {renderErrorMessage()}
        
        {renderGoogleLogin()}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-700 font-medium">
                {googleAvailable ? 'Or create an account with email' : 'Create an account with email'}
              </span>
            </div>
          </div>
        </div>
        
        <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="firstName"
                label="First name"
                type="text"
                autoComplete="given-name"
                required
                disabled={isLoading}
                {...register('firstName', { required: 'First name is required' })}
                error={errors.firstName?.message}
              />
              
              <Input
                id="lastName"
                label="Last name"
                type="text"
                autoComplete="family-name"
                required
                disabled={isLoading}
                {...register('lastName', { required: 'Last name is required' })}
                error={errors.lastName?.message}
              />
            </div>
            
            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              disabled={isLoading}
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
              id="username"
              label="Username"
              type="text"
              required
              disabled={isLoading}
              {...register('username', { 
                required: 'Username is required',
                pattern: {
                  value: /^[a-zA-Z0-9_-]{3,20}$/,
                  message: 'Username can only contain letters, numbers, underscores and hyphens (3-20 characters)'
                },
                validate: {
                  checkAvailability: async (value) => {
                    // Only check if the value is valid format
                    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(value)) return true;
                    
                    try {
                      // Check if username is available
                      const response = await fetch('/api/auth/check-username?username=' + encodeURIComponent(value));
                      const data = await response.json();
                      return data.available || 'This username is already taken';
                    } catch (error) {
                      console.error('Error checking username availability:', error);
                      return true; // Allow submission, will be caught server-side
                    }
                  }
                }
              })}
              error={errors.username?.message}
              helperText="This will be your unique identifier. Choose wisely!"
            />
            
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              disabled={isLoading}
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                }
              })}
              error={errors.password?.message}
            />
            
            <Input
              id="confirmPassword"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              disabled={isLoading}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
              error={errors.confirmPassword?.message}
            />
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-900 text-white"
              size="lg"
              isLoading={isLoading}
              loadingText="Creating your account..."
            >
              Create account
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center text-xs text-gray-700 font-medium">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-primary-700 hover:text-primary-800 underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary-700 hover:text-primary-800 underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}