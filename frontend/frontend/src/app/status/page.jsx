'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function StatusPage() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await api.get('/health');
        setStatusData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching status:', err);
        setError('Unable to fetch system status. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    const colors = {
      ok: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-amber-100 text-amber-800 border-amber-200',
      unknown: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.unknown}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Link href="/">
            <h2 className="text-3xl font-extrabold text-gray-900">AI Chatbot Platform</h2>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">System Status</h1>
          <p className="mt-2 text-sm text-gray-700">
            Check the current status of our services
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-400 text-red-800 rounded-md p-4 text-sm font-medium">
            {error}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Current Status</h3>
                <p className="mt-1 text-sm text-gray-500">Last updated: {new Date(statusData?.timestamp || Date.now()).toLocaleString()}</p>
              </div>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${statusData?.database?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">
                  {statusData?.database?.connected ? 'All Systems Operational' : 'Service Disruption'}
                </span>
              </div>
            </div>

            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Service Status</h4>
              
              <div className="grid gap-4">
                <div className="flex justify-between items-center p-4 border rounded-md">
                  <div>
                    <h5 className="font-medium">API</h5>
                    <p className="text-sm text-gray-500">Web API Services</p>
                  </div>
                  {getStatusBadge(statusData ? 'ok' : 'unknown')}
                </div>
                
                <div className="flex justify-between items-center p-4 border rounded-md">
                  <div>
                    <h5 className="font-medium">Database</h5>
                    <p className="text-sm text-gray-500">PostgreSQL Database</p>
                  </div>
                  {getStatusBadge(statusData?.database?.connected ? 'ok' : 'error')}
                </div>
                
                {statusData?.database?.connected === false && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 text-sm">
                    <p className="font-medium">Database Issue Detected</p>
                    <p className="mt-1">Our team has been notified and is working to resolve this issue.</p>
                    <p className="mt-2">We apologize for any inconvenience this may cause. Please try again later.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-primary-700 hover:text-primary-800 underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 