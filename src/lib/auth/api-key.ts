/**
 * API Key Authentication Module
 * Key format: sk_<32_random_chars>
 * Stored hash: SHA-256
 */

import type { Env } from "@/types";

export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'sk_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createApiKey(
  env: Env,
  userId: string,
  name: string
): Promise<{ key: string; id: string }> {
  const key = generateApiKey();
  const keyHash = await hashApiKey(key);
  const keyPrefix = key.substring(0, 7);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(id, userId, keyHash, keyPrefix, name).run();

  return { key, id };
}

export async function verifyApiKey(
  env: Env,
  key: string
): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!key.startsWith('sk_')) {
    return null;
  }

  const keyHash = await hashApiKey(key);

  const result = await env.DB.prepare(`
    SELECT user_id, id FROM api_keys WHERE key_hash = ? AND is_revoked = 0 LIMIT 1
  `).bind(keyHash).first<{ user_id: string; id: string }>();

  if (result) {
    await env.DB.prepare(`
      UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_hash = ?
    `).bind(keyHash).run();

    return { userId: result.user_id, apiKeyId: result.id };
  }

  return null;
}