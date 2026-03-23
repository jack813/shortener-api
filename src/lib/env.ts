/**
 * Environment helper for Cloudflare bindings
 *
 * In Next.js on Cloudflare Pages:
 * - Bindings (KV, D1, R2) are automatically injected into process.env
 * - Use getRequestContext() for request-specific context
 */
import type { Env } from "@/types";

/**
 * Get Cloudflare environment bindings
 *
 * For Pages Functions, bindings are available via:
 * 1. process.env (for KV, D1, R2 bindings)
 * 2. getRequestContext().env (alternative method)
 */
export function getCloudflareEnv(): Env {
  // In Cloudflare Pages, bindings are injected into process.env
  // The @cloudflare/next-on-pages adapter handles this mapping
  const env = process.env as unknown as Env;

  // Verify we have the required bindings
  if (env.DB && env.ShortenerLinks) {
    return env;
  }

  // Try getRequestContext as fallback (for edge cases)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRequestContext } = require('@cloudflare/next-on-pages');
    const ctx = getRequestContext();
    if (ctx?.env?.DB && ctx?.env?.ShortenerLinks) {
      return ctx.env;
    }
  } catch {
    // Not in Cloudflare runtime
  }

  // Check globalThis for local development
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (g.env?.DB && g.env?.ShortenerLinks) {
    return g.env;
  }

  // Return what we have - will fail with clear error if bindings missing
  return env;
}