'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { XIcon, Loader } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function RecordEditModal({ 
  record, 
  tableName, 
  columns, 
  onClose, 
  onSave, 
  isNewRecord = false 
}) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize form data with the record values
    let initialData = {};
    columns.forEach(column => {
      // Only include primary keys in the initialData if we're editing, not if it's a new record
      if (isNewRecord && column.isPrimaryKey && column.isAutoIncrement) {
        return;
      }
      
      initialData[column.name] = record[column.name] !== undefined 
        ? record[column.name] 
        : null;
    });
    setFormData(initialData);
  }, [record, columns, isNewRecord]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // Parse the value based on the column type
    let parsedValue = value;
    
    if (value === "" || value === null) {
      const column = columns.find(col => col.name === name);
      
      // Allow empty strings for string types, nulls for everything else
      parsedValue = column?.type?.includes('char') ? "" : null;
    } else {
      // Parse numbers
      const column = columns.find(col => col.name === name);
      if (column?.type?.includes('int') || column?.type === 'bigint') {
        parsedValue = value === "" ? null : parseInt(value, 10);
      } else if (column?.type?.includes('float') || column?.type?.includes('double') || column?.type?.includes('decimal')) {
        parsedValue = value === "" ? null : parseFloat(value);
      } else if (column?.type === 'boolean' || column?.type === 'bool') {
        parsedValue = value === 'true';
      } else if (column?.type === 'json' && value) {
        try {
          parsedValue = JSON.parse(value);
        } catch (e) {
          // Keep as string if it's not valid JSON
          parsedValue = value;
        }
      }
    }
    
    setFormData({
      ...formData,
      [name]: parsedValue
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (isNewRecord) {
        response = await apiService.createDatabaseRecord(tableName, formData);
      } else {
        // Find primary key column and value
        const primaryKeyColumn = columns.find(col => col.isPrimaryKey);
        if (!primaryKeyColumn) {
          throw new Error('No primary key column found for table');
        }
        
        const primaryKeyValue = formData[primaryKeyColumn.name];
        if (primaryKeyValue === undefined) {
          throw new Error('Primary key value is required');
        }
        
        response = await apiService.updateDatabaseRecord(tableName, primaryKeyColumn.name, primaryKeyValue, formData);
      }
      
      onSave(response.data);
    } catch (err) {
      console.error(`Failed to ${isNewRecord ? 'create' : 'update'} record:`, err);
      setError(err.response?.data?.message || `Failed to ${isNewRecord ? 'create' : 'update'} record`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {isNewRecord ? `Add New Record to ${tableName}` : `Edit Record in ${tableName}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 p-3 rounded border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {columns.map((column) => {
              // Skip auto-increment primary keys for new records
              if (isNewRecord && column.isPrimaryKey && column.isAutoIncrement) {
                return null;
              }
              
              return (
                <div key={column.name} className="space-y-1">
                  <label 
                    htmlFor={column.name} 
                    className="block text-sm font-medium text-gray-700"
                  >
                    {column.name}
                    {column.isPrimaryKey && <span className="ml-1 text-blue-500">🔑</span>}
                    {column.isNullable ? '' : <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  <div className="mt-1">
                    {renderInputField(column, formData, handleInputChange)}
                  </div>
                  
                  {column.description && (
                    <p className="text-xs text-gray-500 mt-1">{column.description}</p>
                  )}
                </div>
              );
            })}
          </form>
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
            type="submit" 
            variant="default" 
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center"
          >
            {loading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
            {isNewRecord ? 'Create Record' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to render the appropriate input field based on column type
function renderInputField(column, formData, handleInputChange) {
  const value = formData[column.name] === null ? '' : formData[column.name];
  
  // For foreign keys, should ideally render a dropdown with options
  if (column.isForeignKey) {
    return (
      <input
        type="text"
        id={column.name}
        name={column.name}
        value={value || ''}
        onChange={handleInputChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
      />
    );
  }
  
  // For boolean values, render a select
  if (column.type === 'boolean' || column.type === 'bool') {
    return (
      <select
        id={column.name}
        name={column.name}
        value={value === null ? '' : String(value)}
        onChange={handleInputChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
      >
        {column.isNullable && <option value="">-- Select --</option>}
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }
  
  // For date/time values
  if (column.type === 'date') {
    return (
      <input
        type="date"
        id={column.name}
        name={column.name}
        value={value || ''}
        onChange={handleInputChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
      />
    );
  }
  
  if (column.type === 'time') {
    return (
      <input
        type="time"
        id={column.name}
        name={column.name}
        value={value || ''}
        onChange={handleInputChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
      />
    );
  }
  
  if (column.type === 'timestamp' || column.type === 'datetime') {
    return (
      <input
        type="datetime-local"
        id={column.name}
        name={column.name}
        value={value || ''}
        onChange={handleInputChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
      />
    );
  }
  
  // For JSON values, render a textarea
  if (column.type === 'json') {
    return (
      <textarea
        id={column.name}
        name={column.name}
        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || '')}
        onChange={handleInputChange}
        rows={4}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm font-mono"
        required={!column.isNullable}
      />
    );
  }
  
  // For text values with longer potential content
  if (column.type === 'text' || column.type === 'mediumtext' || column.type === 'longtext') {
    return (
      <textarea
        id={column.name}
        name={column.name}
        value={value || ''}
        onChange={handleInputChange}
        rows={3}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
      />
    );
  }
  
  // For numeric values
  if (column.type?.includes('int') || column.type === 'bigint') {
    return (
      <input
        type="number"
        id={column.name}
        name={column.name}
        value={value === null ? '' : value}
        onChange={handleInputChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
        step={1}
      />
    );
  }
  
  if (column.type?.includes('float') || column.type?.includes('double') || column.type?.includes('decimal')) {
    return (
      <input
        type="number"
        id={column.name}
        name={column.name}
        value={value === null ? '' : value}
        onChange={handleInputChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
        required={!column.isNullable}
        step="any"
      />
    );
  }
  
  // Default to a text input for other types
  return (
    <input
      type="text"
      id={column.name}
      name={column.name}
      value={value === null ? '' : value}
      onChange={handleInputChange}
      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
      required={!column.isNullable}
      maxLength={column.maxLength || undefined}
    />
  );
} 