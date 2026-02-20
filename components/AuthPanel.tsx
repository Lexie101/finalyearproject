'use client';

import React, { useState } from 'react';
import { Mail, Lock, GraduationCap, Shield, Car, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

type Role = 'student' | 'driver' | 'super_admin';

interface AuthPanelProps {
  onLogin?: (role: string, email: string) => void;
}

/**
 * Auth Panel Component
 * Fresh authentication flow for student and super admin
 */
export const AuthPanel: React.FC<AuthPanelProps> = ({ onLogin }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Step 1: Send OTP
      if (!showOtp) {
        const response = await fetch('/api/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send OTP');
        }

        toast.success('OTP sent to your email');
        setShowOtp(true);
      } else {
        // Step 2: Verify OTP
        const response = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Invalid OTP');
        }

        toast.success('Logged in successfully');
        login('student', email);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      toast.success('Admin login successful');
      // Use the role returned by the API
      login(data.user.role as 'admin' | 'super_admin', email, data.user.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/driver-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      toast.success('Driver login successful');
      login('driver', email, data.user.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = role === 'student' ? handleStudentLogin : role === 'driver' ? handleDriverLogin : handleSuperAdminLogin;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Role Selector */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { role: 'student' as Role, icon: GraduationCap, label: 'Student' },
          { role: 'driver' as Role, icon: Car, label: 'Driver' },
          { role: 'super_admin' as Role, icon: Shield, label: 'Admin' },
        ].map(({ role: r, icon: Icon, label }) => (
          <button
            key={r}
            onClick={() => {
              setRole(r);
              setShowOtp(false);
              setEmail('');
              setPassword('');
              setOtp('');
            }}
            className={`p-4 rounded-xl transition-all border flex flex-col items-center gap-2 ${
              role === r
                ? 'bg-purple-600/30 border-purple-400 text-purple-100'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            <Icon size={24} />
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
            <Mail size={16} /> Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === 'student' ? 'ab123456@students.cavendish.co.zm' : 'your@email.com'}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        {(role === 'driver' || role === 'super_admin') && (
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
              <Lock size={16} /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
        )}

        {role === 'student' && showOtp && (
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              6-Digit OTP
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest font-mono placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowOtp(false)}
              className="text-xs text-purple-400 hover:underline mt-2"
            >
              Back to email
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {role === 'student' && !showOtp ? 'Send OTP' : 'Sign In'}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
