'use client';

import { useState } from 'react';
import { apiService } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Play, Download, Loader, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function DatabaseQueryEditor() {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // Only allow SELECT queries for security
      if (!query.trim().toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed for security reasons');
      }
      
      const response = await apiService.runDatabaseQuery(query);
      setResults(response.data);
      
      // Add to history if not a duplicate of the last query
      if (queryHistory.length === 0 || queryHistory[0] !== query) {
        setQueryHistory(prev => [query, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      console.error('Query failed:', err);
      setError(err.response?.data?.message || 'Query failed to execute');
    } finally {
      setLoading(false);
    }
  };

  const handleExportResults = () => {
    if (!results || !results.records || results.records.length === 0) return;
    
    try {
      // Convert results to CSV
      const headers = results.columns.map(col => col.name);
      const csvContent = [
        headers.join(','),
        ...results.records.map(record => 
          headers.map(header => 
            JSON.stringify(record[header] !== null ? record[header] : '')
          ).join(',')
        )
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'query_results.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export results:', err);
      alert('Failed to export results: ' + err.message);
    }
  };

  const handleSelectHistoryQuery = (historyQuery) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="sql-query" className="text-sm font-medium text-gray-700">
            SQL Query (SELECT only)
          </label>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-gray-500 flex items-center hover:text-gray-700"
          >
            Query History
            {showHistory ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </button>
        </div>
        
        {/* Query History Dropdown */}
        {showHistory && (
          <div className="border rounded-md mb-2 bg-gray-50 max-h-40 overflow-y-auto">
            {queryHistory.length === 0 ? (
              <div className="p-3 text-center text-gray-500 text-sm">
                No query history yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {queryHistory.map((historyQuery, index) => (
                  <li key={index}>
                    <button
                      className="p-2 text-left w-full hover:bg-gray-100 text-sm truncate block"
                      onClick={() => handleSelectHistoryQuery(historyQuery)}
                    >
                      {historyQuery}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        <div className="relative">
          <textarea
            id="sql-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-mono text-sm"
            placeholder="Enter your SQL query here (SELECT statements only)"
          />
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-2 mt-2 text-xs text-amber-700">
            <div className="flex">
              <AlertTriangle className="h-4 w-4 text-amber-400 mr-1 flex-shrink-0" />
              <p>
                For security reasons, only SELECT queries are allowed. Other operations must be performed via the database interface.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            onClick={handleRunQuery}
            disabled={loading || !query.trim()}
            className="flex items-center"
          >
            {loading ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Query
          </Button>
          
          {results && results.records && results.records.length > 0 && (
            <Button
              onClick={handleExportResults}
              variant="outline"
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          )}
        </div>
      </div>
      
      {/* Query Results */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm">
                <strong>Error:</strong> {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {results && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Query Results</h3>
          <div className="text-sm text-gray-500 mb-2">
            {results.records.length} records returned in {results.executionTime}ms
          </div>
          
          <div className="border rounded overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {results.columns.map((column) => (
                    <th 
                      key={column.name} 
                      scope="col" 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.records.length === 0 ? (
                  <tr>
                    <td colSpan={results.columns.length} className="px-3 py-4 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  results.records.map((record, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {results.columns.map((column) => (
                        <td 
                          key={`${rowIndex}-${column.name}`} 
                          className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate"
                          title={formatCellValue(record[column.name])}
                        >
                          {formatCellValue(record[column.name])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format cell values
function formatCellValue(value) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '');
    } catch {
      return String(value);
    }
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  return String(value);
} 