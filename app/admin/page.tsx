"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DashboardSuperAdmin from "@/components/DashboardSuperAdmin";

export const dynamic = 'force-dynamic';

const SESSION_RESTORE_TIMEOUT = 5000; // 5 seconds to restore session after login

export default function AdminPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Only admin/super_admin can access this page
      if (user.role !== "admin" && user.role !== "super_admin" && user.role !== "super-admin") {
        router.replace("/");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">Restoring session...</p>
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (user.role !== "admin" && user.role !== "super_admin" && user.role !== "super-admin") {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Access Denied: Admin role required</p>
        </div>
      </div>
    );
  }

  return <DashboardSuperAdmin user={user} onLogout={logout} />;
}
