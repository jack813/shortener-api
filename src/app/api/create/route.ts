export const runtime = 'edge';
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { checkQuota, incrementQuota } from "@/lib/quota";
import { generateUniqueKey, validateCustomCode, isCreateRequest, SHORTLINK_DOMAIN, CORS_HEADERS } from "@/lib/api-utils";
import { getCloudflareEnv } from "@/lib/env";
import type { StoredSplitRule } from "@/lib/split-core/types";
import { MAX_RULES_PER_LINK, MAX_CONDITIONS_PER_RULE } from "@/lib/split-core";

interface CreateRequest {
  url: string;
  custom?: string;
  expire_days?: number;
  permanent?: boolean;
  split_rules?: StoredSplitRule[];
}

function validateSplitRules(splitRules: StoredSplitRule[]): { valid: boolean; error?: string } {
  if (splitRules.length > MAX_RULES_PER_LINK) {
    return {
      valid: false,
      error: `Too many split rules: ${splitRules.length} exceeds maximum of ${MAX_RULES_PER_LINK}`,
    };
  }

  for (let i = 0; i < splitRules.length; i++) {
    const rule = splitRules[i];

    if (!rule.targetUrl || typeof rule.targetUrl !== "string") {
      return { valid: false, error: `Rule ${i + 1}: targetUrl is required` };
    }

    try {
      new URL(rule.targetUrl);
    } catch {
      return { valid: false, error: `Rule ${i + 1}: targetUrl must be a valid URL` };
    }

    if (rule.conditions && rule.conditions.length > MAX_CONDITIONS_PER_RULE) {
      return {
        valid: false,
        error: `Rule ${i + 1}: too many conditions: ${rule.conditions.length} exceeds maximum of ${MAX_CONDITIONS_PER_RULE}`,
      };
    }

    if (rule.conditions) {
      for (let j = 0; j < rule.conditions.length; j++) {
        const cond = rule.conditions[j];
        if (!cond.dimension || typeof cond.dimension !== "string") {
          return { valid: false, error: `Rule ${i + 1}, Condition ${j + 1}: dimension is required` };
        }
        if (!cond.operator || typeof cond.operator !== "string") {
          return { valid: false, error: `Rule ${i + 1}, Condition ${j + 1}: operator is required` };
        }
        if (cond.value === undefined) {
          return { valid: false, error: `Rule ${i + 1}, Condition ${j + 1}: value is required` };
        }
      }
    }
  }

  return { valid: true };
}

export async function POST(request: Request) {
  const env = getCloudflareEnv();
  const { DB, ShortenerLinks } = env;

  if (!DB || !ShortenerLinks) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500, headers: CORS_HEADERS });
  }

  // Auth
  const authResult = await verifyAuth(request, env);

  if (!authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  if (!isCreateRequest(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: CORS_HEADERS });
  }

  const { url: longUrl, custom, expire_days = 30, permanent = false, split_rules } = body as CreateRequest;

  // Validate URL
  if (!longUrl || typeof longUrl !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400, headers: CORS_HEADERS });
  }

  // Validate split_rules
  if (split_rules && split_rules.length > 0) {
    const validation = validateSplitRules(split_rules);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400, headers: CORS_HEADERS });
    }
  }

  // Determine quota type
  const isCustom = typeof custom === "string" && custom.trim() !== "";
  let quotaType: "monthly" | "custom" | "permanent";

  if (permanent === true) {
    quotaType = "permanent";
  } else if (isCustom) {
    quotaType = "custom";
  } else {
    quotaType = "monthly";
  }

  // Check quota
  const quotaCheck = await checkQuota(env, authResult.userId, quotaType);
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: quotaCheck.error }, { status: 429, headers: CORS_HEADERS });
  }

  const validExpirations = [30, 90, 180, 365];
  const safeExpireDays = validExpirations.includes(expire_days) ? expire_days : 30;

  let key: string;
  if (isCustom) {
    const customCode = custom.trim();

    const validation = validateCustomCode(customCode);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400, headers: CORS_HEADERS });
    }

    const exists = await ShortenerLinks.get(customCode);
    if (exists) {
      return NextResponse.json({ error: "Custom code already exists" }, { status: 409, headers: CORS_HEADERS });
    }
    key = customCode;
  } else {
    key = await generateUniqueKey(env);
  }

  const expirationAt = new Date(Date.now() + safeExpireDays * 24 * 60 * 60 * 1000).toISOString();
  await ShortenerLinks.put(key, longUrl, {
    expirationTtl: 60 * 60 * 24 * safeExpireDays,
    metadata: { expirationAt },
  });

  try {
    await DB.prepare(
      `INSERT INTO short_links (user_id, code, url, expiration_at, is_custom, is_permanent, api_key_id, split_rules) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(authResult.userId, key, longUrl, expirationAt, isCustom ? 1 : 0, permanent === true ? 1 : 0, authResult.apiKeyId || null, split_rules ? JSON.stringify(split_rules) : null).run();
  } catch (e) {
    console.error("Failed to insert into DB:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500, headers: CORS_HEADERS });
  }

  await incrementQuota(env, authResult.userId, quotaType);

  return NextResponse.json(
    { code: key, short_url: `${SHORTLINK_DOMAIN}/${key}` },
    { status: 200, headers: CORS_HEADERS }
  );
}