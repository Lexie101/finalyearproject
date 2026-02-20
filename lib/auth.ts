/**
 * Session Management Module
 * Handles JWT-style session signing and verification using HMAC
 * Uses Web Crypto API for Edge Runtime compatibility
 * 
 * Session Format: base64.hmac_signature
 * Payload: { email, role, iat (timestamp) }
 */

// Get session secret from environment, require it in production
const COOKIE_SECRET = process.env.COOKIE_SECRET;

if (!COOKIE_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "COOKIE_SECRET environment variable is required in production"
    );
  }
  console.warn(
    "[Auth] COOKIE_SECRET not set, using insecure default for development only"
  );
}

const SECRET_KEY = COOKIE_SECRET || "dev_insecure_secret_change_in_production";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate HMAC signature using Web Crypto API
 * @param message - The message to sign
 * @returns Hex-encoded HMAC signature
 */
async function generateHmac(message: string): Promise<string> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      stringToArrayBuffer(SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      stringToArrayBuffer(message)
    );

    return arrayBufferToHex(signature);
  } catch (error) {
    console.error("[Auth] HMAC generation failed:", error);
    throw new Error("Failed to generate HMAC");
  }
}

/**
 * Verify HMAC signature using Web Crypto API
 * @param message - The message that was signed
 * @param signature - The hex-encoded signature
 * @returns True if signature is valid
 */
async function verifyHmac(message: string, signature: string): Promise<boolean> {
  try {
    const expected = await generateHmac(message);
    
    // Timing-safe comparison using constant-time algorithm
    const expectedBytes = new TextEncoder().encode(expected);
    const providedBytes = new TextEncoder().encode(signature);
    
    if (expectedBytes.length !== providedBytes.length) {
      return false;
    }
    
    let diff = 0;
    for (let i = 0; i < expectedBytes.length; i++) {
      diff |= expectedBytes[i] ^ providedBytes[i];
    }
    
    return diff === 0;
  } catch (error) {
    console.error("[Auth] HMAC verification failed:", error);
    return false;
  }
}

/**
 * Session payload structure
 */
export interface SessionPayload {
  email: string;
  role: string;
  userId?: string | number;
  iat?: number; // issued-at timestamp
}

/**
 * Session payload with required userId (for internal use)
 */
export interface SessionPayloadWithUserId extends SessionPayload {
  userId: string | number;
}

/**
 * Sign a session payload into a secure token
 * Creates HMAC signature to prevent tampering
 * NOTE: This is now async due to Web Crypto API requirements
 * 
 * @param payload - The session data to sign
 * @returns Signed token in format: "base64.signature"
 * @throws Error if signing fails
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const body = {
      ...payload,
      iat: payload.iat || now,
    };

    // Encode payload as base64
    const encoded = Buffer.from(JSON.stringify(body)).toString("base64");

    // Create HMAC signature
    const hmac = await generateHmac(encoded);

    return `${encoded}.${hmac}`;
  } catch (error) {
    console.error("[Auth] Session signing failed:", error);
    throw new Error("Failed to sign session");
  }
}

/**
 * Create a session token - alias for signSession
 * @param payload - The session data to sign
 * @returns Signed session token
 */
export async function createSession(payload: SessionPayload): Promise<string> {
  return signSession(payload);
}

/**
 * Verify a session token and extract payload
 * Uses timing-safe comparison to prevent timing attacks
 * NOTE: This is now async due to Web Crypto API requirements
 * 
 * @param cookieValue - The signed session token
 * @returns Session payload if valid, null if invalid
 */
export async function verifySession(cookieValue?: string | null): Promise<SessionPayload | null> {
  if (!cookieValue || typeof cookieValue !== "string") {
    return null;
  }

  try {
    // Split token into parts
    const parts = cookieValue.split(".");
    if (parts.length !== 2) {
      console.warn("[Auth] Invalid session format");
      return null;
    }

    const [encoded, signature] = parts;

    // Verify signature
    const isValid = await verifyHmac(encoded, signature);

    if (!isValid) {
      console.warn("[Auth] Invalid session signature");
      return null;
    }

    // Decode and parse payload
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;

    // Optionally validate age (7 days max)
    if (payload.iat) {
      const age = Math.floor(Date.now() / 1000) - payload.iat;
      if (age > SESSION_MAX_AGE) {
        console.warn("[Auth] Session expired");
        return null;
      }
    }

    return payload;
  } catch (error) {
    console.warn("[Auth] Session verification failed:", error);
    return null;
  }
}

/**
 * Check if session is about to expire (within 1 day)
 */
export function isSessionExpiringSoon(payload: SessionPayload): boolean {
  if (!payload.iat) return false;

  const age = Math.floor(Date.now() / 1000) - payload.iat;
  const remaining = SESSION_MAX_AGE - age;
  const oneDay = 60 * 60 * 24;

  return remaining < oneDay;
}