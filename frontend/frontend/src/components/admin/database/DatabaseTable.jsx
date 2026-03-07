'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import Button from '@/components/ui/Button';
import { 
  Loader, 
  RefreshCw, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  Download 
} from 'lucide-react';
import RecordEditModal from './RecordEditModal';
import RecordDeleteModal from './RecordDeleteModal';

export default function DatabaseTable({ tableName }) {
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch records from the database
  useEffect(() => {
    async function fetchTableData() {
      if (!tableName) return;
      
      try {
        setLoading(true);
        const response = await apiService.getDatabaseTableData(
          tableName, 
          page, 
          pageSize, 
          searchQuery
        );
        
        setRecords(response.data.records);
        setColumns(response.data.columns);
        setTotalRecords(response.data.totalRecords);
        setTotalPages(response.data.totalPages);
      } catch (err) {
        console.error(`Failed to fetch ${tableName} data:`, err);
        setError(`Failed to load ${tableName} data. ${err.response?.data?.message || ''}`);
      } finally {
        setLoading(false);
      }
    }

    fetchTableData();
  }, [tableName, page, pageSize, searchQuery, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = async () => {
    try {
      const response = await apiService.exportDatabaseTable(tableName);
      
      // Create a blob and download it
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${tableName}_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to export ${tableName}:`, err);
      alert(`Failed to export table: ${err.message}`);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to first page when searching
    setPage(1);
  };

  // Handle saving a record
  const handleSaveRecord = (updatedRecord) => {
    setEditingRecord(null);
    handleRefresh();
  };

  // Handle deleting a record
  const handleDeleteRecord = () => {
    setDeletingRecord(null);
    handleRefresh();
  };

  // Render loading state
  if (loading && !records.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="h-8 w-8 text-gray-400 animate-spin" />
        <span className="ml-3 text-gray-500">Loading table data...</span>
      </div>
    );
  }

  // Render error state
  if (error && !records.length) {
    return (
      <div className="bg-red-50 p-4 rounded border border-red-200 text-red-600">
        <p>{error}</p>
        <button 
          className="mt-2 text-blue-600 underline"
          onClick={handleRefresh}
        >
          Try again
        </button>
      </div>
    );
  }

  // Determine primary key column
  const primaryKeyColumn = columns.find(col => col.isPrimaryKey)?.name || columns[0]?.name;

  return (
    <div>
      {/* Table Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={() => setEditingRecord({})} 
            variant="outline" 
            size="sm"
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Record
          </Button>
          <Button 
            onClick={handleExport} 
            variant="outline" 
            size="sm"
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded text-sm w-full md:w-64"
            />
          </div>
          <Button type="submit" variant="default" size="sm">
            Search
          </Button>
        </form>
      </div>
      
      {/* Records Table */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Actions
              </th>
              {columns.map((column) => (
                <th 
                  key={column.name} 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.name}
                  {column.isPrimaryKey && <span className="ml-1 text-blue-500">🔑</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={record[primaryKeyColumn] || index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit record"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingRecord(record)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  {columns.map((column) => (
                    <td 
                      key={column.name} 
                      className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate"
                      title={String(record[column.name])}
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
      
      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          Showing {records.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, totalRecords)} of {totalRecords} records
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1); // Reset to first page when changing page size
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
          
          <Button
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
      
      {/* Edit Modal */}
      {editingRecord !== null && (
        <RecordEditModal
          record={editingRecord}
          tableName={tableName}
          columns={columns}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveRecord}
          isNewRecord={!editingRecord[primaryKeyColumn]}
        />
      )}
      
      {/* Delete Modal */}
      {deletingRecord !== null && (
        <RecordDeleteModal
          record={deletingRecord}
          tableName={tableName}
          primaryKeyColumn={primaryKeyColumn}
          onClose={() => setDeletingRecord(null)}
          onDelete={handleDeleteRecord}
        />
      )}
    </div>
  );
}

function formatCellValue(value) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }
  
  if (typeof value === 'object') {
    // For JSON objects or arrays
    try {
      return JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '');
    } catch {
      return String(value);
    }
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  // For dates, check if it looks like an ISO date string
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return new Date(value).toLocaleString();
  }
  
  return String(value);
} 