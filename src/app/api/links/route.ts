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
    { headers: corsHeaders }
  );
}