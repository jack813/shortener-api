export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getUserQuota, getUserPlan } from "@/lib/quota";
import { getPlanLimits, getAllowedDimensions } from "@/lib/config/pricing";
import { getCorsHeadersForOrigin } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const env = getCloudflareEnv();
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const plan = await getUserPlan(env, authResult.userId);
  const limits = getPlanLimits(plan);
  const allowedDimensions = getAllowedDimensions(plan);

  const quota = await getUserQuota(env, authResult.userId);

  const usage = {
    monthly: limits.monthlyLinks - (quota?.monthly || 0),
    custom: limits.customLinks - (quota?.custom || 0),
    permanent: limits.permanentLinks - (quota?.permanent || 0),
  };

  return NextResponse.json({
    plan,
    limits: {
      monthlyLinks: limits.monthlyLinks,
      customLinks: limits.customLinks,
      permanentLinks: limits.permanentLinks,
      apiKeys: limits.apiKeys,
      splitRules: limits.splitRules,
      conditionsPerRule: limits.conditionsPerRule,
      dataRetentionDays: limits.dataRetentionDays,
      qrCodes: limits.qrCodes,
    },
    usage,
    allowedDimensions,
  }, { headers: corsHeaders });
}