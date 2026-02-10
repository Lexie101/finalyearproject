"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthPanel } from "@/components/AuthPanel";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

type Role = "student" | "driver" | "admin" | null;

function LoginInner() {
  const { login, initializing } = useAuth();

  const handleLogin = (role: Exclude<Role, null>, email: string) => {
    login(role, email);
  };

  if (initializing) {
    return (
      <div className="h-screen w-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/main%20bg.png')" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative min-h-screen flex flex-col items-center justify-center p-6"
        >
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
          </div>

          <div className="mb-12 text-center relative z-10">
            <img src="/logo%20(1).png" alt="Cavendish Logo" className="w-28 h-28 mx-auto mb-6 object-cover rounded-3xl shadow-2xl border border-white/10 bg-white/5 p-1" />
            <h1 className="text-5xl font-black text-white mb-2 tracking-tight">CAVENDISH</h1>
            <p className="text-purple-400 font-bold tracking-[0.3em] uppercase text-sm">Bus Tracking System</p>
          </div>

          <AuthPanel onLogin={handleLogin} />

          <footer className="mt-12 text-white/30 text-sm">
            &copy; 2026 Cavendish University Zambia. All rights reserved.
          </footer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginInner />
    </AuthProvider>
  );
}
