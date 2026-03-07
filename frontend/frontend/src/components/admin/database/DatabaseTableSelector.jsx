'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { Database, Loader } from 'lucide-react';

export default function DatabaseTableSelector({ onSelectTable, selectedTable }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTables() {
      try {
        setLoading(true);
        const response = await apiService.getDatabaseTables();
        setTables(response.data.tables);
      } catch (err) {
        console.error('Failed to fetch database tables:', err);
        setError('Failed to load database tables. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchTables();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="h-6 w-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-500">Loading tables...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        <p>{error}</p>
        <button 
          className="mt-2 text-blue-500 underline" 
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-500 mb-2">
        {tables.length} tables found
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto border rounded-md divide-y">
        {tables.map((table) => (
          <button
            key={table}
            className={`w-full px-3 py-2 text-left flex items-center hover:bg-gray-50 transition-colors
              ${selectedTable === table ? 'bg-gray-100' : ''}`}
            onClick={() => onSelectTable(table)}
          >
            <Database className={`h-4 w-4 mr-2 ${selectedTable === table ? 'text-black' : 'text-gray-400'}`} />
            <span className={selectedTable === table ? 'font-medium' : ''}>
              {table}
            </span>
          </button>
        ))}
        
        {tables.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No tables found
          </div>
        )}
      </div>
    </div>
  );
} 