import type { ConditionContext, MatchResult } from '../types';

export interface BrowserCondition {
  dimension: 'browser';
  operator: '=' | '!=' | 'in' | 'not_in';
  value: string | string[];
}

export function matchBrowser(condition: BrowserCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const actualBrowser = context.browser;

  if (!actualBrowser) {
    return { matched: false, reason: 'Browser not available in context' };
  }

  const actualBrowserLower = actualBrowser.toLowerCase();
  const values = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [String(value).toLowerCase()];

  switch (operator) {
    case '=':
      return { matched: actualBrowserLower === values[0] };

    case '!=':
      return { matched: actualBrowserLower !== values[0] };

    case 'in':
      return { matched: values.includes(actualBrowserLower) };

    case 'not_in':
      return { matched: !values.includes(actualBrowserLower) };

    default:
      return { matched: false, reason: `Unsupported operator for browser: ${operator}` };
  }
}