import type { ConditionContext, MatchResult } from '../types';

export interface OsCondition {
  dimension: 'os';
  operator: '=' | '!=' | 'in' | 'not_in';
  value: string | string[];
}

export function matchOS(condition: OsCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const actualOS = context.os;

  if (!actualOS) {
    return { matched: false, reason: 'OS not available in context' };
  }

  const actualOSLower = actualOS.toLowerCase();
  const values = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [String(value).toLowerCase()];

  switch (operator) {
    case '=':
      return { matched: actualOSLower === values[0] };

    case '!=':
      return { matched: actualOSLower !== values[0] };

    case 'in':
      return { matched: values.includes(actualOSLower) };

    case 'not_in':
      return { matched: !values.includes(actualOSLower) };

    default:
      return { matched: false, reason: `Unsupported operator for os: ${operator}` };
  }
}