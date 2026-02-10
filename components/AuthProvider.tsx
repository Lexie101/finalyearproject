"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "student" | "driver" | "admin" | null;

export interface User {
  role: Role;
  email: string;
  expiresAt?: number;
}

interface AuthContextType {
  user: User | null;
  login: (role: Exclude<Role, null>, email: string, expiresInMs?: number) => void;
  logout: () => void;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "cavendish_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: User = JSON.parse(saved);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        } else {
          setUser(parsed);
          if (parsed.role) router.replace(`/${parsed.role}`);
        }
      }
    } catch (e) {
      console.error("Failed to restore session", e);
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } finally {
      setInitializing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (role: Exclude<Role, null>, email: string, expiresInMs?: number) => {
    const next: User = { role, email };
    if (expiresInMs) next.expiresAt = Date.now() + expiresInMs;
    setUser(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save session", e);
    }
    router.replace(`/${role}`);
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear session", e);
    }
    router.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
