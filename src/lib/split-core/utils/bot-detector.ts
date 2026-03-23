import type { BotMatchResult, BotCategory } from '../types';

/**
 * Bot definitions for detection
 */
interface BotDefinition {
  name: string;
  pattern: string;
  category: BotCategory;
}

/**
 * Search Engine Bots
 */
const SEARCH_ENGINE_BOTS: BotDefinition[] = [
  { name: 'Googlebot', pattern: 'Googlebot/\\S+', category: 'search-engine' },
  { name: 'Googlebot-Image', pattern: 'Googlebot-Image/\\S+', category: 'search-engine' },
  { name: 'Bingbot', pattern: 'Bingbot/\\S+', category: 'search-engine' },
  { name: 'YandexBot', pattern: 'YandexBot/\\S+', category: 'search-engine' },
  { name: 'Baiduspider', pattern: 'Baiduspider', category: 'search-engine' },
  { name: 'DuckDuckBot', pattern: 'DuckDuckBot/\\S+', category: 'search-engine' },
];

/**
 * AI Bots
 */
const AI_BOTS: BotDefinition[] = [
  { name: 'GPTBot', pattern: 'GPTBot', category: 'ai' },
  { name: 'ClaudeBot', pattern: 'ClaudeBot', category: 'ai' },
  { name: 'ChatGPT-User', pattern: 'ChatGPT-User', category: 'ai' },
  { name: 'Google-Extended', pattern: 'Google-Extended', category: 'ai' },
  { name: 'Bytespider', pattern: 'Bytespider', category: 'ai' },
  { name: 'Claude-Web', pattern: 'Claude-Web', category: 'ai' },
];

/**
 * Social Media Bots
 */
const SOCIAL_BOTS: BotDefinition[] = [
  { name: 'FacebookBot', pattern: 'facebookexternalhit/\\S+', category: 'social' },
  { name: 'TwitterBot', pattern: 'Twitterbot/\\S+', category: 'social' },
  { name: 'LinkedInBot', pattern: 'LinkedInBot/\\S+', category: 'social' },
  { name: 'SlackBot', pattern: 'Slackbot/\\S+', category: 'social' },
];

/**
 * Development Tools
 */
const DEVELOPMENT_TOOLS: BotDefinition[] = [
  { name: 'curl', pattern: '^curl/\\S+', category: 'tool' },
  { name: 'Wget', pattern: '^Wget/\\S+', category: 'tool' },
  { name: 'Python-requests', pattern: 'python-requests/\\S+', category: 'tool' },
  { name: 'Python-urllib', pattern: 'Python-urllib/\\S+', category: 'tool' },
  { name: 'Go-http-client', pattern: 'Go-http-client/\\S+', category: 'tool' },
  { name: 'Node-fetch', pattern: 'node-fetch/\\S+', category: 'tool' },
  { name: 'Axios', pattern: 'axios/\\S+', category: 'tool' },
  { name: 'Ruby', pattern: '^Ruby/\\S+', category: 'tool' },
  { name: 'Java', pattern: '^Java/\\S+', category: 'tool' },
  { name: 'Perl', pattern: '^libwww-perl/\\S+', category: 'tool' },
];

/**
 * Monitoring Tools
 */
const MONITORING_TOOLS: BotDefinition[] = [
  { name: 'Pingdom', pattern: 'Pingdom\\.com_bot', category: 'monitoring' },
  { name: 'UptimeRobot', pattern: 'UptimeRobot/\\S+', category: 'monitoring' },
  { name: 'Datadog', pattern: 'Datadog/\\S+', category: 'monitoring' },
  { name: 'StatusPage', pattern: 'StatusPage\\.io', category: 'monitoring' },
];

/**
 * All known bots combined
 */
const KNOWN_BOTS: BotDefinition[] = [
  ...SEARCH_ENGINE_BOTS,
  ...AI_BOTS,
  ...SOCIAL_BOTS,
  ...DEVELOPMENT_TOOLS,
  ...MONITORING_TOOLS,
];

/**
 * Detects if the given User-Agent string matches a known bot.
 */
export function detectBot(userAgent: string): BotMatchResult {
  for (const bot of KNOWN_BOTS) {
    try {
      const regex = new RegExp(bot.pattern);
      if (regex.test(userAgent)) {
        return {
          isBot: true,
          botName: bot.name,
          botCategory: bot.category,
          verified: false,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    isBot: false,
    verified: false,
  };
}