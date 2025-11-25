import React, { useEffect, useState } from 'react';

const Alert = ({ 
  type = 'error', 
  message, 
  onClose, 
  className = '',
  show = true,
  position = 'fixed', // 'fixed' hoặc 'relative'
  autoClose = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && autoClose && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoClose, duration, onClose]);

  if (!isVisible || !message) return null;

  const typeClasses = {
    error: 'bg-red-500 border-red-500 text-white shadow-red-200',
    success: 'bg-green-500 border-green-500 text-white shadow-green-200',
    warning: 'bg-yellow-500 border-yellow-500 text-white shadow-yellow-200',
    info: 'bg-blue-500 border-blue-500 text-white shadow-blue-200'
  };

  const iconClasses = {
    error: 'text-white',
    success: 'text-white',
    warning: 'text-white',
    info: 'text-white'
  };

  const icons = {
    error: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  const positionClasses = position === 'fixed' 
    ? 'fixed top-4 right-4 z-[9999] max-w-md w-full mx-4' 
    : 'relative w-full';

  return (
    <div className={`${positionClasses} transform transition-all duration-300 ease-in-out ${
      isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className={`rounded-lg p-4 border shadow-lg ${typeClasses[type]} ${className}`}>
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconClasses[type]}`}>
            {icons[type]}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold">{message}</p>
          </div>
          {onClose && (
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => {
                  setIsVisible(false);
                  if (onClose) onClose();
                }}
                className="inline-flex rounded-md p-1.5 text-white hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-colors duration-200"
              >
                <span className="sr-only">Đóng</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alert;
