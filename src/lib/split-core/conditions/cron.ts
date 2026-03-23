import type { ConditionContext, MatchResult } from '../types';
import { matchesCron } from '../utils/cron-matcher';

export interface CronCondition {
  dimension: 'cron';
  operator: '=';
  value: string;
}

export function matchCron(
  condition: CronCondition,
  context: ConditionContext
): MatchResult {
  const { operator, value } = condition;

  if (operator !== '=') {
    return { matched: false, reason: `Unsupported operator for cron: ${operator}` };
  }

  const actualTimestamp = context.timestamp ?? Date.now();

  try {
    const matched = matchesCron(value, actualTimestamp);
    return { matched };
  } catch (error) {
    return { matched: false, reason: `Invalid cron expression: ${value}` };
  }
}