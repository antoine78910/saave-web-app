import React, { useEffect } from 'react';
import { Toast } from '../types/types';

interface ToastManagerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastComponent: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[toast.type];

  return (
    <div
      className={`flex items-center justify-between w-full max-w-sm p-4 text-white rounded-lg shadow-lg ${bgColor} animate-fade-in-right`}
    >
      <span>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="ml-4 text-xl font-semibold opacity-80 hover:opacity-100">&times;</button>
    </div>
  );
};

const ToastManager: React.FC<ToastManagerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default ToastManager;
