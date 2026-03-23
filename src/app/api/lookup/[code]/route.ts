export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getCorsHeadersForOrigin } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const env = getCloudflareEnv();
  const { DB, ShortenerLinks } = env;
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  if (!DB || !ShortenerLinks) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: corsHeaders });
  }

  const { code } = await params;

  if (!code) {
    return new NextResponse("Missing code", { status: 400, headers: corsHeaders });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const dbRes = await DB.prepare(
    `SELECT url, expiration_at FROM short_links WHERE code = ? AND user_id = ? LIMIT 1`
  ).bind(code, authResult.userId).first<Record<string, unknown>>();

  if (!dbRes) {
    const exists = await DB.prepare(
      `SELECT code FROM short_links WHERE code = ? LIMIT 1`
    ).bind(code).first();

    if (exists) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }
    return new NextResponse("Not found", { status: 404, headers: corsHeaders });
  }

  const kvValue = await ShortenerLinks.getWithMetadata<string>(code, { type: "text" });
  const longUrl = kvValue?.value ?? null;
  const metadata = kvValue?.metadata as { expirationAt?: string } | undefined;
  const kvExpireAt = metadata?.expirationAt ?? null;

  return NextResponse.json(
    {
      code,
      long_url: dbRes.url,
      kv_exists: !!longUrl,
      kv_value: longUrl,
      expiration_at: dbRes.expiration_at,
      kv_expire_at: kvExpireAt,
    },
    { headers: corsHeaders }
  );
}