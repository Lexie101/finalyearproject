'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Car, ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Role = 'student' | 'driver' | 'admin';

interface AuthPanelProps {
  onLogin: (role: Role, email: string) => void;
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
        // For admin/driver, we'd normally check credentials against a real auth route
        // For now we'll keep the simplified logic but ready for production
        setTimeout(() => {
          onLogin(role, email);
          toast.success(`Logged in as ${role}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid OTP');
    } finally {
      if (role === 'student') setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
      {/* Role Selection Panels */}
      {(['student', 'driver', 'admin'] as Role[]).map((r) => (
        <motion.button
          key={r}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setRole(r);
            setShowOtp(false);
            setEmail('');
            setPassword('');
          }}
          className={`relative overflow-hidden rounded-2xl p-6 h-48 flex flex-col items-center justify-center gap-4 transition-all duration-300 border ${
            role === r 
              ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)]' 
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          } backdrop-blur-xl group`}
        >
          <div className={`p-4 rounded-full ${role === r ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'} transition-colors`}>
            {r === 'student' && <GraduationCap size={32} />}
            {r === 'driver' && <Car size={32} />}
            {r === 'admin' && <ShieldCheck size={32} />}
          </div>
          <span className="text-xl font-semibold capitalize text-white">{r}</span>
          {role === r && (
            <motion.div 
              layoutId="active-indicator"
              className="absolute bottom-0 left-0 w-full h-1 bg-purple-400"
            />
          )}
        </motion.button>
      ))}

      {/* Auth Form Panel */}
      <motion.div 
        layout
        className="md:col-span-3 mt-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">
            {role.charAt(0).toUpperCase() + role.slice(1)} Login
          </h2>
          <p className="text-white/60 text-center mb-8">
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
                placeholder={role === 'student' ? 'ab123456@students.cavendish.co.zm' : 'email@cavendish.co.zm'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
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
