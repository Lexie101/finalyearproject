/**
 * Complete Authentication System
 * Supabase + Nodemailer Integration
 * 
 * Core Functions:
 * - checkUserRole(email) - Check user role from profiles table
 * - createOTP(email) - Generate and store OTP (5 min expiry)
 * - verifyOTPCode(email, otp) - Validate OTP 
 * - createStudentProfile(email) - Create new student profile
 * - completeStudentProfile(email, data) - Update student details
 * - verifyPassword(email, password) - Password auth for admin/driver
 */

import { supabaseServer } from './supabase-server';
import { supabase } from './supabase';
import sendOtpEmail from './nodemailer';

// Constants
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_REQUESTS_PER_HOUR = 3;

export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'admin' | 'driver';
  full_name?: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
}

/**
 * Check user role by email
 */
export async function checkUserRole(email: string) {
  try {
    const { data, error } = await supabaseServer
      .from('profiles')
      .select('id, role, email, is_verified')
      .ilike('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[checkUserRole] Database error:', error);
      return { exists: false };
    }

    if (!data) {
      return { exists: false };
    }

    return {
      exists: true,
      role: data.role as string,
      user_id: data.id,
      is_verified: data.is_verified,
    };
  } catch (error) {
    console.error('[checkUserRole] Exception:', error);
    return { exists: false };
  }
}

/**
 * Generate and send OTP to student email
 */
export async function sendOTPEmail(email: string): Promise<string | null> {
  try {
    const normEmail = email.toLowerCase().trim();

    // Check rate limit - max 3 per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseServer
      .from('otp_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('email', normEmail)
      .gte('created_at', oneHourAgo)
      .eq('is_used', false);

    if (count && count >= MAX_OTP_REQUESTS_PER_HOUR) {
      throw new Error(`Too many OTP requests. Try again in 1 hour.`);
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Store OTP in database
    const { error } = await supabaseServer
      .from('otp_verifications')
      .insert([
        {
          email: normEmail,
          otp_code: otpCode,
          expires_at: expiresAt,
          is_used: false,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('[sendOTPEmail] Insert error:', error);
      throw new Error('Failed to generate OTP');
    }

    // Send OTP via email
    try {
      await sendOtpEmail(normEmail, otpCode);
      console.info(`[sendOTPEmail] OTP sent to ${normEmail}`);
    } catch (emailError) {
      console.error('[sendOTPEmail] Email error:', emailError);
      // Continue - OTP is stored even if email fails
    }

    return otpCode;
  } catch (error) {
    console.error('[sendOTPEmail] Error:', error);
    throw error;
  }
}

/**
 * Verify OTP code from email
 */
export async function verifyOTPCode(email: string, otpCode: string): Promise<boolean> {
  try {
    const normEmail = email.toLowerCase().trim();

    // Get latest unused OTP for this email
    const { data, error } = await supabaseServer
      .from('otp_verifications')
      .select('*')
      .eq('email', normEmail)
      .eq('otp_code', otpCode)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[verifyOTPCode] Query error:', error);
      return false;
    }

    if (!data) {
      console.warn(`[verifyOTPCode] No OTP found for ${normEmail}`);
      return false;
    }

    // Check if OTP has expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      console.warn(`[verifyOTPCode] OTP expired for ${normEmail}`);
      // Mark as used
      await supabaseServer
        .from('otp_verifications')
        .update({ is_used: true })
        .eq('id', data.id);
      return false;
    }

    // Mark OTP as used
    const { error: updateError } = await supabaseServer
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', data.id);

    if (updateError) {
      console.error('[verifyOTPCode] Update error:', updateError);
      return false;
    }

    console.info(`[verifyOTPCode] OTP verified for ${normEmail}`);
    return true;
  } catch (error) {
    console.error('[verifyOTPCode] Exception:', error);
    return false;
  }
}

/**
 * Create new student profile after OTP verification
 */
export async function createStudentProfile(email: string): Promise<UserProfile | null> {
  try {
    const normEmail = email.toLowerCase().trim();

    // Check if profile already exists
    const existing = await checkUserRole(normEmail);
    if (existing.exists) {
      // Get full profile
      const { data } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('email', normEmail)
        .maybeSingle();
      
      if (data) {
        return data as UserProfile;
      }
    }

    // Create new student profile
    const { data, error } = await supabaseServer
      .from('profiles')
      .insert([
        {
          email: normEmail,
          role: 'student',
          is_verified: true,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('[createStudentProfile] Insert error:', error);
      return null;
    }

    console.info(`[createStudentProfile] Profile created for ${normEmail}`);
    return data as UserProfile;
  } catch (error) {
    console.error('[createStudentProfile] Exception:', error);
    return null;
  }
}

/**
 * Complete student profile with additional information
 */
export async function completeStudentProfile(
  email: string,
  data: { full_name: string; phone?: string }
): Promise<UserProfile | null> {
  try {
    const normEmail = email.toLowerCase().trim();

    const { data: updated, error } = await supabaseServer
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
      })
      .eq('email', normEmail)
      .eq('role', 'student')
      .select('*')
      .single();

    if (error) {
      console.error('[completeStudentProfile] Update error:', error);
      return null;
    }

    console.info(`[completeStudentProfile] Profile updated for ${normEmail}`);
    return updated as UserProfile;
  } catch (error) {
    console.error('[completeStudentProfile] Exception:', error);
    return null;
  }
}

/**
 * Verify admin/driver password with Supabase Auth
 */
export async function verifyPassword(
  email: string,
  password: string,
  expectedRole?: 'admin' | 'driver'
): Promise<{ success: boolean; user?: Record<string, unknown>; profile?: UserProfile }> {
  try {
    const normEmail = email.toLowerCase().trim();

    // First, verify with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normEmail,
      password,
    });

    if (error) {
      console.error('[verifyPassword] Auth error:', error);
      return { success: false };
    }

    if (!data.user) {
      return { success: false };
    }

    // Get user profile and verify role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('email', normEmail)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('[verifyPassword] Profile error:', profileError);
      return { success: false };
    }

    // Check role if specified
    if (expectedRole && profile.role !== expectedRole) {
      console.warn(
        `[verifyPassword] Role mismatch: expected ${expectedRole}, got ${profile.role}`
      );
      return { success: false };
    }

    console.info(`[verifyPassword] Password verified for ${normEmail}`);
    return {
      success: true,
      user: data.user as unknown as Record<string, unknown>,
      profile: profile as UserProfile,
    };
  } catch (error) {
    console.error('[verifyPassword] Exception:', error);
    return { success: false };
  }
}

/**
 * Get user profile by email
 */
export async function getUserProfile(email: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabaseServer
      .from('profiles')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('[getUserProfile] Error:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('[getUserProfile] Exception:', error);
    return null;
  }
}

