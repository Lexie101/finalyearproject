"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DashboardStudent from "@/components/DashboardStudent";

export default function StudentPage() {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing) {
      if (!user || user.role !== "student") {
        router.replace("/");
      }
    }
  }, [user, initializing, router]);

  if (initializing || !user || user.role !== "student") {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <DashboardStudent user={user} onLogout={logout} />;
}
