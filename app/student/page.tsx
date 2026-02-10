"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DashboardStudent from "@/components/DashboardStudent";

export default function StudentPage() {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && user) {
      // Only redirect if on wrong page
      if (user.role !== "student") {
        router.replace("/");
      }
    }
  }, [user?.role, initializing, router]);

  if (initializing) {
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
          <p className="mb-4">Redirecting to login...</p>
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