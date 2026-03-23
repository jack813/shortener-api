/**
 * Shared API utilities and constants
 */

import type { Env } from "@/types";

export const SHORTLINK_DOMAIN = "https://0x1.in";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Generate a random key for short links
 */
export function generateRandomKey(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique key for short links
 */
export async function generateUniqueKey(env: Env, maxAttempts = 5): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const key = generateRandomKey();
    const exists = await env.ShortenerLinks.get(key);
    if (!exists) return key;
  }
  throw new Error("Unable to generate unique key after several attempts");
}

/**
 * Validate custom code format
 */
export function validateCustomCode(code: string): { valid: boolean; error?: string } {
  // Length check (3-32 characters)
  if (code.length < 3 || code.length > 32) {
    return {
      valid: false,
      error: "Custom code must be 3-32 characters"
    };
  }

  // Character validation (only lowercase a-z, 0-9, -, _)
  const validPattern = /^[a-z0-9_-]+$/;
  if (!validPattern.test(code)) {
    return {
      valid: false,
      error: "Custom code can only contain lowercase letters (a-z), numbers (0-9), hyphens (-), and underscores (_)"
    };
  }

  // Reserved words check
  const reservedWords = [
    'api', 'admin', 'login', 'dashboard', 'auth', 'mcp',
    'docs', 'agent.md', 'root', 'system', 'config',
    'static', 'public', 'assets', 'images',
    'test', 'debug', 'dev', 'staging', 'prod',
    'null', 'undefined', 'true', 'false'
  ];

  if (reservedWords.includes(code.toLowerCase())) {
    return {
      valid: false,
      error: `Custom code '${code}' is reserved and cannot be used`
    };
  }

  return { valid: true };
}

/**
 * Create request type guard
 */
export interface CreateRequest {
  url: string;
  custom?: string;
  expire_days?: number;
  permanent?: boolean;
  split_rules?: unknown[];
}

export function isCreateRequest(data: unknown): data is CreateRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as CreateRequest).url === "string" &&
    (typeof (data as CreateRequest).custom === "undefined" ||
      typeof (data as CreateRequest).custom === "string") &&
    (typeof (data as CreateRequest).split_rules === "undefined" ||
      Array.isArray((data as CreateRequest).split_rules))
  );
}