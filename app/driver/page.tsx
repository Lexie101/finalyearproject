'use client';

import { useAuth } from '@/components/AuthProvider';
import DashboardDriver from '@/components/DashboardDriver';

export default function DriverPage() {
  const { user, logout } = useAuth();

  // Show loading/redirecting state while checking auth
  if (!user || user.role !== 'driver') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Loading Driver Dashboard...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return <DashboardDriver user={user} onLogout={logout} />;
}
