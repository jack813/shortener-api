export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { CORS_HEADERS } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

export async function GET(request: Request) {
  const env = getCloudflareEnv();
  const { DB } = env;

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  // Check for session cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
  const sessionToken = sessionMatch?.[1];

  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: CORS_HEADERS });
  }

  const userId = await verifySessionToken(env, sessionToken);

  if (!userId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401, headers: CORS_HEADERS });
  }

  const user = await DB.prepare(
    "SELECT id, name, email, avatar FROM users WHERE id = ? LIMIT 1"
  ).bind(userId).first<{ id: string; name: string; email: string; avatar: string }>();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json({ user }, { headers: CORS_HEADERS });
}