export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { CORS_HEADERS } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const env = getCloudflareEnv();
  const { DB, ShortenerLinks } = env;

  if (!DB || !ShortenerLinks) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400, headers: CORS_HEADERS });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const link = await DB.prepare(
    `SELECT id FROM short_links WHERE code = ? AND user_id = ? LIMIT 1`
  ).bind(code, authResult.userId).first<{ id: number }>();

  if (!link) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 403, headers: CORS_HEADERS });
  }

  await ShortenerLinks.delete(code);

  await DB.prepare(
    `DELETE FROM short_links WHERE code = ? AND user_id = ?`
  ).bind(code, authResult.userId).run();

  return NextResponse.json(
    { success: true, code },
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const env = getCloudflareEnv();
  const { DB, ShortenerLinks } = env;

  if (!DB || !ShortenerLinks) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400, headers: CORS_HEADERS });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const link = await DB.prepare(
    `SELECT id, split_rules FROM short_links WHERE code = ? AND user_id = ? LIMIT 1`
  ).bind(code, authResult.userId).first<{ id: number; split_rules: string | null }>();

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { split_rules, target_url, redirect_type, default_url, revoked } = (body as {
    split_rules?: unknown;
    target_url?: string;
    redirect_type?: string;
    default_url?: string;
    revoked?: boolean;
  }) || {};

  // Handle split_rules update
  if (split_rules !== undefined) {
    if (!Array.isArray(split_rules)) {
      return NextResponse.json({ error: "split_rules must be an array" }, { status: 400, headers: CORS_HEADERS });
    }

    try {
      await DB.prepare(
        `UPDATE short_links SET split_rules = ? WHERE code = ? AND user_id = ?`
      ).bind(JSON.stringify(split_rules), code, authResult.userId).run();
    } catch (error) {
      console.error("Failed to update split_rules:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500, headers: CORS_HEADERS });
    }
  }

  // Handle other field updates
  const updates: string[] = [];
  const values: unknown[] = [];

  if (target_url !== undefined) {
    try {
      new URL(target_url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400, headers: CORS_HEADERS });
    }
    updates.push("url = ?");
    values.push(target_url);
  }

  if (default_url !== undefined) {
    try {
      new URL(default_url);
    } catch {
      return NextResponse.json({ error: "Invalid default_url format" }, { status: 400, headers: CORS_HEADERS });
    }
    updates.push("default_url = ?");
    values.push(default_url);
  }

  if (redirect_type !== undefined) {
    if (redirect_type !== "301" && redirect_type !== "302") {
      return NextResponse.json({ error: "redirect_type must be '301' or '302'" }, { status: 400, headers: CORS_HEADERS });
    }
    updates.push("redirect_type = ?");
    values.push(redirect_type);
  }

  if (revoked === true) {
    updates.push("is_revoked = 1");
  }

  if (updates.length > 0) {
    values.push(code, authResult.userId);
    await DB.prepare(
      `UPDATE short_links SET ${updates.join(", ")} WHERE code = ? AND user_id = ?`
    ).bind(...values).run();

    // Update KV if target_url changed
    if (target_url !== undefined) {
      const linkInfo = await DB.prepare(
        `SELECT expiration_at FROM short_links WHERE code = ? LIMIT 1`
      ).bind(code).first<{ expiration_at: string }>();

      if (linkInfo) {
        const expirationDate = new Date(linkInfo.expiration_at);
        const ttlSeconds = Math.max(1, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
        await ShortenerLinks.put(code, target_url, {
          expirationTtl: ttlSeconds,
          metadata: { expirationAt: linkInfo.expiration_at },
        });
      }
    }
  }

  return NextResponse.json(
    { success: true },
    { headers: CORS_HEADERS }
  );
}