import type { SplitRule, ConditionContext, EvaluationResult } from './types';
import { matchAllConditions } from './conditions/matcher';

/**
 * Evaluates split rules against the provided context.
 *
 * Process:
 * 1. Filters to only active rules
 * 2. Sorts by priority (lower number = higher priority)
 * 3. Evaluates each rule's conditions using AND logic
 * 4. Returns first matching rule or no-match result
 */
export function evaluateRules(
  rules: SplitRule[],
  context: ConditionContext
): EvaluationResult {
  const activeRules = rules.filter(rule => rule.isActive);

  if (activeRules.length === 0) {
    return {
      matched: false,
      reason: 'No active rules available',
    };
  }

  activeRules.sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const matches = matchAllConditions(rule.conditions, context);

    if (matches) {
      return {
        matched: true,
        rule,
        targetUrl: rule.targetUrl,
        reason: `Rule "${rule.name}" matched`,
      };
    }
  }

  return {
    matched: false,
    reason: 'No rules matched the request context',
  };
}