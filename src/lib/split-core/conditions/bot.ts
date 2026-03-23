import type { ConditionContext, MatchResult } from '../types';

export interface BotCondition {
  dimension: 'bot';
  operator: '=' | '!=' | 'in' | 'not_in';
  value: string | string[] | boolean;
}

export function matchBot(condition: BotCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const isBot = context.isBot ?? false;

  // Handle boolean value for simple bot check
  if (typeof value === 'boolean') {
    return { matched: isBot === value };
  }

  const botName = context.botName?.toLowerCase() ?? '';
  const botCategory = context.botCategory?.toLowerCase() ?? '';
  const values = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [String(value).toLowerCase()];

  switch (operator) {
    case '=':
      // Match bot name or category
      return { matched: botName === values[0] || botCategory === values[0] };

    case '!=':
      return { matched: botName !== values[0] && botCategory !== values[0] };

    case 'in':
      return { matched: values.includes(botName) || values.includes(botCategory) };

    case 'not_in':
      return { matched: !values.includes(botName) && !values.includes(botCategory) };

    default:
      return { matched: false, reason: `Unsupported operator for bot: ${operator}` };
  }
}