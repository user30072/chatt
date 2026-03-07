'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import Link from 'next/link';

export default function ChatbotsPage() {
  const { user } = useAuth();
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [debug, setDebug] = useState({
    userInfo: null,
    responseData: null,
    showDebug: false
  });

  // Fetch chatbots from API
  const fetchChatbots = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Store user info for debugging
      setDebug(prev => ({ ...prev, userInfo: user }));
      
      // Fetch real data from API
      console.log('Fetching chatbots...');
      const response = await api.getChatbots();
      console.log('Fetched chatbots from API:', response.data);
      
      // Store response data for debugging
      setDebug(prev => ({ ...prev, responseData: response.data }));
      
      setChatbots(response.data.chatbots || []);
    } catch (err) {
      console.error('Error fetching chatbots:', err);
      
      // Set appropriate error message based on error type
      if (err.serviceUnavailable) {
        setError('Service temporarily unavailable. Please try again later.');
      } else if (err.connectionError) {
        setError('Connection to server failed. Please try again.');
      } else if (err.permissionError) {
        setError('You do not have permission to access these chatbots.');
      } else {
        setError('Failed to load chatbots. Please try again.');
      }
      
      // Fall back to empty array
      setChatbots([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  // Retry mechanism
  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await fetchChatbots();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Chatbots</h1>
        <Link href="/dashboard/chatbots/new">
          <Button>Create New Chatbot</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center p-8">
          <p className="text-gray-600">Loading your chatbots...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 mb-2">{error}</p>
          <Button onClick={handleRetry} variant="outline">
            Retry {retryCount > 0 ? `(${retryCount})` : ''}
          </Button>
        </div>
      ) : chatbots.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium text-gray-800 mb-2">No chatbots yet</h3>
          <p className="text-gray-600 mb-6">Create your first chatbot to get started</p>
          <Link href="/dashboard/chatbots/new">
            <Button className="bg-black" size="lg">Create Your First Chatbot</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.map((chatbot) => (
            <div key={chatbot.id} className="border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{chatbot.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {chatbot.description || 'No description provided'}
                </p>
                <div className="flex mt-4 space-x-2">
                  <Link 
                    href={`/dashboard/chatbots/${chatbot.id}`} 
                    className="flex-1"
                    prefetch={false}
                  >
                    <Button variant="outline" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Link 
                    href={`/dashboard/chatbots/${chatbot.id}/chat`} 
                    className="flex-1"
                    prefetch={false}
                  >
                    <Button className="w-full">
                      Chat
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Debug information - only shown when ?debug=true is in URL */}
      {debug.showDebug && (
        <div className="mt-8 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <h3 className="font-bold mb-2">Debug Information</h3>
          <pre className="text-xs overflow-auto max-h-80 bg-gray-100 p-2 rounded">
            {JSON.stringify({ user: debug.userInfo, response: debug.responseData }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 