export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { CORS_HEADERS } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = getCloudflareEnv();
  const { DB } = env;

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  const { id: keyId } = await params;

  if (!keyId) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400, headers: CORS_HEADERS });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const result = await DB.prepare(
    `UPDATE api_keys SET is_revoked = 1, revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`
  ).bind(keyId, authResult.userId).run();

  if (result.meta.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = getCloudflareEnv();
  const { DB } = env;

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  const { id: keyId } = await params;

  if (!keyId) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400, headers: CORS_HEADERS });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { name } = (body as { name?: string }) || {};

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Invalid name" }, { status: 400, headers: CORS_HEADERS });
  }

  const result = await DB.prepare(
    `UPDATE api_keys SET name = ? WHERE id = ? AND user_id = ?`
  ).bind(name.trim(), keyId, authResult.userId).run();

  if (result.meta.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json(
    { success: true, id: keyId, name: name.trim() },
    { headers: CORS_HEADERS }
  );
}