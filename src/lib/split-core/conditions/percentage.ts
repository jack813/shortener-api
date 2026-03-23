import type { ConditionContext, MatchResult } from '../types';

export interface PercentageCondition {
  dimension: 'percentage';
  operator: '<' | '<=' | '>' | '>=' | '=';
  value: number;
}

export function matchPercentage(
  condition: PercentageCondition,
  context: ConditionContext
): MatchResult {
  const { operator, value } = condition;

  // Get percentage bucket from context (1-100), default to 0 if not available
  const actualPercentage = context.percentage ?? 0;

  switch (operator) {
    case '<':
      return { matched: actualPercentage < value };

    case '<=':
      return { matched: actualPercentage <= value };

    case '>':
      return { matched: actualPercentage > value };

    case '>=':
      return { matched: actualPercentage >= value };

    case '=':
      return { matched: actualPercentage === value };

    default:
      return { matched: false, reason: `Unsupported operator for percentage: ${operator}` };
  }
}