import type { ConditionContext, MatchResult } from '../types';

export interface CityCondition {
  dimension: 'city';
  operator: '=' | '!=' | 'in' | 'not_in';
  value: string | string[];
}

export function matchCity(condition: CityCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const actualCity = (context.city ?? '').toLowerCase();

  if (!actualCity) {
    return { matched: false, reason: 'City not available in context' };
  }

  const values = Array.isArray(value) ? value.map(v => v.toLowerCase()) : [String(value).toLowerCase()];

  switch (operator) {
    case '=':
      return { matched: actualCity === values[0] };

    case '!=':
      return { matched: actualCity !== values[0] };

    case 'in':
      return { matched: values.includes(actualCity) };

    case 'not_in':
      return { matched: !values.includes(actualCity) };

    default:
      return { matched: false, reason: `Unsupported operator for city: ${operator}` };
  }
}