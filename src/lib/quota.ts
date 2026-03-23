/**
 * Quota Management Module
 * Handles user quota checking and enforcement for links, API keys, and split rules.
 */

import type { Env } from "@/types";
import { getPlanLimits, getQuotaLimit, getAllowedDimensions, DEFAULT_PLAN, type PlanType, type QuotaType } from "@/lib/config/pricing";

// Re-export QuotaType for backward compatibility
export type { QuotaType };

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

interface UserQuota {
  user_id: string;
  monthly_count: number;
  custom_count: number;
  permanent_count: number;
  current_month: string;
  updated_at: string;
  plan?: string;
  plan_expires_at?: number | null;
}

export async function getUserPlan(env: Env, userId: string): Promise<PlanType> {
  try {
    const result = await env.DB.prepare(
      `SELECT plan, plan_expires_at FROM user_quotas WHERE user_id = ?`
    ).bind(userId).first<{ plan: string | null; plan_expires_at: number | null }>();

    if (!result || !result.plan) {
      return DEFAULT_PLAN;
    }

    const plan = result.plan as PlanType;
    if (plan !== 'free' && plan !== 'pro') {
      return DEFAULT_PLAN;
    }

    if (plan === 'pro' && result.plan_expires_at) {
      const now = Date.now();
      if (now > result.plan_expires_at) {
        return DEFAULT_PLAN;
      }
    }

    return plan;
  } catch {
    return DEFAULT_PLAN;
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function initUserQuota(env: Env, userId: string): Promise<void> {
  const currentMonth = getCurrentMonth();

  await env.DB.prepare(
    `INSERT INTO user_quotas (user_id, monthly_count, custom_count, permanent_count, current_month, updated_at)
     VALUES (?, 0, 0, 0, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO NOTHING`
  ).bind(userId, currentMonth).run();
}

export async function checkQuota(
  env: Env,
  userId: string,
  type: QuotaType
): Promise<QuotaCheckResult> {
  const currentMonth = getCurrentMonth();
  const plan = await getUserPlan(env, userId);
  const limit = getQuotaLimit(plan, type);

  await initUserQuota(env, userId);

  const result = await env.DB.prepare(
    `SELECT monthly_count, custom_count, permanent_count, current_month
     FROM user_quotas WHERE user_id = ?`
  ).bind(userId).first<UserQuota>();

  if (!result) {
    return {
      allowed: true,
      remaining: limit,
    };
  }

  if (result.current_month !== currentMonth) {
    return {
      allowed: true,
      remaining: limit,
    };
  }

  let currentCount: number;
  switch (type) {
    case "monthly":
      currentCount = result.monthly_count;
      break;
    case "custom":
      currentCount = result.custom_count;
      break;
    case "permanent":
      currentCount = result.permanent_count;
      break;
  }

  const remaining = Math.max(0, limit - currentCount);

  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      error: `Quota exceeded for ${type} links. Limit: ${limit}`,
    };
  }

  return {
    allowed: true,
    remaining,
  };
}

export async function incrementQuota(
  env: Env,
  userId: string,
  type: QuotaType
): Promise<void> {
  const currentMonth = getCurrentMonth();

  await initUserQuota(env, userId);

  const quota = await env.DB.prepare(
    `SELECT current_month FROM user_quotas WHERE user_id = ?`
  ).bind(userId).first<{ current_month: string }>();

  if (!quota) {
    return;
  }

  if (quota.current_month !== currentMonth) {
    await env.DB.prepare(
      `UPDATE user_quotas
       SET monthly_count = 0, current_month = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).bind(currentMonth, userId).run();
  }

  const column = `${type}_count`;
  await env.DB.prepare(
    `UPDATE user_quotas SET ${column} = ${column} + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(userId).run();
}

export async function resetMonthlyQuotaIfNeeded(
  env: Env,
  userId: string
): Promise<boolean> {
  const currentMonth = getCurrentMonth();

  const result = await env.DB.prepare(
    `SELECT current_month FROM user_quotas WHERE user_id = ?`
  ).bind(userId).first<{ current_month: string }>();

  if (!result) {
    return false;
  }

  if (result.current_month !== currentMonth) {
    await env.DB.prepare(
      `UPDATE user_quotas
       SET monthly_count = 0, current_month = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).bind(currentMonth, userId).run();
    return true;
  }

  return false;
}

export async function getUserQuota(
  env: Env,
  userId: string
): Promise<{ monthly: number; custom: number; permanent: number; month: string; plan: PlanType } | null> {
  await initUserQuota(env, userId);

  const plan = await getUserPlan(env, userId);
  const limits = {
    monthly: getQuotaLimit(plan, 'monthly'),
    custom: getQuotaLimit(plan, 'custom'),
    permanent: getQuotaLimit(plan, 'permanent'),
  };

  const result = await env.DB.prepare(
    `SELECT monthly_count, custom_count, permanent_count, current_month
     FROM user_quotas WHERE user_id = ?`
  ).bind(userId).first<UserQuota>();

  if (!result) {
    return {
      monthly: limits.monthly,
      custom: limits.custom,
      permanent: limits.permanent,
      month: getCurrentMonth(),
      plan,
    };
  }

  return {
    monthly: limits.monthly - result.monthly_count,
    custom: limits.custom - result.custom_count,
    permanent: limits.permanent - result.permanent_count,
    month: result.current_month,
    plan,
  };
}

/**
 * Check if user can create a new API key based on their plan limits.
 */
export async function checkApiKeyLimit(
  env: Env,
  userId: string
): Promise<QuotaCheckResult> {
  try {
    const plan = await getUserPlan(env, userId);
    const limits = getPlanLimits(plan);
    const limit = limits.apiKeys;

    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM api_keys
      WHERE user_id = ? AND is_revoked = 0
    `).bind(userId).first<{ count: number }>();

    const currentCount = result?.count ?? 0;
    const remaining = Math.max(0, limit - currentCount);

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        error: `API key limit reached. Maximum ${limit} keys allowed on ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
      };
    }

    return {
      allowed: true,
      remaining,
    };
  } catch (error) {
    return {
      allowed: true,
      remaining: 0,
    };
  }
}

export interface SplitRuleLimitCheckResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

/**
 * Check if user can create more split rules for a specific link.
 */
export async function checkSplitRuleLimit(
  env: Env,
  userId: string,
  shortLinkId: number
): Promise<SplitRuleLimitCheckResult> {
  try {
    const plan = await getUserPlan(env, userId);
    const limits = getPlanLimits(plan);
    const limit = limits.splitRules;

    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM split_rules WHERE short_link_id = ?`
    ).bind(shortLinkId).first<{ count: number }>();

    const currentCount = result?.count ?? 0;
    const remaining = Math.max(0, limit - currentCount);

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        error: `Split rule limit reached (${limit} per link for ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan)`,
      };
    }

    return {
      allowed: true,
      remaining,
    };
  } catch (error) {
    return {
      allowed: true,
      remaining: 0,
    };
  }
}

export interface QrLimitCheckResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

/**
 * Check if user can create custom QR code settings.
 */
export async function checkQrLimit(
  env: Env,
  userId: string
): Promise<QrLimitCheckResult> {
  try {
    const plan = await getUserPlan(env, userId);
    const limits = getPlanLimits(plan);
    const limit = limits.qrCodes;

    if (limit === 0) {
      return {
        allowed: false,
        remaining: 0,
        error: 'QR customization requires Pro plan'
      };
    }

    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM qr_settings qs
      JOIN short_links sl ON qs.short_link_id = sl.id
      WHERE sl.user_id = ?
    `).bind(userId).first<{ count: number }>();

    const count = result?.count || 0;
    const remaining = limit - count;

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        error: 'QR limit reached. Maximum ' + limit + ' custom QR codes.'
      };
    }

    return { allowed: true, remaining };
  } catch (error) {
    return { allowed: true, remaining: 999 };
  }
}

export interface ConditionLimitResult {
  allowed: boolean;
  error?: string;
}

/**
 * Check if the number of conditions is within plan limits.
 */
export function checkConditionLimit(
  plan: PlanType,
  conditionCount: number
): ConditionLimitResult {
  const limits = getPlanLimits(plan);
  const limit = limits.conditionsPerRule;

  if (conditionCount > limit) {
    return {
      allowed: false,
      error: `Maximum ${limit} conditions per rule for ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan (you have ${conditionCount})`,
    };
  }

  return {
    allowed: true,
  };
}

export interface DimensionValidationResult {
  allowed: boolean;
  invalidDimensions: string[];
  error?: string;
}

/**
 * Validate that all condition dimensions are allowed for the user's plan.
 */
export function validateDimensionsForPlan(
  plan: PlanType,
  dimensions: string[]
): DimensionValidationResult {
  const allowedDimensions = getAllowedDimensions(plan);
  const allowedSet = new Set(allowedDimensions);

  const invalidDimensions = dimensions.filter(d => !allowedSet.has(d));

  if (invalidDimensions.length > 0) {
    return {
      allowed: false,
      invalidDimensions,
      error: `Dimensions [${invalidDimensions.join(', ')}] require Pro subscription`,
    };
  }

  return {
    allowed: true,
    invalidDimensions: [],
  };
}