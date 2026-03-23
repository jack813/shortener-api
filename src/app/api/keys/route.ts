export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { checkApiKeyLimit } from "@/lib/quota";
import { createApiKey } from "@/lib/auth/api-key";
import { CORS_HEADERS } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

export async function GET(request: Request) {
  const env = getCloudflareEnv();
  const { DB } = env;

  if (!DB) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const keys = await DB.prepare(
    `SELECT id, key_prefix, name, created_at, last_used_at, is_revoked,
            (SELECT COUNT(*) FROM short_links WHERE api_key_id = api_keys.id) as link_count
     FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(authResult.userId).all();

  return NextResponse.json(
    { keys: keys.results },
    { headers: CORS_HEADERS }
  );
}

export async function POST(request: Request) {
  const env = getCloudflareEnv();

  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const apiKeyLimit = await checkApiKeyLimit(env, authResult.userId);
  if (!apiKeyLimit.allowed) {
    return NextResponse.json({ error: apiKeyLimit.error }, { status: 403, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
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
    { status: 201, headers: CORS_HEADERS }
  );
}