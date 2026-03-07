'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Header from '@/components/landing/Header';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  
  // Chat animation states
  const [chatStep, setChatStep] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [typingSide, setTypingSide] = useState('ai');
  const [isMobile, setIsMobile] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Check if device is mobile on component mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll events to trigger animation on mobile
  useEffect(() => {
    if (!isMobile) return; // Only apply this effect on mobile
    
    const handleScroll = () => {
      if (hasScrolled) return; // Skip if already scrolled
      
      // Check if the chat component is visible in viewport
      if (chatRef.current) {
        const rect = chatRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setHasScrolled(true);
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, hasScrolled]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    // Only attempt redirect once per page load
    if (redirectAttempted) return;
    
    // Only redirect if we have a proper user object with an email
    if (!loading && user && user.email) {
      // Prevent immediate redirects for just-logged-in users
      console.log('User is authenticated on homepage with email:', user.email);
      setRedirectAttempted(true);
      
      const redirectTimer = setTimeout(() => {
        console.log('Redirecting authenticated user from homepage to dashboard');
        router.push('/dashboard');
      }, 2000); // Longer delay to ensure everything is loaded
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, loading, router, redirectAttempted]);

  // Animate the chat sequence - only on desktop or after scroll on mobile
  useEffect(() => {
    // Don't start animation on mobile until scrolled
    if (isMobile && !hasScrolled) return;
    
    if (chatStep === 1) {
      // Show user typing indicator before second message
      const typingTimer = setTimeout(() => {
        setTypingSide('user');
        setIsTyping(true);
      }, 800); // Appear sooner
      
      // Show second message (user)
      const messageTimer = setTimeout(() => {
        setIsTyping(false);
        setChatStep(2);
      }, 2000); // Faster appearance
      
      return () => {
        clearTimeout(typingTimer);
        clearTimeout(messageTimer);
      };
    }
    
    if (chatStep === 2) {
      // Show AI typing indicator before third message
      const typingTimer = setTimeout(() => {
        setTypingSide('ai');
        setIsTyping(true);
      }, 1000); // Appear sooner
      
      // Show third message (AI)
      const messageTimer = setTimeout(() => {
        setIsTyping(false);
        setChatStep(3);
      }, 3000); // Faster appearance
      
      return () => {
        clearTimeout(typingTimer);
        clearTimeout(messageTimer);
      };
    }
  }, [chatStep, isMobile, hasScrolled]);

  // Typing indicator component for AI - make smaller
  const AITypingIndicator = () => (
    <div className="flex items-center animate-fadeIn">
      <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
        AI
      </div>
      <div className="ml-3 bg-blue-500 p-2.5 rounded-lg max-w-[80%] shadow-sm">
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );

  // Typing indicator component for User - make smaller
  const UserTypingIndicator = () => (
    <div className="flex items-center justify-end animate-fadeIn">
      <div className="mr-3 bg-gray-300 p-2.5 rounded-lg max-w-[80%] shadow-sm">
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
      <div className="w-7 h-7 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
        U
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Hero Section - Add top padding to account for the fixed header */}
      <header className="bg-gradient-to-r from-gray-800 to-black text-white pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                AI-Powered Chatbots for Your Business
              </h1>
              <p className="text-xl mb-8">
                Create, customize, & deploy robust AI powered chatbots for your business. No coding required!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/signup" 
                  className="bg-white text-black hover:bg-gray-100 px-6 py-3 rounded-lg font-medium text-lg text-center"
                >
                  Get Started For Free!
                </Link>
                <Link 
                  href="/login" 
                  className="bg-transparent border border-white text-white hover:bg-white/10 px-6 py-3 rounded-lg font-medium text-lg text-center"
                >
                  Log In
                </Link>
              </div>
            </div>
            <div className="md:w-1/2">
              <div 
                ref={chatRef}
                className="bg-white p-6 rounded-lg shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-xs text-gray-500">AI Assistant</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mb-4 min-h-[200px]">
                  <div className="flex flex-col space-y-3">
                    {/* First message - AI greeting - No animation needed as it's already visible */}
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                        AI
                      </div>
                      <div className="ml-3 bg-blue-500 p-3 rounded-lg text-white max-w-[80%] shadow-sm">
                        How can I help you today?
                      </div>
                    </div>
                    
                    {/* User typing indicator and second message */}
                    {chatStep === 1 && isTyping && typingSide === 'user' && <UserTypingIndicator />}
                    
                    {chatStep >= 2 && (
                      <div className="flex items-center justify-end animate-fadeIn">
                        <div className="mr-3 bg-gray-300 p-3 rounded-lg text-gray-800 max-w-[80%] shadow-sm">
                          I need information about your product pricing.
                        </div>
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                          U
                        </div>
                      </div>
                    )}
                    
                    {/* AI typing indicator and third message */}
                    {chatStep === 2 && isTyping && typingSide === 'ai' && <AITypingIndicator />}
                    
                    {chatStep >= 3 && (
                      <div className="flex items-center animate-fadeIn">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                          AI
                        </div>
                        <div className="ml-3 bg-blue-500 p-3 rounded-lg text-white max-w-[80%] shadow-sm">
                          Our pricing starts at $29/month for the Basic plan. Would you like me to explain the features included?
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Chat input field */}
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Type your message..." 
                    disabled
                  />
                  <button 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white rounded-full p-1.5 hover:bg-blue-600 focus:outline-none"
                    disabled
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 text-center opacity-70 text-xs text-gray-600">
                  See how our AI chatbot handles customer inquiries instantly
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <h2 className="text-3xl text-black font-bold mb-12">Why Choose Our Platform?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">🚀</div>
              <h3 className="text-xl text-black font-semibold mb-2">Easy Setup</h3>
              <p className="text-black">Deploy your custom chatbot in minutes with our intuitive interface.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">🧠</div>
              <h3 className="text-xl text-black font-semibold mb-2">AI-Powered</h3>
              <p className="text-black">Leverage the latest AI technology for natural conversations.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">📊</div>
              <h3 className="text-xl text-black font-semibold mb-2 font-roboto" style={{ fontFamily: 'Roboto !important' }}>Admin Dashboard</h3>
              <p className="text-black">Track performance and gain insights into customer interactions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold items-center">any bot&trade; by <Link href="https://tinqor.com" target="_blank" className="hover:text-blue-400">tinqor</Link> </h3>
              <p className="text-gray-400">© 2025 All rights reserved</p>
            </div>
            <div className="flex gap-6">
              <Link href="/login" className="hover:text-blue-400">Login</Link>
              <Link href="/signup" className="hover:text-blue-400">Sign Up</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
