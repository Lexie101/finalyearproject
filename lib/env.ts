/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are set on startup
 */

// Required for all environments
const requiredEnvVars = [
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// Optional but recommend for production
const productionEnvVars = [
  "REDIS_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
] as const;

// Check required environment variables
export function validateEnvironment() {
  const missing: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (isProduction) {
    for (const envVar of productionEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`⚠️  Missing recommended production variable: ${envVar}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Get environment variable with type safety
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value || defaultValue || "";
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

// Check if in development
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

// Check if in production
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

// Validate on server startup (only in Node.js environment)
if (typeof window === "undefined") {
  // Only validate in server-side code
  try {
    validateEnvironment();
  } catch (error) {
    if (!isDevelopment()) {
      throw error;
    }
    console.warn("Environment validation warnings (development mode):", error);
  }
}
