'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '@/lib/api';

export default function ConversationChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [chatbotId, setChatbotId] = useState('');
  const [chatbots, setChatbots] = useState([]);

  useEffect(() => {
    async function loadChatbots() {
      try {
        const response = await api.getChatbots();
        setChatbots(response.data.chatbots);
      } catch (err) {
        console.error('Failed to load chatbots:', err);
      }
    }

    loadChatbots();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await api.getConversationMetrics({
          period,
          chatbot_id: chatbotId || undefined,
          interval: period === 'month' ? 'day' : 'hour'
        });
        setData(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load chart data:', err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [period, chatbotId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="mt-4 h-64 bg-gray-200 rounded animate-pulse"></div>
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">Conversation Activity</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <select
            className="rounded-md border-gray-300 py-1 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={chatbotId}
            onChange={(e) => setChatbotId(e.target.value)}
          >
            <option value="">All Chatbots</option>
            {chatbots.map((chatbot) => (
              <option key={chatbot.id} value={chatbot.id}>{chatbot.name}</option>
            ))}
          </select>
          
          <div className="flex rounded-md shadow-sm">
            <button
              className={`py-1 px-3 text-sm rounded-l-md ${
                period === 'day' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
              onClick={() => setPeriod('day')}
            >
              Day
            </button>
            <button
              className={`py-1 px-3 text-sm ${
                period === 'week' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-t border-b border-gray-300'
              }`}
              onClick={() => setPeriod('week')}
            >
              Week
            </button>
            <button
              className={`py-1 px-3 text-sm rounded-r-md ${
                period === 'month' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
              onClick={() => setPeriod('month')}
            >
              Month
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="time_period"
              label={{ value: 'Time', position: 'insideBottomRight', offset: -10 }}
              tickFormatter={(value) => {
                if (period === 'day') {
                  return value.substring(11, 16);
                } else if (period === 'week') {
                  return value.substring(5, 10);
                }
                return value;
              }}
            />
            <YAxis 
              label={{ value: 'Conversations', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value) => [`${value} conversations`, 'Count']}
              labelFormatter={(label) => {
                if (period === 'day') {
                  return `Time: ${label}`;
                } else if (period === 'week') {
                  return `Date: ${label}`;
                }
                return label;
              }}
            />
            <Line 
              type="monotone"
              dataKey="count"
              name="Conversations"
              stroke="#0084ff"
              stro