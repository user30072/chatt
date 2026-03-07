'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { MessagesSquare, User, Users, Calendar, Loader2, Filter, Download } from 'lucide-react';
import apiService from '@/lib/api';
import { useToast } from '@/lib/toast';
import Link from 'next/link';

export default function ConversationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [chatbots, setChatbots] = useState([]);

  // Fetch user's chatbots and their conversations
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // First fetch the user's chatbots
        const chatbotsResponse = await apiService.getChatbots();
        const userChatbots = chatbotsResponse.data.chatbots || [];
        setChatbots(userChatbots);
        
        // If there are chatbots, fetch conversations for the first one
        if (userChatbots.length > 0) {
          await fetchConversations(userChatbots[0].id);
          setSelectedChatbot(userChatbots[0].id);
        } else {
          setConversations([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversations. Please try again.',
          type: 'error'
        });
        setConversations([]);
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [user]);

  // Function to fetch conversations for a specific chatbot
  const fetchConversations = async (chatbotId) => {
    setIsLoading(true);
    try {
      const response = await apiService.getConversations({ chatbotId });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations. Please try again.',
        type: 'error'
      });
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle changing the selected chatbot
  const handleChatbotChange = (e) => {
    const chatbotId = e.target.value;
    setSelectedChatbot(chatbotId);
    fetchConversations(chatbotId);
  };

  // Format date to show relative time (e.g., "2 hours ago", "yesterday")
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  };

  // Function to get the user identifier from the conversation
  const getUserIdentifier = (conversation) => {
    // Try to find user email or ID in the conversation data
    if (conversation.user_email) return conversation.user_email;
    if (conversation.user_id) return `User ${conversation.user_id}`;
    if (conversation.metadata?.email) return conversation.metadata.email;
    if (conversation.metadata?.userId) return conversation.metadata.userId;
    return 'Anonymous user';
  };

  // Function to get the message count
  const getMessageCount = (conversation) => {
    if (conversation.messages && Array.isArray(conversation.messages)) {
      return conversation.messages.length;
    }
    if (conversation._count?.messages) {
      return conversation._count.messages;
    }
    return 0;
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <div className="flex space-x-2">
          {chatbots.length > 0 && (
            <select
              value={selectedChatbot || ''}
              onChange={handleChatbotChange}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {chatbots.map(chatbot => (
                <option key={chatbot.id} value={chatbot.id}>{chatbot.name}</option>
              ))}
            </select>
          )}
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-black hover:bg-gray-900 text-white">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Show user context information */}
      {user && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Current User:</strong> {user.username || user.email} 
            <span className="ml-2 text-xs text-blue-600">({user.id})</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Showing conversations for your chatbots only.
          </p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {selectedChatbot 
                ? `Conversations for ${chatbots.find(c => c.id === selectedChatbot)?.name || 'Selected Chatbot'}`
                : 'Recent Conversations'
              }
            </h3>
            <span className="text-sm text-gray-500">{conversations.length} conversations</span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading conversations...</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {conversations.length > 0 ? (
              conversations.map(convo => (
                <li key={convo.id}>
                  <Link href={`/dashboard/conversations/${convo.id}`}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <MessagesSquare className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-primary">
                              {chatbots.find(c => c.id === convo.chatbot_id)?.name || 'Chatbot'}
                            </p>
                            <div className="flex items-center mt-1">
                              <User className="h-3 w-3 text-gray-400 mr-1" />
                              <p className="text-xs text-gray-500">{getUserIdentifier(convo)}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${convo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {convo.status === 'active' ? 'Active' : 'Ended'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-xs text-gray-500">
                            <Users className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                            {getMessageCount(convo)} messages
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-xs text-gray-500 sm:mt-0">
                          <Calendar className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                          <p>
                            Last message {formatRelativeTime(convo.updated_at || convo.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-4 py-5 sm:px-6 text-center">
                <p className="text-gray-500">No conversations found for this chatbot.</p>
                {chatbots.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Create a chatbot first to start collecting conversations.
                  </p>
                )}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
} 