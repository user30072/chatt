'use client';

import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, File, FilePlus } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function FileDropzone({
  onDrop,
  multiple = false,
  accept = undefined,
  maxSize = 5242880, // 5MB
  maxFiles = 5,
  value = [],
  onChange,
  onRemove,
  className = '',
  label = 'Drag and drop files here, or click to select files',
  helperText = '',
  error = '',
}) {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (onChange) {
        if (multiple) {
          onChange([...value, ...acceptedFiles]);
        } else {
          onChange(acceptedFiles);
        }
      }
      if (onDrop) {
        onDrop(acceptedFiles);
      }
    },
    multiple,
    accept,
    maxSize,
    maxFiles,
    disabled: !multiple && value.length > 0,
  });

  const handleRemove = (file, event) => {
    event.stopPropagation();
    
    if (onRemove) {
      onRemove(file);
    }
    
    if (onChange) {
      if (multiple) {
        onChange(value.filter((f) => f !== file));
      } else {
        onChange([]);
      }
    }
  };

  const getFileIcon = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return (
        <div className="h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center">
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="h-8 w-8 object-cover rounded"
          />
        </div>
      );
    }
    
    return (
      <div className="h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center">
        <File className="h-5 w-5 text-gray-400" />
      </div>
    );
  };

  return (
    <div className={className}>
      <div 
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-md p-4 text-center cursor-pointer
          ${isDragActive ? 'border-primary bg-primary-50' : 'border-gray-300 hover:border-primary'}
          ${error ? 'border-red-300 bg-red-50' : ''}
          ${!multiple && value.length > 0 ? 'bg-gray-50 cursor-default' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {!multiple && value.length > 0 ? (
          <div>
            {value.map((file) => (
              <div
                key={file.name + file.size}
                className="flex items-center justify-between bg-white p-2 rounded"
              >
                <div className="flex items-center">
                  {getFileIcon(file)}
                  <div className="ml-3 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemove(file, e)}
                  className="ml-2 text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">{label}</p>
            {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
          </div>
        )}
      </div>
      
      {fileRejections.length > 0 && (
        <div className="mt-2 text-sm text-red-600">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              {errors.map((error) => (
                <p key={error.code}>{error.message}</p>
              ))}
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      {multiple && value.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-gray-700">Selected files:</div>
          {value.map((file) => (
            <div
              key={file.name + file.size}
              className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
            >
              <div className="flex items-center">
                {getFileIcon(file)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handleRemove(file, e)}
                className="ml-2 text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {multiple && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('dropzone-input').click();
            }}
          >
            <FilePlus className="h-4 w-4 mr-2" />
            Add more files
          </Button>
        </div>
      )}
    </div>
  );
}