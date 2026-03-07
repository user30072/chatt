'use client';

import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ConfirmDialog({
  open = false,
  title = 'Confirmation',
  message = 'Are you sure you want to perform this action?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel
}) {
  const [isOpen, setIsOpen] = useState(open);
  
  useEffect(() => {
    setIsOpen(open);
  }, [open]);
  
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    } else {
      // Reset when closed
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // If not open, return null
  if (!isOpen) return null;
  
  // Map variant to correct color scheme
  const getButtonVariant = () => {
    switch (confirmVariant) {
      case 'destructive':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'primary':
        return 'bg-black hover:bg-gray-900 text-white';
      case 'secondary':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-800';
      default:
        return 'bg-black hover:bg-gray-900 text-white';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" onClick={onCancel}></div>
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-gray-700">{message}</p>
          </div>
          
          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <Button 
              variant="outline"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button 
              className={getButtonVariant()}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 