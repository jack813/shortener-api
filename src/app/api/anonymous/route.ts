export const runtime = 'edge';
import { NextResponse } from "next/server";
import { generateUniqueKey, SHORTLINK_DOMAIN, CORS_HEADERS } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

export async function POST(request: Request) {
  const env = getCloudflareEnv();
  const { ShortenerLinks } = env;

  if (!ShortenerLinks) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { url: longUrl } = (body as { url?: string }) || {};

  if (!longUrl || typeof longUrl !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    new URL(longUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400, headers: CORS_HEADERS });
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
    { status: 201, headers: CORS_HEADERS }
  );
}