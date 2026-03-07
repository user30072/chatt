'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Building, 
  BrainCircuit, 
  MessageSquare,
  FileText,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '@/lib/api';

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await apiService.getAdminStats();
        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
        setError('Could not load platform statistics');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="mt-2 h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mr-4" />
        <div>
          <h3 className="text-red-800 font-medium">Error loading statistics</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }
  
  // Use dummy stats if no real stats available yet
  const displayStats = stats || {
    totalUsers: 0,
    totalOrganizations: 0,
    totalChatbots: 0,
    totalConversations: 0,
    totalDocuments: 0,
    activeSubscriptions: 0,
    totalMessagesLast30Days: 0
  };
  
  const statItems = [
    {
      name: 'Total Users',
      value: displayStats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
      trend: '+12%',
      trendDirection: 'up'
    },
    {
      name: 'Organizations',
      value: displayStats.totalOrganizations.toLocaleString(),
      icon: Building,
      color: 'bg-purple-500',
      trend: '+8%',
      trendDirection: 'up'
    },
    {
      name: 'Chatbots',
      value: displayStats.totalChatbots.toLocaleString(),
      icon: BrainCircuit,
      color: 'bg-green-500',
      trend: '+15%',
      trendDirection: 'up'
    },
    {
      name: 'Conversations',
      value: displayStats.totalConversations.toLocaleString(),
      icon: MessageSquare,
      color: 'bg-yellow-500',
      trend: '+23%',
      trendDirection: 'up'
    },
    {
      name: 'Documents',
      value: displayStats.totalDocuments.toLocaleString(),
      icon: FileText,
      color: 'bg-red-500',
      trend: '+7%',
      trendDirection: 'up'
    },
    {
      name: 'Active Subscriptions',
      value: displayStats.activeSubscriptions.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      trend: '+5%',
      trendDirection: 'up'
    },
    {
      name: 'Messages (30d)',
      value: displayStats.totalMessagesLast30Days.toLocaleString(),
      icon: MessageSquare,
      color: 'bg-pink-500',
      trend: '+19%',
      trendDirection: 'up'
    }
  ];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.slice(0, 4).map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center text-white`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-500">{stat.name}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.trend && (
                <div className="flex items-center mt-1">
                  {stat.trendDirection === 'up' ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                  <span className={`text-sm ${stat.trendDirection === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.trend}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}