/**
 * Authentication Middleware
 * Provides token verification for API requests
 */

import type { Env, SessionPayload, AuthResult } from "@/types";
import { verifyApiKey } from "./api-key";

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1] || null;
}

/**
 * Verify Bearer token from Authorization header
 * Checks if token is valid API Key or Session Token
 */
export async function verifyBearerToken(
  env: Env,
  authHeader: string | null
): Promise<AuthResult> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      userId: null,
      error: "Missing Authorization header",
      status: 401,
    };
  }

  // First check if it's an API Key (starts with "sk_")
  if (token.startsWith("sk_")) {
    const keyResult = await verifyApiKey(env, token);
    if (keyResult) {
      return { userId: keyResult.userId, apiKeyId: keyResult.apiKeyId };
    }
  }

  // Try as Session Token
  const userId = await verifySessionToken(env, token);
  if (userId) {
    return { userId };
  }

  return {
    userId: null,
    error: "Invalid token",
    status: 401,
  };
}

/**
 * Verify Session Token (JWT)
 * Uses crypto.subtle to verify HMAC-SHA256 signature
 */
export async function verifySessionToken(
  env: Env,
  token: string
): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signature] = parts;

    const jwtSecret = getJwtSecret(env);

    // Verify signature
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const isValid = await verifyHmacSignature(jwtSecret, signatureInput, signature);

    if (!isValid) {
      return null;
    }

    // Decode and validate payload
    const payload = decodePayload<SessionPayload>(payloadEncoded);
    if (!payload) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload.userId || null;
  } catch (error) {
    console.error("Session token verification error:", error);
    return null;
  }
}

/**
 * Combined auth verification
 */
export async function verifyAuth(
  request: Request,
  env: Env
): Promise<AuthResult> {
  // 1. Check Authorization header (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    return verifyBearerToken(env, authHeader);
  }

  // 2. Check Cookie for session token
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
  const sessionToken = sessionMatch?.[1];

  if (!sessionToken) {
    return { userId: null };
  }

  const userId = await verifySessionToken(env, sessionToken);
  return { userId };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify HMAC-SHA256 signature
 */
async function verifyHmacSignature(
  secret: string,
  message: string,
  expectedSignature: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  // Convert to base64url
  const actualSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Timing-safe comparison
  return timingSafeEqual(actualSignature, expectedSignature);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Decode base64 payload
 */
function decodePayload<T>(encoded: string): T | null {
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const decoded = atob(base64);
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

/**
 * Get JWT secret from environment
 */
function getJwtSecret(env: Env): string {
  return env.JWT_SECRET || "development-secret-change-in-production";
}