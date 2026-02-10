'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Car, ShieldCheck, Mail, Lock, ArrowRight, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Role = 'student' | 'driver' | 'admin' | 'super_admin';

interface AuthPanelProps {
  onLogin: (role: Exclude<Role, 'student'> | 'student', email: string) => void;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ onLogin }) => {
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const studentRegex = /^[A-Za-z]{2,3}(?:\d{6}|\d{8})@students\.cavendish\.co\.zm$/;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRegex.test(email)) {
      toast.error('Please enter a valid Cavendish student email');
      return;
    }

    setLoading(true);
    try {
      const data = await api.sendOtp(email);
      toast.success(data.message || 'OTP sent to your email');
      setShowOtp(true);
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === 'student') {
        await api.verifyOtp(email, otp);
        onLogin(role, email);
        toast.success('Successfully logged in');
      } else {
        // Admin/Driver/Super Admin login with email and password
        const response = await api.adminLogin(email, password, role);
        // Use the actual role from the database, not the selected role
        const actualRole = response.user.role as Exclude<Role, 'student'>;
        onLogin(actualRole, email);
        toast.success(`Logged in as ${actualRole}`);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Role Selection Title */}
      <div className="text-center">
        <p className="text-white/60 text-sm uppercase tracking-widest font-semibold mb-4">Select Your Role</p>
      </div>

      {/* Role Selection Panels - Grid */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 px-4">
        {(['student', 'driver', 'admin', 'super_admin'] as Role[]).map((r) => (
          <motion.button
            key={r}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setRole(r);
              setShowOtp(false);
              setEmail('');
              setPassword('');
            }}
            className={`relative overflow-hidden rounded-xl p-4 h-32 flex flex-col items-center justify-center gap-2.5 transition-all duration-300 border ${
              role === r 
                ? 'bg-gradient-to-br from-purple-600/50 to-purple-700/30 border-purple-400 shadow-[0_0_20px_-5px_rgba(168,85,247,0.6)] scale-105' 
                : 'bg-white/8 border-white/20 hover:bg-white/15 hover:border-white/40'
            } backdrop-blur-sm group cursor-pointer`}
          >
            {/* Background glow effect */}
            {role === r && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50" />
            )}
            
            <div className={`p-3 rounded-lg transition-all duration-300 ${role === r ? 'bg-purple-500/40 text-purple-200 shadow-lg shadow-purple-500/50' : 'bg-white/10 text-white/50 group-hover:bg-white/20 group-hover:text-white/70'}`}>
              {r === 'student' && <GraduationCap size={24} />}
              {r === 'driver' && <Car size={24} />}
              {r === 'admin' && <ShieldCheck size={24} />}
              {r === 'super_admin' && <Crown size={24} />}
            </div>
            
            <span className="text-xs font-bold capitalize text-white text-center leading-tight relative z-10">
              {r === 'super_admin' ? 'Super Admin' : r}
            </span>
            
            {/* Active indicator bar */}
            {role === r && (
              <motion.div 
                layoutId="active-indicator"
                className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-t-lg"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Auth Form Panel */}
      <motion.div 
        layout
        className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-2xl border border-white/15 rounded-2xl p-8 shadow-2xl"
      >
        <div>
          <h2 className="text-2xl font-bold text-white mb-1.5 text-center capitalize">
            {role === 'super_admin' ? 'Super Admin' : role} Login
          </h2>
          <p className="text-white/50 text-center text-sm mb-6">
            Access the Cavendish Bus Tracking System
          </p>

          <form onSubmit={role === 'student' && !showOtp ? handleSendOtp : handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                <Mail size={16} /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'student' ? 'ab123456@students.cavendish.co.zm' : 'firstname.lastname@cavendish.co.zm'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
              {role !== 'student' && (
                <p className="text-xs text-white/40 mt-1">Example: john.phiri@cavendish.co.zm</p>
              )}
            </div>

            {role !== 'student' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <Lock size={16} /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  required
                />
              </div>
            )}

            <AnimatePresence>
              {role === 'student' && showOtp && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <ShieldCheck size={16} /> 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    required
                  />
                  <p className="text-xs text-purple-400 text-center cursor-pointer hover:underline" onClick={() => setShowOtp(false)}>
                    Change email?
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {role === 'student' && !showOtp ? 'Send OTP' : 'Sign In'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
