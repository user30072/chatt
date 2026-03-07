'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  BrainCircuit,
  MoreVerticalIcon,
  EyeIcon,
  EditIcon,
  Trash,
  ExternalLinkIcon,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function ChatbotList() {
  const { user } = useAuth();
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadChatbots() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getChatbots();
        setChatbots(response.data.chatbots || []);
        console.log(`Loaded ${response.data.chatbots?.length || 0} chatbots for current user`);
        
        // Verify that chatbots array contains only the current user's chatbots
        if (response.data.chatbots?.length > 0 && user) {
          const nonUserChatbots = response.data.chatbots.filter(chatbot => 
            chatbot.user_id && chatbot.user_id !== user.userId
          );
          
          if (nonUserChatbots.length > 0) {
            console.error('Found chatbots belonging to other users', nonUserChatbots);
            // Filter out chatbots that don't belong to current user
            setChatbots(response.data.chatbots.filter(chatbot => 
              !chatbot.user_id || chatbot.user_id === user.userId
            ));
          }
        }
      } catch (err) {
        console.error('Failed to load chatbots:', err);
        if (err.permissionError) {
          setError('You do not have permission to view these chatbots.');
        } else {
          setError(err.response?.data?.message || 'Failed to load chatbots. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadChatbots();
    } else {
      setLoading(false);
      setError('Not logged in. Please log in again.');
    }
  }, [user, api]);

  const toggleMenu = (id) => {
    setMenuOpen(menuOpen === id ? null : id);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this chatbot? This action cannot be undone.')) {
      try {
        await api.deleteChatbot(id);
        setChatbots(chatbots.filter(chatbot => chatbot.id !== id));
      } catch (err) {
        console.error('Failed to delete chatbot:', err);
        alert(err.response?.data?.message || 'Failed to delete chatbot. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center text-red-500 mb-4">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Your Chatbots</h2>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Username: {user.username}
            </p>
          )}
        </div>
        <Link href="/dashboard/chatbots/new">
          <Button variant="black" className="font-medium">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chatbot
          </Button>
        </Link>
      </div>

      {chatbots.length === 0 ? (
        <div className="p-10 text-center">
          <BrainCircuit className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No chatbots yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first chatbot.</p>
          <div className="mt-6">
            <Link href="/dashboard/chatbots/new">
              <Button variant="black" className="font-medium">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Chatbot
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {chatbots.map((chatbot) => (
            <li key={chatbot.id} className="p-4 sm:p-6 hover:bg-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${chatbot.is_active ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <BrainCircuit className={`w-6 h-6 ${chatbot.is_active ? 'text-primary-600' : 'text-gray-400'}`} />
                    </div>
                  </div>
                  <div className="ml-4 min-w-0">
                    <div className="flex items-center">
                      <h2 className="text-lg font-medium text-gray-900 truncate">{chatbot.name}</h2>
                      <Badge 
                        variant={chatbot.is_active ? 'success' : 'default'} 
                        size="sm"
                        className="ml-2"
                      >
                        {chatbot.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {chatbot.description && (
                      <p className="mt-1 text-sm text-gray-500 truncate">{chatbot.description}</p>
                    )}
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <span>Created {new Date(chatbot.created_at).toLocaleDateString()}</span>
                      {chatbot._count?.conversations > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{chatbot._count.conversations} conversation{chatbot._count.conversations === 1 ? '' : 's'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="ml-4 flex-shrink-0 flex">
                  <Link href={`/dashboard/chatbots/${chatbot.id}`}>
                    <Button size="sm" variant="black" className="font-medium">
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </Link>
                  
                  <div className="relative ml-2">
                    <button
                      className="p-1 rounded-full text-gray-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      onClick={() => toggleMenu(chatbot.id)}
                    >
                      <MoreVerticalIcon className="h-5 w-5" />
                    </button>
                    
                    {menuOpen === chatbot.id && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1" role="menu">
                          <Link 
                            href={`/dashboard/chatbots/${chatbot.id}`}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setMenuOpen(null)}
                          >
                            <EditIcon className="h-4 w-4 mr-2 text-gray-400" />
                            Edit Settings
                          </Link>
                          
                          <Link 
                            href={`/dashboard/chatbots/${chatbot.id}/conversations`}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setMenuOpen(null)}
                          >
                            <ExternalLinkIcon className="h-4 w-4 mr-2 text-gray-400" />
                            View Conversations
                          </Link>
                          
                          <button
                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            onClick={() => {
                              setMenuOpen(null);
                              handleDelete(chatbot.id);
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2 text-red-400" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}