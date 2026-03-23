export type {
  ConditionDimension,
  ConditionOperator,
  BotCategory,
  BotMatchResult,
  DeviceType,
  ConditionContext,
  SplitCondition,
  SplitRule,
  EvaluationResult,
  StoredCondition,
  StoredSplitRule,
  MatchResult,
} from './types';

export {
  DEFAULT_PERCENTAGE,
  DEFAULT_PRIORITY,
  MAX_CONDITIONS_PER_RULE,
  MAX_RULES_PER_LINK,
  MIN_PERCENTAGE,
  MAX_PERCENTAGE,
  RESERVED_PERCENTAGE,
  DIMENSION_OPERATORS,
} from './types';

export { evaluateRules } from './engine';
export { buildConditionContext } from './context';

export {
  matchCondition,
  matchAllConditions,
  matchAnyCondition,
} from './conditions/matcher';

export { matchCountry } from './conditions/country';
export { matchCity } from './conditions/city';
export { matchDevice } from './conditions/device';
export { matchBrowser } from './conditions/browser';
export { matchOS } from './conditions/os';
export { matchBot } from './conditions/bot';
export { matchReferer } from './conditions/referer';
export { matchTimeRange } from './conditions/time-range';
export { matchCron } from './conditions/cron';
export { matchPercentage } from './conditions/percentage';

export { detectBot } from './utils/bot-detector';