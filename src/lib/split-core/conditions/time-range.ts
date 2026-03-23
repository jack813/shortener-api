import type { ConditionContext, MatchResult } from '../types';

export interface TimeRangeCondition {
  dimension: 'time_range';
  operator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  value: number;
}

export function matchTimeRange(condition: TimeRangeCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const actualTimestamp = context.timestamp ?? Date.now();

  switch (operator) {
    case '<':
      return { matched: actualTimestamp < value };

    case '<=':
      return { matched: actualTimestamp <= value };

    case '>':
      return { matched: actualTimestamp > value };

    case '>=':
      return { matched: actualTimestamp >= value };

    case '=':
      return { matched: actualTimestamp === value };

    case '!=':
      return { matched: actualTimestamp !== value };

    default:
      return { matched: false, reason: `Unsupported operator for time_range: ${operator}` };
  }
}