/**
 * Traffic Quota Management
 *
 * Handles monthly traffic counting and quota checking.
 * Traffic data is stored in KV with TTL of ~33 days.
 */

import type { Env } from "@/types";
import { getTrafficLimit } from "@/lib/config/pricing";
import type { PlanType } from "@/lib/config/pricing";

/**
 * TTL for KV traffic entries: ~33 days to cover a full month plus buffer
 */
const TRAFFIC_TTL_SECONDS = 86400 * 33;

/**
 * Get the current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Check if a plan is a paid plan
 */
export function isPaidUser(plan: string): boolean {
  return plan === "pro";
}

/**
 * Check traffic quota for a user
 */
export async function checkTrafficQuota(
  env: Env,
  userId: string,
  plan: PlanType
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const month = getCurrentMonth();
  const key = `traffic:${userId}:${month}`;
  const limit = getTrafficLimit(plan);

  try {
    const value = await env.ShortenerLinks.get(key);
    const used = value ? parseInt(value, 10) : 0;

    // If NaN or invalid, treat as 0
    const validUsed = Number.isNaN(used) ? 0 : used;
    const remaining = Math.max(0, limit - validUsed);

    return {
      allowed: validUsed < limit,
      used: validUsed,
      limit,
      remaining,
    };
  } catch {
    // On error, allow traffic (fail open)
    return {
      allowed: true,
      used: 0,
      limit,
      remaining: limit,
    };
  }
}

/**
 * Get current traffic usage for a user
 */
export async function getTrafficUsage(env: Env, userId: string): Promise<number> {
  const month = getCurrentMonth();
  const key = `traffic:${userId}:${month}`;

  try {
    const value = await env.ShortenerLinks.get(key);
    if (!value) return 0;

    const count = parseInt(value, 10);
    return Number.isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

/**
 * Get traffic usage for a specific link
 */
export async function getLinkTrafficUsage(
  env: Env,
  userId: string,
  code: string
): Promise<number> {
  const month = getCurrentMonth();
  const key = `traffic:${userId}:${month}:${code}`;

  try {
    const value = await env.ShortenerLinks.get(key);
    if (!value) return 0;

    const count = parseInt(value, 10);
    return Number.isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

/**
 * Get the reset time (first of next month) in ISO format
 */
export function getResetTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Calculate next month (0-indexed, so 11 = December)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  // Return first of next month at midnight UTC
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01T00:00:00Z`;
}

/**
 * Increment traffic counters for a user and link.
 * Updates both user total and link-specific counters.
 *
 * IMPORTANT: This uses read-modify-write which is NOT atomic.
 * Under high concurrency, some increments may be lost. This is
 * acceptable for quota tracking (not billing) - occasional
 * undercounting is preferable to blocking requests.
 */
export async function incrementTraffic(
  env: Env,
  userId: string,
  code: string,
  count: number = 1
): Promise<void> {
  // Validate count is positive
  if (count <= 0) {
    return;
  }

  const month = getCurrentMonth();
  const userKey = `traffic:${userId}:${month}`;
  const linkKey = `traffic:${userId}:${month}:${code}`;

  try {
    // Increment user total
    const userValue = await env.ShortenerLinks.get(userKey);
    const userCount = userValue ? parseInt(userValue, 10) : 0;
    const newUserCount = (Number.isNaN(userCount) ? 0 : userCount) + count;
    await env.ShortenerLinks.put(userKey, newUserCount.toString(), {
      expirationTtl: TRAFFIC_TTL_SECONDS,
    });

    // Increment link-specific counter
    const linkValue = await env.ShortenerLinks.get(linkKey);
    const linkCount = linkValue ? parseInt(linkValue, 10) : 0;
    const newLinkCount = (Number.isNaN(linkCount) ? 0 : linkCount) + count;
    await env.ShortenerLinks.put(linkKey, newLinkCount.toString(), {
      expirationTtl: TRAFFIC_TTL_SECONDS,
    });
  } catch (error) {
    console.error("[TrafficQuota] Failed to increment traffic:", error);
  }
}