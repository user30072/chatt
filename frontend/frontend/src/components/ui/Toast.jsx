import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

// Create context
const ToastContext = createContext(null);

// Toast component
function Toast({ children, title, description, type = 'default', onClose }) {
  const bgColors = {
    default: 'bg-gray-800',
    success: 'bg-green-700',
    error: 'bg-red-700',
    warning: 'bg-amber-600',
    info: 'bg-blue-700'
  };
  
  const bgColor = bgColors[type] || bgColors.default;

  return (
    <div className={`${bgColor} text-white rounded-lg p-4 shadow-lg flex items-start max-w-sm w-full pointer-events-auto`}>
      <div className="flex-1">
        {title && <h5 className="font-medium text-sm">{title}</h5>}
        {description && <p className="text-sm mt-1 opacity-90">{description}</p>}
        {children}
      </div>
      <button 
        onClick={onClose} 
        className="ml-4 text-white text-opacity-70 hover:text-opacity-100"
      >
        ×
      </button>
    </div>
  );
}

// Toast provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, ...toast }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // Create context value
  const contextValue = {
    toast: (props) => addToast(props),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-0 right-0 p-4 space-y-4 z-50 pointer-events-none max-w-sm w-full">
          {toasts.map((toast) => (
            <Toast 
              key={toast.id} 
              title={toast.title}
              description={toast.description}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 