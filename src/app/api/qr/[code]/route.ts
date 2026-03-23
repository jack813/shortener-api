export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getUserPlan } from "@/lib/quota";
import { generateQR } from "@/lib/qr";
import { CORS_HEADERS, SHORTLINK_DOMAIN } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const env = getCloudflareEnv();
  const { code } = await params;

  if (!code || code.length < 3) {
    return NextResponse.json({ error: 'Invalid short code' }, { status: 400, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const size = parseInt(url.searchParams.get('size') || '256');
  const format = (url.searchParams.get('format') || 'png') as 'png' | 'svg';
  const dark = url.searchParams.get('dark') || '#000000';
  const light = url.searchParams.get('light') || '#FFFFFF';

  if (![128, 256, 512, 1024].includes(size)) {
    return NextResponse.json({ error: 'Invalid size. Use 128, 256, 512, or 1024' }, { status: 400, headers: CORS_HEADERS });
  }

  if (format !== 'png' && format !== 'svg') {
    return NextResponse.json({ error: 'Invalid format. Use png or svg' }, { status: 400, headers: CORS_HEADERS });
  }

  const hasCustomColors = dark !== '#000000' || light !== '#FFFFFF';

  if (hasCustomColors) {
    const authResult = await verifyAuth(request, env);
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Custom colors require authentication' }, { status: 401, headers: CORS_HEADERS });
    }

    const plan = await getUserPlan(env, authResult.userId);
    if (plan !== 'pro') {
      return NextResponse.json({ error: 'Custom colors require Pro plan' }, { status: 403, headers: CORS_HEADERS });
    }
  }

  const shortUrl = `${SHORTLINK_DOMAIN}/${code}`;
  return generateQR(shortUrl, { size, format, dark, light });
}