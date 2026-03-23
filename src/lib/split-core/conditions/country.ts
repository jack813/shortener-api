import type { ConditionContext, MatchResult } from '../types';

export interface CountryCondition {
  dimension: 'country';
  operator: '=' | '!=' | 'in' | 'not_in';
  value: string | string[];
}

export function matchCountry(condition: CountryCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const actualCountry = (context.country ?? '').toUpperCase();

  if (actualCountry === '' || actualCountry === 'UNKNOWN') {
    return { matched: false, reason: 'Country not available in context' };
  }

  const values = Array.isArray(value) ? value.map(v => v.toUpperCase()) : [String(value).toUpperCase()];

  switch (operator) {
    case '=':
      return { matched: actualCountry === values[0] };

    case '!=':
      return { matched: actualCountry !== values[0] };

    case 'in':
      return { matched: values.includes(actualCountry) };

    case 'not_in':
      return { matched: !values.includes(actualCountry) };

    default:
      return { matched: false, reason: `Unsupported operator for country: ${operator}` };
  }
}