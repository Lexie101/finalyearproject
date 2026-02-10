"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DashboardAdmin from "@/components/DashboardAdmin";

export default function AdminPage() {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing) {
      if (!user || user.role !== "admin") {
        router.replace("/");
      }
    }
  }, [user, initializing, router]);

  if (initializing || !user || user.role !== "admin") {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <DashboardAdmin user={user} onLogout={logout} />;
}
