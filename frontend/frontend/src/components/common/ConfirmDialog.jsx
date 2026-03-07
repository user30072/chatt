'use client';

import { useState } from 'react';
import Modal from './Modal';
import Button from '@/components/ui/Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonProps = { color: 'danger' },
  icon = null,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {cancelText}
          </Button>
          <Button
            {...confirmButtonProps}
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex">
        {icon && (
          <div className="flex-shrink-0 mr-4">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
      </div>
    </Modal>
  );
}