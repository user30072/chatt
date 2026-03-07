'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Link href="/">
            <h2 className="text-3xl font-extrabold text-gray-900">AI Chatbot Platform</h2>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">Last updated: April 12, 2023</p>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p>
              At AI Chatbot Platform, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our platform. Please read this privacy policy carefully. 
              If you do not agree with the terms of this privacy policy, please do not access the site.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">2. Information We Collect</h2>
            <p>We collect information that you provide directly to us when you:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Register for an account</li>
              <li>Create or use chatbots</li>
              <li>Submit questions or requests to our support team</li>
              <li>Complete forms on our platform</li>
            </ul>
            <p>This information may include:</p>
            <ul className="list-disc pl-6">
              <li>Name and contact information</li>
              <li>Login credentials</li>
              <li>Payment information</li>
              <li>Communication preferences</li>
              <li>Chatbot configurations and conversations</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">3. How We Use Your Information</h2>
            <p>We may use the information we collect for various purposes, including to:</p>
            <ul className="list-disc pl-6">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative messages and information</li>
              <li>Respond to comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Personalize and improve the user experience</li>
              <li>Develop new products and services</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">4. Data Security</h2>
            <p>
              We have implemented appropriate technical and organizational security measures designed to protect 
              the security of any personal information we process. However, please also remember that we cannot 
              guarantee that the internet itself is 100% secure.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">5. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:privacy@aichatbotplatform.com" className="text-primary">
                privacy@aichatbotplatform.com
              </a>
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/" className="text-primary hover:text-primary-dark">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 