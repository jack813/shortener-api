import type { ConditionContext, MatchResult } from '../types';

export interface RefererCondition {
  dimension: 'referer';
  operator: '=' | '!=' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'prefix' | 'regex';
  value: string | string[];
}

export function matchReferer(condition: RefererCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const referer = context.referer ?? '';

  if (!referer) {
    return { matched: false, reason: 'Referer not available in context' };
  }

  const refererLower = referer.toLowerCase();
  const values = Array.isArray(value) ? value.map(v => v.toLowerCase()) : [String(value).toLowerCase()];

  switch (operator) {
    case '=':
      return { matched: refererLower === values[0] };

    case '!=':
      return { matched: refererLower !== values[0] };

    case 'in':
      return { matched: values.includes(refererLower) };

    case 'not_in':
      return { matched: !values.includes(refererLower) };

    case 'contains':
      return { matched: refererLower.includes(values[0]) };

    case 'not_contains':
      return { matched: !refererLower.includes(values[0]) };

    case 'prefix':
      return { matched: refererLower.startsWith(values[0]) };

    case 'regex':
      try {
        const regex = new RegExp(String(value), 'i');
        return { matched: regex.test(referer) };
      } catch {
        return { matched: false, reason: 'Invalid regex pattern' };
      }

    default:
      return { matched: false, reason: `Unsupported operator for referer: ${operator}` };
  }
}