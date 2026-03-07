'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Link href="/">
            <h2 className="text-3xl font-extrabold text-gray-900">AI Chatbot Platform</h2>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-600">Last updated: April 12, 2023</p>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing our platform, you agree to be bound by these Terms of Service. If you disagree with any part 
              of the terms, you may not access the service.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily use our platform for personal or business purposes. 
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose beyond our intended functionality</li>
              <li>Attempt to decompile or reverse engineer any software contained on the platform</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">3. Disclaimer</h2>
            <p>
              The materials on our platform are provided on an 'as is' basis. We make no warranties, expressed or implied, 
              and hereby disclaim and negate all other warranties including, without limitation, implied warranties or 
              conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">4. Limitations</h2>
            <p>
              In no event shall AI Chatbot Platform or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use 
              the materials on our platform, even if we or an authorized representative has been notified orally or in writing 
              of the possibility of such damage.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">5. Revisions and Errata</h2>
            <p>
              The materials appearing on our platform could include technical, typographical, or photographic errors. 
              We do not warrant that any of the materials on our platform are accurate, complete or current. We may make 
              changes to the materials contained on our platform at any time without notice.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">6. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws and you irrevocably 
              submit to the exclusive jurisdiction of the courts in that location.
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