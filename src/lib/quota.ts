/**
 * Quota Management Module
 * Handles user quota checking and enforcement for links, API keys, and split rules.
 */

import type { Env } from "@/types";
import { getQuotaLimit, DEFAULT_PLAN, type PlanType, type QuotaType } from "@/lib/config/pricing";

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

