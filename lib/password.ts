/**
 * Password Security Module
 * Uses bcryptjs for secure password hashing and validation
 * 
 * IMPORTANT: This should only be used on the server side
 * Never expose password hashes to the client
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcryptjs
 * @param password - The plain text password to hash
 * @returns The bcrypt hash string
 * @throws Error if password is empty or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    throw new Error("Password must be less than 128 characters");
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error("[Password] Hashing failed:", error);
    throw new Error("Failed to hash password");
  }
}

/**
 * Compare a plain text password against a bcrypt hash
 * @param password - The plain text password to check
 * @param hash - The bcrypt hash to compare against
 * @returns True if passwords match, false otherwise
 * @throws Error if comparison fails
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || typeof password !== "string") {
    console.warn("[Password] Invalid password format for comparison");
    return false;
  }

  if (!hash || typeof hash !== "string") {
    console.warn("[Password] Invalid hash format for comparison");
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error("[Password] Comparison failed:", error);
    return false;
  }
}

/**
 * Check if a hash is already bcrypted (starts with $2a$, $2b$, or $2y$)
 * Used to validate that we're working with proper hashes
 */
export function isValidBcryptHash(hash: string): boolean {
  if (!hash || typeof hash !== "string") return false;
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}
