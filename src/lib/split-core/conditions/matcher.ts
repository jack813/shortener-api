import type { SplitCondition, ConditionContext, MatchResult } from '../types';
import { matchCountry } from './country';
import { matchCity } from './city';
import { matchDevice } from './device';
import { matchBrowser } from './browser';
import { matchOS } from './os';
import { matchBot } from './bot';
import { matchReferer } from './referer';
import { matchTimeRange } from './time-range';
import { matchCron } from './cron';
import { matchPercentage } from './percentage';

export function matchCondition(
  condition: SplitCondition,
  context: ConditionContext
): MatchResult {
  const { dimension } = condition;

  switch (dimension) {
    case 'country':
      return matchCountry(condition as any, context);

    case 'city':
      return matchCity(condition as any, context);

    case 'device':
      return matchDevice(condition as any, context);

    case 'browser':
      return matchBrowser(condition as any, context);

    case 'os':
      return matchOS(condition as any, context);

    case 'bot':
      return matchBot(condition as any, context);

    case 'referer':
      return matchReferer(condition as any, context);

    case 'time_range':
      return matchTimeRange(condition as any, context);

    case 'cron':
      return matchCron(condition as any, context);

    case 'percentage':
      return matchPercentage(condition as any, context);

    default:
      return {
        matched: false,
        reason: `Unknown dimension: ${dimension}`
      };
  }
}

export function matchAllConditions(
  conditions: SplitCondition[],
  context: ConditionContext
): boolean {
  if (conditions.length === 0) {
    return true;
  }

  for (const condition of conditions) {
    const result = matchCondition(condition, context);
    if (!result.matched) {
      return false;
    }
  }

  return true;
}

export function matchAnyCondition(
  conditions: SplitCondition[],
  context: ConditionContext
): boolean {
  if (conditions.length === 0) {
    return false;
  }

  for (const condition of conditions) {
    const result = matchCondition(condition, context);
    if (result.matched) {
      return true;
    }
  }

  return false;
}