import type { ConditionContext, DeviceType } from './types';
import { detectBot } from './utils/bot-detector';

export async function buildConditionContext(
  request: Request,
  linkCode: string
): Promise<ConditionContext> {
  const userAgent = request.headers.get('User-Agent') || '';
  const referer = request.headers.get('Referer') || '';

  const cf = (request as any).cf as {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  } | undefined;

  const country = cf?.country;
  const city = cf?.city;

  const botResult = detectBot(userAgent);
  const percentage = generatePercentage(linkCode, userAgent);
  const uaInfo = parseUserAgentForContext(userAgent, botResult.isBot);

  return {
    country,
    city,
    isBot: botResult.isBot,
    botName: botResult.botName,
    botCategory: botResult.botCategory,
    device: uaInfo.device,
    browser: uaInfo.browser,
    browserVersion: uaInfo.browserVersion,
    os: uaInfo.os,
    osVersion: uaInfo.osVersion,
    referer: referer || undefined,
    timestamp: Date.now(),
    linkCode,
    percentage,
  };
}

function generatePercentage(linkCode: string, userAgent: string): number {
  const hashString = `${linkCode}:${userAgent}`;
  let hash = 0;

  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return (Math.abs(hash) % 100) + 1;
}

function parseUserAgentForContext(
  ua: string,
  isBot: boolean
): {
  device: DeviceType | undefined;
  browser: string | undefined;
  browserVersion: string | undefined;
  os: string | undefined;
  osVersion: string | undefined;
} {
  if (!ua) {
    return { device: undefined, browser: undefined, browserVersion: undefined, os: undefined, osVersion: undefined };
  }

  let device: DeviceType | undefined;
  if (isBot) {
    device = undefined;
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = 'tablet';
  } else if (/nintendo|playstation|xbox/i.test(ua)) {
    device = 'console';
  } else if (/smart[-]?tv|appletv|googletv|hbbtv|pov_tv|netcast/i.test(ua)) {
    device = 'smarttv';
  } else if (/watch|wearable|galaxy watch/i.test(ua)) {
    device = 'wearable';
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|opera mobi/i.test(ua)) {
    device = 'mobile';
  } else {
    device = 'desktop';
  }

  let browser: string | undefined;
  let browserVersion: string | undefined;

  const browserPatterns: Array<[RegExp, string]> = [
    [/edg[ea]?\/([0-9._]+)/i, 'Edge'],
    [/opr\/([0-9._]+)/i, 'Opera'],
    [/opera mini.*version\/([0-9._]+)/i, 'Opera Mini'],
    [/opera.*version\/([0-9._]+)/i, 'Opera'],
    [/chrome\/([0-9._]+)/i, 'Chrome'],
    [/firefox\/([0-9._]+)/i, 'Firefox'],
    [/safari\/([0-9._]+)/i, 'Safari'],
    [/msie ([0-9.]+)/i, 'IE'],
    [/trident.*rv:([0-9.]+)/i, 'IE'],
  ];

  for (const [pattern, name] of browserPatterns) {
    const match = ua.match(pattern);
    if (match) {
      browser = name;
      browserVersion = match[1]?.split('.')[0];
      break;
    }
  }

  let os: string | undefined;
  let osVersion: string | undefined;

  const osPatterns: Array<[RegExp, string]> = [
    [/windows nt ([0-9.]+)/i, 'Windows'],
    [/mac os x ([0-9._]+)/i, 'macOS'],
    [/android ([0-9._]+)/i, 'Android'],
    [/iphone os ([0-9._]+)/i, 'iOS'],
    [/ipad.*os ([0-9._]+)/i, 'iOS'],
    [/linux/i, 'Linux'],
    [/cros/i, 'Chrome OS'],
  ];

  for (const [pattern, name] of osPatterns) {
    const match = ua.match(pattern);
    if (match) {
      os = name;
      osVersion = match[1]?.replace(/_/g, '.')?.split('.')[0];
      break;
    }
  }

  return { device, browser, browserVersion, os, osVersion };
}