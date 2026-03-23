/**
 * Pricing Plans Configuration
 *
 * Defines user quotas and plan limits for the URL shortening service.
 * Currently supports Free and Pro tiers.
 */

export type PlanType = 'free' | 'pro';
export type QuotaType = 'monthly' | 'custom' | 'permanent';

export interface PlanConfig {
  name: string;
  displayName: string;
  price: number;
  priceAnnual: number;
  currency: string;
  description: string;
  features: string[];
  limits: {
    monthlyLinks: number;
    customLinks: number;
    permanentLinks: number;
    apiKeys: number;
    splitRules: number;
    splitDimensions: readonly string[];
    conditionsPerRule: number;
    dataRetentionDays: number;
    qrCodes: number;
  };
}

/**
 * Plan configurations
 */
export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    priceAnnual: 0,
    currency: 'USD',
    description: 'Perfect for personal projects and trying out the service',
    features: [
      '1,000 short links per month',
      '50 custom links (total)',
      '20 permanent links (total)',
      '2 API keys',
      '5 split rules per link',
      '30-day analytics retention',
      'Full geographic & device analytics',
      'MCP protocol support',
      'Bot detection & filtering',
    ],
    limits: {
      monthlyLinks: 1000,
      customLinks: 50,
      permanentLinks: 20,
      apiKeys: 2,
      splitRules: 5,
      splitDimensions: ['country', 'device'] as const,
      conditionsPerRule: 3,
      dataRetentionDays: 30,
      qrCodes: 0,
    },
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 9,
    priceAnnual: 89,
    currency: 'USD',
    description: 'For professionals and power users who need more',
    features: [
      '5,000 short links per month',
      '200 custom links (total)',
      '100 permanent links (total)',
      '5 API keys',
      '20 split rules per link',
      '1-year analytics retention',
      '50 QR codes per month',
      'Priority support',
      'Everything in Free, plus more',
    ],
    limits: {
      monthlyLinks: 5000,
      customLinks: 200,
      permanentLinks: 100,
      apiKeys: 5,
      splitRules: 20,
      splitDimensions: [
        'country',
        'city',
        'device',
        'browser',
        'os',
        'bot',
        'referer',
        'time_range',
        'cron',
        'percentage',
      ] as const,
      conditionsPerRule: 10,
      dataRetentionDays: 365,
      qrCodes: 50,
    },
  },
};

/**
 * Get plan configuration by type
 */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLANS[plan];
}

/**
 * Get allowed condition dimensions for a plan
 */
export function getAllowedDimensions(plan: PlanType): readonly string[] {
  return PLANS[plan].limits.splitDimensions;
}

/**
 * Get plan limits for quota checking
 */
export function getPlanLimits(plan: PlanType) {
  return PLANS[plan].limits;
}

/**
 * Default plan for new users
 */
export const DEFAULT_PLAN: PlanType = 'free';

/**
 * Get quota limit for a specific quota type and plan
 */
export function getQuotaLimit(plan: PlanType, type: QuotaType): number {
  const limits = PLANS[plan].limits;
  switch (type) {
    case 'monthly':
      return limits.monthlyLinks;
    case 'custom':
      return limits.customLinks;
    case 'permanent':
      return limits.permanentLinks;
    default:
      return 0;
  }
}