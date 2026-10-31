'use client';

import { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'success', action, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  }[type];

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
        isLeaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className={`${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] max-w-md`}>
        <span className="text-lg">{icon}</span>
        <span className="flex-1 text-sm font-medium">{message}</span>

        {action && (
          <button
            onClick={() => {
              action.onClick();
              handleClose();
            }}
            className="text-sm font-bold underline hover:no-underline ml-2"
          >
            {action.label}
          </button>
        )}

        <button
          onClick={handleClose}
          className="ml-2 hover:opacity-70 transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
