'use client';

import { useState } from 'react';
import PageTemplate from '@/components/landing/PageTemplate';
import Link from 'next/link';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('getting-started');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'getting-started':
        return <GettingStartedContent />;
      case 'customization':
        return <CustomizationContent />;
      case 'knowledge-base':
        return <KnowledgeBaseContent />;
      case 'api':
        return <ApiContent />;
      default:
        return <GettingStartedContent />;
    }
  };

  return (
    <PageTemplate title="Documentation">
      <div className="text-xl mb-8">
        Learn how to build, customize, and deploy your AI chatbot
      </div>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="md:w-1/4">
          <nav className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-4 sticky top-24">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveTab('getting-started')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'getting-started' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
                  }`}
                >
                  Getting Started
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('customization')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'customization' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
                  }`}
                >
                  Customization
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('knowledge-base')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'knowledge-base' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
                  }`}
                >
                  Knowledge Base
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('api')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'api' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
                  }`}
                >
                  API Reference
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="md:w-3/4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl min-h-[60vh]">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}

// Content components for each tab
function GettingStartedContent() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Getting Started with any bot™</h2>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">1. Creating Your First Chatbot</h3>
        <p className="text-gray-300">
          To create your first chatbot, sign in to your account and navigate to the Dashboard. Click on the "Create New Chatbot" button and follow the setup wizard.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <pre className="text-gray-300 overflow-x-auto">
            {`// Example configuration
{
  "name": "My First Chatbot",
  "description": "A helpful assistant for my website",
  "model": "gpt-4o"
}`}
          </pre>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">2. Basic Configuration</h3>
        <p className="text-gray-300">
          Configure your chatbot's basic settings including name, description, and behavior. Set up the greeting message that will be shown to users when they first interact with your chatbot.
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Set a clear name and description that reflects your chatbot's purpose</li>
          <li>Configure a friendly greeting message to welcome users</li>
          <li>Adjust the AI model and temperature settings according to your needs</li>
          <li>Define the context window to determine how much conversation history the bot remembers</li>
        </ul>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">3. Deploy to Your Website</h3>
        <p className="text-gray-300">
          Once your chatbot is configured, you can easily deploy it to your website by adding a simple code snippet to your HTML.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <pre className="text-gray-300 overflow-x-auto">
            {`<!-- Add this code to your website -->
<script 
  src="https://api.anybot.ai/widget.js" 
  data-chatbot-id="your-chatbot-id">
</script>`}
          </pre>
        </div>
      </div>
      
      <div className="mt-8">
        <Link href="/docs/video-tutorials" className="text-blue-400 hover:text-blue-300 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Watch Video Tutorial
        </Link>
      </div>
    </div>
  );
}

function CustomizationContent() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Customizing Your Chatbot</h2>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Appearance Settings</h3>
        <p className="text-gray-300">
          Customize the look and feel of your chatbot to match your brand identity. Adjust colors, fonts, and positioning to create a seamless experience.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Theme Colors</h4>
            <ul className="text-gray-300 space-y-1">
              <li>Primary color</li>
              <li>Background color</li>
              <li>Text color</li>
              <li>Button colors</li>
            </ul>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Positioning</h4>
            <ul className="text-gray-300 space-y-1">
              <li>Bottom-right (default)</li>
              <li>Bottom-left</li>
              <li>Top-right</li>
              <li>Top-left</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Personality Tuning</h3>
        <p className="text-gray-300">
          Define your chatbot's personality to align with your brand voice. Adjust tone, style, and behavior through the system message and temperature settings.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <pre className="text-gray-300 overflow-x-auto">
            {`// Example system message
"You are a friendly and helpful customer service representative for [Company Name]. 
Your tone is professional but approachable. 
You should always be courteous and patient, 
even when users ask repetitive questions."`}
          </pre>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Advanced Features</h3>
        <p className="text-gray-300">
          Leverage advanced features to enhance your chatbot's capabilities and provide better user experiences.
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Configure auto-responses for common queries</li>
          <li>Set up chat triggers based on user behavior</li>
          <li>Enable human handoff for complex issues</li>
          <li>Schedule availability hours for your chatbot</li>
        </ul>
      </div>
    </div>
  );
}

function KnowledgeBaseContent() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Knowledge Base Integration</h2>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Uploading Documents</h3>
        <p className="text-gray-300">
          Upload your company's documents, FAQs, and knowledge base articles to train your chatbot on your specific information.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Supported File Types</h4>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-gray-300">
            <li>PDF (.pdf)</li>
            <li>Word (.docx)</li>
            <li>Excel (.xlsx)</li>
            <li>Text (.txt)</li>
            <li>Markdown (.md)</li>
            <li>HTML (.html)</li>
          </ul>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Web Scraping</h3>
        <p className="text-gray-300">
          Connect your chatbot to your website to automatically extract information from specified URLs. This ensures your chatbot stays up-to-date with your latest content.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <pre className="text-gray-300 overflow-x-auto">
            {`// Example website configuration
{
  "urls": [
    "https://example.com/faq",
    "https://example.com/help",
    "https://example.com/support"
  ],
  "update_frequency": "weekly",
  "exclude_patterns": [
    "/blog/",
    "/news/"
  ]
}`}
          </pre>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Managing Knowledge</h3>
        <p className="text-gray-300">
          Keep your chatbot's knowledge up-to-date by managing your documents and training data.
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Monitor document status and processing</li>
          <li>Update documents as your information changes</li>
          <li>Test your chatbot's knowledge with sample questions</li>
          <li>Fine-tune responses for accuracy</li>
        </ul>
      </div>
    </div>
  );
}

function ApiContent() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">API Reference</h2>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Authentication</h3>
        <p className="text-gray-300">
          All API requests require authentication using an API key. You can generate an API key in your dashboard under Settings {'>'} API.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <pre className="text-gray-300 overflow-x-auto">
            {`// Example API request with authentication
fetch('https://api.anybot.ai/v1/chatbots', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})`}
          </pre>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Endpoints</h3>
        <p className="text-gray-300">
          Use our RESTful API endpoints to programmatically manage your chatbots and integrate them into your applications.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-900 rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Endpoint</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-t border-gray-800">
                <td className="px-4 py-2">/v1/chatbots</td>
                <td className="px-4 py-2">GET</td>
                <td className="px-4 py-2">List all chatbots</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="px-4 py-2">/v1/chatbots/{'{id}'}</td>
                <td className="px-4 py-2">GET</td>
                <td className="px-4 py-2">Get a specific chatbot</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="px-4 py-2">/v1/chatbots</td>
                <td className="px-4 py-2">POST</td>
                <td className="px-4 py-2">Create a new chatbot</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="px-4 py-2">/v1/chatbots/{'{id}'}</td>
                <td className="px-4 py-2">PUT</td>
                <td className="px-4 py-2">Update a chatbot</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="px-4 py-2">/v1/chatbots/{'{id}'}/chat</td>
                <td className="px-4 py-2">POST</td>
                <td className="px-4 py-2">Send a message to a chatbot</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Rate Limits</h3>
        <p className="text-gray-300">
          API rate limits vary based on your subscription plan. Monitor your usage in the dashboard.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <ul className="text-gray-300 space-y-2">
            <li><span className="font-medium">Free plan:</span> 100 requests per day</li>
            <li><span className="font-medium">Pro plan:</span> 1,000 requests per day</li>
            <li><span className="font-medium">Enterprise plan:</span> Custom limits</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8">
        <Link href="/docs/api-examples" className="text-blue-400 hover:text-blue-300">
          View complete API documentation {'>'} 
        </Link>
      </div>
    </div>
  );
} 