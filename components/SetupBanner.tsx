'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface SetupBannerProps {
  show: boolean;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
}

export function SetupBanner({ show, type, message, details }: SetupBannerProps) {
  if (!show) return null;

  const styles = {
    error: 'bg-red-500/10 border-red-500/50 text-red-200',
    warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-200',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-200',
    success: 'bg-green-500/10 border-green-500/50 text-green-200',
  };

  const icons = {
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle,
  };

  const Icon = icons[type];

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4 ${styles[type]} border rounded-lg p-4 shadow-xl backdrop-blur-sm`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {details && (
            <p className="text-sm opacity-80 mt-1">{details}</p>
          )}
        </div>
      </div>
    </div>
  );
}
