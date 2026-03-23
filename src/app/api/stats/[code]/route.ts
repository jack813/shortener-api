export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { CORS_HEADERS } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";
import { getUserPlan } from "@/lib/quota";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const env = getCloudflareEnv();
  const { DB } = env;

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  const { code } = await params;

  if (!code) {
    return new NextResponse("Missing code", { status: 400, headers: CORS_HEADERS });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const linkExists = await DB.prepare(
    `SELECT code FROM short_links WHERE code = ? AND user_id = ? LIMIT 1`
  ).bind(code, authResult.userId).first();

  if (!linkExists) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CORS_HEADERS });
  }

  const plan = await getUserPlan(env, authResult.userId);
  const isPro = plan === 'pro';

  const countRes = await DB.prepare(
    "SELECT COUNT(*) as total FROM link_logs WHERE code = ?"
  ).bind(code).first();
  const total = (countRes?.total as number) ?? 0;

  const countryRes = await DB.prepare(
    "SELECT country, COUNT(*) as count FROM link_logs WHERE code = ? AND country IS NOT NULL GROUP BY country ORDER BY count DESC"
  ).bind(code).all();

  const cityRes = await DB.prepare(
    "SELECT city, country, COUNT(*) as count FROM link_logs WHERE code = ? AND city IS NOT NULL GROUP BY city, country ORDER BY count DESC LIMIT 20"
  ).bind(code).all();

  const deviceRes = await DB.prepare(
    "SELECT device_type, COUNT(*) as count FROM link_logs WHERE code = ? AND device_type IS NOT NULL GROUP BY device_type"
  ).bind(code).all();

  const devices: { mobile: number; desktop: number; tablet: number } = { mobile: 0, desktop: 0, tablet: 0 };
  for (const row of deviceRes.results as Array<{ device_type: string; count: number }>) {
    if (row.device_type === 'mobile') devices.mobile = row.count;
    else if (row.device_type === 'desktop') devices.desktop = row.count;
    else if (row.device_type === 'tablet') devices.tablet = row.count;
  }

  const recentLogs = await DB.prepare(
    "SELECT ip, user_agent, referer, country, city, timestamp FROM link_logs WHERE code = ? ORDER BY timestamp DESC LIMIT 5"
  ).bind(code).all();

  if (!isPro) {
    return NextResponse.json({
      code,
      total,
      geography: {
        countries: countryRes.results as Array<{ country: string; count: number }>,
        cities: cityRes.results as Array<{ city: string; country: string; count: number }>,
      },
      devices,
      recent_logs: recentLogs.results,
      _meta: {
        plan: 'free',
        retention_days: 30,
      },
    }, { headers: CORS_HEADERS });
  }

  // Pro-only features
  const uniqueRes = await DB.prepare(
    "SELECT COUNT(DISTINCT visitor_hash) as unique_visitors FROM link_logs WHERE code = ? AND visitor_hash IS NOT NULL"
  ).bind(code).first();
  const uniqueVisitors = (uniqueRes?.unique_visitors as number) ?? 0;

  const browserRes = await DB.prepare(
    "SELECT browser, browser_version, COUNT(*) as count FROM link_logs WHERE code = ? AND browser IS NOT NULL GROUP BY browser, browser_version ORDER BY count DESC LIMIT 10"
  ).bind(code).all();

  const osRes = await DB.prepare(
    "SELECT os, os_version, COUNT(*) as count FROM link_logs WHERE code = ? AND os IS NOT NULL GROUP BY os, os_version ORDER BY count DESC LIMIT 10"
  ).bind(code).all();

  return NextResponse.json({
    code,
    total,
    unique_visitors: uniqueVisitors,
    geography: {
      countries: countryRes.results as Array<{ country: string; count: number }>,
      cities: cityRes.results as Array<{ city: string; country: string; count: number }>,
    },
    devices: {
      types: devices,
      browsers: browserRes.results as Array<{ browser: string; version: string; count: number }>,
      os: osRes.results as Array<{ os: string; version: string; count: number }>,
    },
    recent_logs: recentLogs.results,
    _meta: {
      plan: 'pro',
      retention_days: 365,
      export_url: `/api/stats/${code}/export`,
    },
  }, { headers: CORS_HEADERS });
}