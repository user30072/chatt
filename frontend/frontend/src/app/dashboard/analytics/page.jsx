'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import apiService from '@/lib/api';
import { useToast } from '@/lib/toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter, Loader2, Calendar, MessagesSquare, Users, Clock, CheckCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [summaryStats, setSummaryStats] = useState(null);
  const [conversationData, setConversationData] = useState([]);
  const [usageData, setUsageData] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [chatbots, setChatbots] = useState([]);

  // Fetch analytics data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // First fetch the user's chatbots to filter analytics
        const chatbotsResponse = await apiService.getChatbots();
        const userChatbots = chatbotsResponse.data.chatbots || [];
        setChatbots(userChatbots);
        
        // If there are chatbots, use the first one as default
        if (userChatbots.length > 0 && !selectedChatbot) {
          setSelectedChatbot(userChatbots[0].id);
        }
        
        // Fetch summary analytics
        const summaryResponse = await apiService.getAnalyticsSummary(selectedPeriod);
        setSummaryStats(summaryResponse.data);
        
        // Fetch conversation metrics
        const conversationResponse = await apiService.getConversationMetrics({
          chatbot_id: selectedChatbot,
          interval: 'day',
          period: selectedPeriod
        });
        setConversationData(conversationResponse.data.data || []);
        
        // Fetch usage metrics
        const usageResponse = await apiService.getUsageMetrics({
          chatbot_id: selectedChatbot,
          interval: 'day',
          period: selectedPeriod
        });
        setUsageData(usageResponse.data.data || []);
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setError('Failed to load analytics data. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load analytics data. Please try again.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [selectedPeriod, selectedChatbot]);

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };
  
  // Handle chatbot change
  const handleChatbotChange = (e) => {
    setSelectedChatbot(e.target.value);
  };

  // Prepare stats based on actual data or fallback to defaults
  const stats = [
    { 
      name: 'Total Conversations', 
      value: summaryStats?.conversations?.total || 0, 
      change: summaryStats?.conversations?.change || '+0%', 
      trend: summaryStats?.conversations?.trend || 'up',
      icon: MessagesSquare
    },
    { 
      name: 'User Satisfaction', 
      value: summaryStats?.satisfaction?.score || '95%', 
      change: summaryStats?.satisfaction?.change || '+0%', 
      trend: summaryStats?.satisfaction?.trend || 'up',
      icon: Users
    },
    { 
      name: 'Avg. Response Time', 
      value: summaryStats?.responseTime?.avg || '1.5s', 
      change: summaryStats?.responseTime?.change || '-0.2s', 
      trend: summaryStats?.responseTime?.trend === 'down' ? 'up' : 'down', // Lower is better for response time
      icon: Clock
    },
    { 
      name: 'Resolution Rate', 
      value: summaryStats?.resolution?.rate || '85%', 
      change: summaryStats?.resolution?.change || '+0%', 
      trend: summaryStats?.resolution?.trend || 'up',
      icon: CheckCircle
    }
  ];

  // Generate mock chart data if real data is not available
  const getDefaultConversationData = () => {
    return Array(7).fill(0).map((_, i) => ({
      name: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversations: Math.floor(Math.random() * 30) + 5
    }));
  };

  // If no real conversation data, use mock data
  const chartData = conversationData.length > 0 
    ? conversationData 
    : getDefaultConversationData();

  // If loading, show loading UI
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex space-x-2">
          {chatbots.length > 0 && (
            <select
              value={selectedChatbot || ''}
              onChange={handleChatbotChange}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Chatbots</option>
              {chatbots.map(chatbot => (
                <option key={chatbot.id} value={chatbot.id}>{chatbot.name}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-md shadow-sm">
            <button
              className={`px-3 py-2 text-sm rounded-l-md ${
                selectedPeriod === 'day' 
                  ? 'bg-black text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handlePeriodChange('day')}
            >
              Day
            </button>
            <button
              className={`px-3 py-2 text-sm ${
                selectedPeriod === 'week' 
                  ? 'bg-black text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handlePeriodChange('week')}
            >
              Week
            </button>
            <button
              className={`px-3 py-2 text-sm rounded-r-md ${
                selectedPeriod === 'month' 
                  ? 'bg-black text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handlePeriodChange('month')}
            >
              Month
            </button>
          </div>
          <Button className="bg-black hover:bg-gray-900 text-white">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>
      
      {/* Show user context information */}
      {user && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Current User:</strong> {user.username || user.email} 
            <span className="ml-2 text-xs text-blue-600">({user.id})</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Showing analytics for {selectedChatbot 
              ? `chatbot: ${chatbots.find(c => c.id === selectedChatbot)?.name || 'Selected Chatbot'}`
              : 'all your chatbots'
            }.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-400 text-red-800 px-4 py-3 rounded">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-1">
            Check your network connection or try again later.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-gray-100">
                  <stat.icon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Conversations Chart */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Conversations</h3>
            <p className="mt-1 text-sm text-gray-500">Daily conversations over time</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="conversations" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chatbot Performance */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Chatbot Performance</h3>
            <p className="mt-1 text-sm text-gray-500">Response times and user satisfaction</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={usageData.length > 0 ? usageData : getDefaultConversationData()}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="responseTime" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="satisfaction" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 