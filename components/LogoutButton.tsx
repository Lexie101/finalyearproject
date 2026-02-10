"use client";

import React from "react";
import { useAuth } from "./AuthProvider";

export default function LogoutButton({ className }: { className?: string }) {
  const { logout } = useAuth();
  return (
    <button
      onClick={() => logout()}
      className={
        className ?? "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
      }
    >
      Logout
    </button>
  );
}
