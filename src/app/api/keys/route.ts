export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { checkApiKeyLimit } from "@/lib/quota";
import { createApiKey } from "@/lib/auth/api-key";
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
  const { DB } = env;
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: corsHeaders });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const keys = await DB.prepare(
    `SELECT id, key_prefix, name, created_at, last_used_at, is_revoked,
            (SELECT COUNT(*) FROM short_links WHERE api_key_id = api_keys.id) as link_count
     FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(authResult.userId).all();

  return NextResponse.json(
    { keys: keys.results },
    { headers: corsHeaders }
  );
}

export async function POST(request: Request) {
  const env = getCloudflareEnv();
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const apiKeyLimit = await checkApiKeyLimit(env, authResult.userId);
  if (!apiKeyLimit.allowed) {
    return NextResponse.json({ error: apiKeyLimit.error }, { status: 403, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const { name } = (body as { name?: string }) || {};
  const keyName = name || "Default Key";

  const { key, id } = await createApiKey(env, authResult.userId, keyName);

  return NextResponse.json(
    {
      id,
      key,
      name: keyName,
      created_at: new Date().toISOString(),
    },
    { status: 201, headers: corsHeaders }
  );
}