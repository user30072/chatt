'use client';

import PageTemplate from '@/components/landing/PageTemplate';
import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <PageTemplate title="Features">
      <div className="text-xl mb-12">
        Explore the powerful capabilities of our AI chatbot platform
      </div>
      
      {/* Main Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
        {/* Feature 1: AI-Powered Conversations */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 shadow-xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="text-blue-400 text-4xl mb-4">🤖</div>
          <h3 className="text-2xl font-bold mb-3">AI-Powered Conversations</h3>
          <p className="text-gray-300">
            Leverage cutting-edge AI models to create natural, human-like conversations that understand context and provide accurate responses.
          </p>
        </div>
        
        {/* Feature 2: Simple Setup */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 shadow-xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="text-blue-400 text-4xl mb-4">⚡</div>
          <h3 className="text-2xl font-bold mb-3">Simple Setup</h3>
          <p className="text-gray-300">
            Get your chatbot up and running in minutes with no coding required. Our intuitive interface makes it easy to create and customize your bot.
          </p>
        </div>
        
        {/* Feature 3: Knowledge Base Integration */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 shadow-xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="text-blue-400 text-4xl mb-4">📚</div>
          <h3 className="text-2xl font-bold mb-3">Knowledge Base Integration</h3>
          <p className="text-gray-300">
            Upload your documents, FAQs, and website content to train your chatbot on your specific information and provide accurate, context-aware answers.
          </p>
        </div>
        
        {/* Feature 4: Customization */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 shadow-xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="text-blue-400 text-4xl mb-4">🎨</div>
          <h3 className="text-2xl font-bold mb-3">Complete Customization</h3>
          <p className="text-gray-300">
            Personalize your chatbot's appearance, behavior, and personality to match your brand and meet your specific business requirements.
          </p>
        </div>
      </div>
      
      {/* Advanced Features Section */}
      <h2 className="text-3xl font-bold mb-8">Advanced Capabilities</h2>
      
      <div className="space-y-6 mb-16">
        <div className="flex flex-col md:flex-row items-start gap-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg">
          <div className="flex-shrink-0 bg-blue-600 rounded-full p-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Advanced Analytics</h3>
            <p className="text-gray-300">
              Gain deep insights into your chatbot's performance with comprehensive analytics. Track user engagement, conversation flow, frequently asked questions, and more to continuously improve your bot's effectiveness.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-start gap-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg">
          <div className="flex-shrink-0 bg-blue-600 rounded-full p-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Multi-Channel Integration</h3>
            <p className="text-gray-300">
              Deploy your chatbot across multiple platforms including your website, mobile app, Facebook Messenger, WhatsApp, and more. Provide a consistent experience across all customer touchpoints.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-start gap-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg">
          <div className="flex-shrink-0 bg-blue-600 rounded-full p-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Seamless Handoff</h3>
            <p className="text-gray-300">
              Automatically transfer complex conversations to human agents when necessary. The transition is smooth and includes the full conversation history to provide context for your support team.
            </p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="text-center bg-blue-600 p-10 rounded-xl shadow-lg">
        <h3 className="text-2xl font-bold mb-4">Ready to experience the power of AI chatbots?</h3>
        <p className="text-xl mb-6 max-w-2xl mx-auto">
          Start building your custom chatbot today and transform how you interact with your customers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="bg-white text-blue-700 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium text-lg">
            Get Started For Free
          </Link>
          <Link href="/docs" className="bg-transparent border border-white text-white hover:bg-white/10 px-6 py-3 rounded-lg font-medium text-lg">
            View Documentation
          </Link>
        </div>
      </div>
    </PageTemplate>
  );
} 