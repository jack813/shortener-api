export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getUserPlan } from "@/lib/quota";
import { getCorsHeadersForOrigin } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const env = getCloudflareEnv();
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeadersForOrigin(origin);

  const authResult = await verifyAuth(request, env);
  if (!authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const plan = await getUserPlan(env, authResult.userId);
  if (plan !== 'pro') {
    return NextResponse.json({ error: 'Logo upload requires Pro plan' }, { status: 403, headers: corsHeaders });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 400, headers: corsHeaders });
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid format. Use PNG, JPG, or SVG' }, { status: 400, headers: corsHeaders });
  }

  const ext = file.name.split('.').pop() || 'png';
  const key = `${authResult.userId}/logo-${crypto.randomUUID()}.${ext}`;

  await env.LOGOS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });

  return NextResponse.json({ key, message: 'Logo uploaded successfully' }, { status: 200, headers: corsHeaders });
}