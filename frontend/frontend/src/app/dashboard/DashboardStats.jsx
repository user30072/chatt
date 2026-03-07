'use client';

import { useState, useEffect } from 'react';
import { 
  MessagesSquare, 
  BrainCircuit, 
  FileText, 
  UsersIcon
} from 'lucide-react';
import api from '@/lib/api';

export default function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const response = await api.getAnalyticsSummary(period);
        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [period]);

  const statsItems = [
    {
      title: 'Total Conversations',
      value: stats?.conversations?.total || 0,
      change: '+12%',
      positive: true,
      icon: MessagesSquare,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Chatbots',
      value: stats?.chatbots?.active || 0,
      total: stats?.chatbots?.total || 0,
      icon: BrainCircuit,
      color: 'bg-purple-500',
    },
    {
      title: 'Knowledge Base Documents',
      value: stats?.documents?.total || 0,
      icon: FileText,
      color: 'bg-amber-500',
    },
    {
      title: 'Total Messages',
      value: stats?.messages?.total || 0,
      change: '+22%',
      positive: true,
      icon: UsersIcon,
      color: 'bg-green-500',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="rounded-md h-10 w-10 bg-gray-200"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Summary</h2>
        <div className="flex rounded-md shadow-sm">
          <button
            className={`py-1 px-3 text-sm rounded-l-md ${
              period === 'day' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setPeriod('day')}
          >
            Day
          </button>
          <button
            className={`py-1 px-3 text-sm ${
              period === 'week' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setPeriod('week')}
          >
            Week
          </button>
          <button
            className={`py-1 px-3 text-sm rounded-r-md ${
              period === 'month' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setPeriod('month')}
          >
            Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsItems.map((item) => (
          <div key={item.title} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${item.color} rounded-md p-2 text-white`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{item.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{item.value.toLocaleString()}</p>
                  {item.change && (
                    <p className={`text-xs ${item.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {item.change} from previous {period}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-2">
              <div className="text-sm text-gray-500">
                {item.total ? `${item.value} out of ${item.total} total` : '\u00A0'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}