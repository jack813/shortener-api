/**
 * Redirect Loop Detection Module
 *
 * Prevents circular redirects by validating that target URLs
 * don't point to other short links in our system.
 */

import type { Env } from "@/types";

const SHORT_LINK_DOMAINS = [
  "0x1.in",
  "www.0x1.in",
  "shortener.0x1.in",
];

/**
 * Check if a code exists in the short_links table
 */
export async function isShortLinkCode(code: string, env: Env): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT code FROM short_links WHERE code = ? LIMIT 1"
  )
    .bind(code)
    .first<{ code: string }>();

  return result !== null;
}

/**
 * Extract potential short link code from a URL
 */
function extractShortLinkCode(url: string): string | null {
  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname.toLowerCase();
    if (!SHORT_LINK_DOMAINS.includes(hostname)) {
      return null;
    }

    const path = parsed.pathname.slice(1);

    if (!path || path.includes("/")) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

/**
 * Validate that a target URL doesn't create a redirect loop
 */
export async function validateTargetUrl(
  targetUrl: string,
  shortLinkCode: string,
  env: Env
): Promise<{ valid: boolean; error?: string }> {
  const targetCode = extractShortLinkCode(targetUrl);

  if (!targetCode) {
    return { valid: true };
  }

  const isExistingCode = await isShortLinkCode(targetCode, env);

  if (!isExistingCode) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Redirect loop detected: target URL points to another short link in this system",
  };
}

/**
 * Export for testing
 */
export const _internal = {
  SHORT_LINK_DOMAINS,
  extractShortLinkCode,
};