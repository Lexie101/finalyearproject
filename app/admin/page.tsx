"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DashboardAdmin from "@/components/DashboardAdmin";

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing) {
      // Only redirect if on wrong page (not if no user - let loading state handle that)
      if (user?.role === "super_admin") {
        router.replace("/super-admin");
      } else if (user?.role !== "admin") {
        // Redirect if logged in but not admin/super_admin
        router.replace("/");
      }
    }
  }, [user?.role, initializing, router]);

  // Show loading spinner if initializing or no user/wrong role
  if (initializing) {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">Redirecting to login...</p>
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show error if wrong role
  if (user.role !== "admin" && user.role !== "super_admin") {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Access Denied: Admin role required</p>
        </div>
      </div>
    );
  }

  return <DashboardAdmin user={user} onLogout={logout} />;
}
