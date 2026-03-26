export const runtime = 'edge';

import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getUserPlan } from "@/lib/quota";
import { getCorsHeadersForOrigin } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";
import { checkTrafficQuota, getResetTime, getLinkTrafficUsage } from "@/lib/traffic-quota";

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Get link traffic details (paginated)
 * GET /api/traffic/links?page=1&limit=50
 */
export async function GET(request: Request) {
  const env = getCloudflareEnv();
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    const plan = await getUserPlan(env, authResult.userId);
    const quota = await checkTrafficQuota(env, authResult.userId, plan);

    // Get paginated links from D1
    const linksResult = await env.DB.prepare(
      `
      SELECT code, url FROM short_links
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(authResult.userId, limit, offset)
      .all<{ code: string; url: string }>();

    // Get total count
    const countResult = await env.DB.prepare(
      `
      SELECT COUNT(*) as count FROM short_links WHERE user_id = ?
    `
    )
      .bind(authResult.userId)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Batch get traffic from KV
    const linksWithTraffic = await Promise.all(
      linksResult.results.map(async (link) => {
        const traffic = await getLinkTrafficUsage(env, authResult.userId!, link.code);
        return {
          code: link.code,
          url: link.url,
          traffic,
        };
      })
    );

    return NextResponse.json(
      {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
        plan,
        resetAt: getResetTime(),
        links: linksWithTraffic,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[TrafficAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to get traffic links" },
      { status: 500, headers: corsHeaders }
    );
  }
}