'use client';

import { useState } from 'react';
import { apiService } from '@/lib/api';
import { XIcon, Loader, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function RecordDeleteModal({ 
  record, 
  tableName, 
  primaryKeyColumn, 
  onClose, 
  onDelete 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the primary key value
      const primaryKeyValue = record[primaryKeyColumn];
      if (primaryKeyValue === undefined) {
        throw new Error('Primary key value is required for deletion');
      }
      
      await apiService.deleteDatabaseRecord(tableName, primaryKeyColumn, primaryKeyValue);
      onDelete();
    } catch (err) {
      console.error('Failed to delete record:', err);
      setError(err.response?.data?.message || 'Failed to delete record');
      setLoading(false);
    }
  };

  // Create a human-readable identifier for the record
  const recordIdentifier = record[primaryKeyColumn] 
    ? `${primaryKeyColumn}: ${record[primaryKeyColumn]}`
    : 'this record';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            Confirm Deletion
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-50 p-3 rounded border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{recordIdentifier}</strong> from the <strong>{tableName}</strong> table?
          </p>
          
          <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  This action cannot be undone. All data associated with this record will be permanently removed.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t flex justify-end space-x-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center"
          >
            {loading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
            Delete Record
          </Button>
        </div>
      </div>
    </div>
  );
} 