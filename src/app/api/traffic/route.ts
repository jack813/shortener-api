export const runtime = 'edge';

import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getUserPlan } from "@/lib/quota";
import { getCorsHeadersForOrigin } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";
import { checkTrafficQuota, getResetTime } from "@/lib/traffic-quota";

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Get traffic overview
 * GET /api/traffic
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
    const plan = await getUserPlan(env, authResult.userId);
    const quota = await checkTrafficQuota(env, authResult.userId, plan);

    return NextResponse.json(
      {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
        plan,
        resetAt: getResetTime(),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[TrafficAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to get traffic overview" },
      { status: 500, headers: corsHeaders }
    );
  }
}