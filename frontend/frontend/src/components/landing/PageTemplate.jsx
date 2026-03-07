'use client';

import Header from '@/components/landing/Header';
import Link from 'next/link';

export default function PageTemplate({ title, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Main Content - Add top padding to account for the fixed header */}
      <main className="flex-grow bg-gradient-to-r from-gray-900 to-black text-white pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">{title}</h1>
          
          {children}
          
        </div>
      </main>

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