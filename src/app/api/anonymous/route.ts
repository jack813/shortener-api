export const runtime = 'edge';
import { NextResponse } from "next/server";
import { generateUniqueKey, SHORTLINK_DOMAIN, getCorsHeadersForOrigin } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const env = getCloudflareEnv();
  const { ShortenerLinks } = env;
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  if (!ShortenerLinks) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const { url: longUrl } = (body as { url?: string }) || {};

  if (!longUrl || typeof longUrl !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400, headers: corsHeaders });
  }

  try {
    new URL(longUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400, headers: corsHeaders });
  }

  const key = await generateUniqueKey(env);

  await ShortenerLinks.put(key, longUrl, {
    expirationTtl: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json(
    {
      short_url: `${SHORTLINK_DOMAIN}/${key}`,
      expires_in_days: 7
    },
    { status: 201, headers: corsHeaders }
  );
}