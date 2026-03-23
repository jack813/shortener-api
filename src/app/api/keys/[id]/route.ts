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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = getCloudflareEnv();
  const { DB } = env;
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: corsHeaders });
  }

  const { id: keyId } = await params;

  if (!keyId) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400, headers: corsHeaders });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const result = await DB.prepare(
    `UPDATE api_keys SET is_revoked = 1, revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`
  ).bind(keyId, authResult.userId).run();

  if (result.meta.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = getCloudflareEnv();
  const { DB } = env;
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: corsHeaders });
  }

  const { id: keyId } = await params;

  if (!keyId) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400, headers: corsHeaders });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const { name } = (body as { name?: string }) || {};

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Invalid name" }, { status: 400, headers: corsHeaders });
  }

  const result = await DB.prepare(
    `UPDATE api_keys SET name = ? WHERE id = ? AND user_id = ?`
  ).bind(name.trim(), keyId, authResult.userId).run();

  if (result.meta.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(
    { success: true, id: keyId, name: name.trim() },
    { headers: corsHeaders }
  );
}