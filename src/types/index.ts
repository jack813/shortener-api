/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  ShortenerLinks: KVNamespace;
  DB: D1Database;
  LOGOS_BUCKET: R2Bucket;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET?: string;
}

/**
 * Session payload for JWT tokens
 */
export interface SessionPayload {
  userId: string;
  exp: number;
  iat?: number;
}

/**
 * User information
 */
export interface User {
  id: string;
  github_id: number;
  name: string | null;
  email: string | null;
  avatar: string | null;
  created_at: string;
}

/**
 * Short link record
 */
export interface ShortLink {
  id: number;
  user_id: string;
  code: string;
  url: string;
  expiration_at: string;
  created_at: string;
  is_custom: number;
  is_permanent: number;
  api_key_id: string | null;
  split_rules: string | null;
  is_revoked: number;
  redirect_type: string;
  default_url: string | null;
}

/**
 * API Key record
 */
export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_revoked: number;
  revoked_at: string | null;
}

/**
 * Link log record
 */
export interface LinkLog {
  id: number;
  code: string;
  ip: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  referer: string | null;
  timestamp: string;
  device_type: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visitor_hash: string | null;
  matched_rule_id: number | null;
}

/**
 * Split rule record
 */
export interface SplitRule {
  id: number;
  short_link_id: number;
  name: string;
  priority: number;
  target_url: string;
  is_active: number;
  created_at: string;
}

/**
 * Split condition record
 */
export interface SplitCondition {
  id: number;
  rule_id: number;
  dimension: string;
  operator: string;
  value: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  userId: string | null;
  apiKeyId?: string;
  error?: string;
  status?: number;
}