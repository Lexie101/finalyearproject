"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DashboardStudent from "@/components/DashboardStudent";

export const dynamic = 'force-dynamic';

const SESSION_RESTORE_TIMEOUT = 5000; // 5 seconds to restore session after login

export default function StudentPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Only redirect if on wrong page
      if (user.role !== "student") {
        router.replace("/");
      }
    }
  }, [user?.role, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow longer timeout for session restoration after login
  // Customer may have just logged in, give AuthProvider time to fetch session from server
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

  if (user.role !== "student") {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Access Denied: Student role required</p>
        </div>
      </div>
    );
  }

  return <DashboardStudent user={user} onLogout={logout} />;
}