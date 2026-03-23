export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
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

  const links = await DB.prepare(
    `SELECT s.*,
       k.name as api_key_name,
       k.is_revoked as key_revoked,
       (SELECT COUNT(*) FROM link_logs WHERE code = s.code) as clicks
     FROM short_links s
     LEFT JOIN api_keys k ON s.api_key_id = k.id
     WHERE s.user_id = ? ORDER BY s.created_at DESC`
  ).bind(authResult.userId).all();

  const linksWithDisabled = links.results.map((link: Record<string, unknown>) => ({
    ...link,
    disabled: link.api_key_id != null && link.key_revoked === 1,
    revoked: link.is_revoked === 1,
  }));

  return NextResponse.json(
    { links: linksWithDisabled },
    { headers: CORS_HEADERS }
  );
}