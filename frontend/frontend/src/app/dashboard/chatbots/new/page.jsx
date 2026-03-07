'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { apiCreateChatbot } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewChatbotPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_message: 'You are a helpful assistant. Answer questions clearly and concisely.',
    model: 'gpt-4o',
    temperature: 0.7,
    max_context_length: 10,
    is_active: true
  });

  const models = [
    { id: 'gpt-4o', name: 'GPT-4o (Recommended)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiCreateChatbot(formData);
      const chatbotId = response.data.chatbot?.id || response.data.id;
      
      if (chatbotId) {
        // Redirect to chatbots list page to see the newly created chatbot
        router.push('/dashboard/chatbots');
      } else {
        // Fallback: redirect to chatbots list
        router.push('/dashboard/chatbots');
      }
    } catch (err) {
      console.error('Failed to create chatbot:', err);
      setError(err.response?.data?.message || 'Failed to create chatbot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="mb-6">
        <Link 
          href="/dashboard/chatbots" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chatbots
        </Link>
        <h1 className="text-3xl font-bold">Create New Chatbot</h1>
        <p className="text-gray-600 mt-2">Configure your chatbot's settings and behavior</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Chatbot Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Customer Support Bot"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Brief description of what this chatbot does..."
            />
          </div>

          <div>
            <label htmlFor="system_message" className="block text-sm font-medium text-gray-700 mb-2">
              System Message
            </label>
            <textarea
              id="system_message"
              name="system_message"
              value={formData.system_message}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Instructions for how the chatbot should behave..."
            />
            <p className="mt-1 text-sm text-gray-500">
              This message defines the chatbot's personality and behavior
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {formData.temperature}
              </label>
              <input
                type="range"
                id="temperature"
                name="temperature"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={handleInputChange}
                className="w-full"
              />
              <p className="mt-1 text-sm text-gray-500">
                Lower = more focused, Higher = more creative
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="max_context_length" className="block text-sm font-medium text-gray-700 mb-2">
              Max Context Length (messages)
            </label>
            <input
              type="number"
              id="max_context_length"
              name="max_context_length"
              min="1"
              max="50"
              value={formData.max_context_length}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Number of previous messages to include in context
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Active (bot will be available for use)
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <Link href="/dashboard/chatbots">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-black text-white">
            {loading ? 'Creating...' : 'Create Chatbot'}
          </Button>
        </div>
      </form>
    </div>
  );
}

