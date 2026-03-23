/**
 * Split Rules Core Package - Type Definitions
 *
 * This module defines all core types for the traffic routing rule engine.
 * Includes 10 dimensions, 12 operators, and supporting interfaces.
 */

// ============================================================================
// Dimension Types (10 dimensions)
// ============================================================================

/**
 * Condition dimension types for traffic routing rules.
 * Each dimension represents a different aspect of the visitor/request context.
 */
export type ConditionDimension =
  | 'country'        // Country code (ISO 3166-1 alpha-2)
  | 'city'           // City name
  | 'device'         // Device type (desktop, mobile, tablet, etc.)
  | 'browser'        // Browser name and version
  | 'os'             // Operating system and version
  | 'bot'            // Bot/crawler identification
  | 'referer'        // Referrer URL
  | 'time_range'     // Time range (Unix timestamp in milliseconds)
  | 'cron'           // Cron expression for scheduled rules
  | 'percentage';    // Percentage-based split (1-100)

// ============================================================================
// Operator Types (12 operators)
// ============================================================================

/**
 * Condition operators for value comparison.
 * Different dimensions support different subsets of these operators.
 */
export type ConditionOperator =
  | '='              // Equal to
  | '!='             // Not equal to
  | 'in'             // In list
  | 'not_in'         // Not in list
  | 'contains'       // Contains substring
  | 'not_contains'   // Does not contain substring
  | 'prefix'         // Starts with prefix
  | 'regex'          // Matches regular expression
  | '<'              // Less than
  | '<='             // Less than or equal to
  | '>'              // Greater than
  | '>=';            // Greater than or equal to

// ============================================================================
// Bot Detection Types
// ============================================================================

/**
 * Bot category classification.
 */
export type BotCategory =
  | 'search-engine'   // Search engine crawlers (Googlebot, Bingbot, etc.)
  | 'ai'             // AI crawlers (GPTBot, ClaudeBot, etc.)
  | 'social'         // Social media bots (FacebookBot, TwitterBot, etc.)
  | 'monitoring'     // Monitoring tools (Pingdom, UptimeRobot, etc.)
  | 'tool'           // Development tools (curl, wget, Python requests, etc.)
  | 'advertising'    // Advertising crawlers
  | 'unknown';       // Unknown bot patterns

/**
 * Result of bot detection analysis.
 */
export interface BotMatchResult {
  isBot: boolean;
  botName?: string;
  botCategory?: BotCategory;
  verified: boolean;
}

// ============================================================================
// Device Types
// ============================================================================

/**
 * Device type classification.
 */
export type DeviceType =
  | 'desktop'
  | 'mobile'
  | 'tablet'
  | 'smarttv'
  | 'wearable'
  | 'console'
  | 'embedded'
  | 'bot';

// ============================================================================
// Context Interface
// ============================================================================

/**
 * Condition context for rule evaluation.
 */
export interface ConditionContext {
  country?: string;
  city?: string;
  device?: DeviceType;
  isBot?: boolean;
  botName?: string;
  botCategory?: BotCategory;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  referer?: string;
  timestamp?: number;
  linkCode?: string;
  percentage?: number;
}

// ============================================================================
// Rule and Condition Interfaces
// ============================================================================

/**
 * Individual condition within a split rule.
 */
export interface SplitCondition {
  id: string;
  dimension: ConditionDimension;
  operator: ConditionOperator;
  value: string | string[] | number;
  versionOperator?: ConditionOperator;
  versionValue?: string;
}

/**
 * Split rule definition.
 */
export interface SplitRule {
  id: string;
  name: string;
  priority: number;
  targetUrl: string;
  isActive: boolean;
  conditions: SplitCondition[];
}

/**
 * Result of rule evaluation.
 */
export interface EvaluationResult {
  matched: boolean;
  rule?: SplitRule;
  targetUrl?: string;
  reason?: string;
}

// ============================================================================
// JSON Storage Interfaces
// ============================================================================

/**
 * Simplified condition for JSON storage.
 */
export interface StoredCondition {
  dimension: string;
  operator: string;
  value: string | string[];
}

/**
 * Simplified rule structure for JSON storage in database.
 */
export interface StoredSplitRule {
  id?: string;
  name?: string;
  priority: number;
  targetUrl: string;
  isActive: boolean;
  conditions: StoredCondition[];
}

// ============================================================================
// Match Result
// ============================================================================

/**
 * Match result for condition evaluation.
 */
export type MatchResult = {
  matched: boolean;
  reason?: string;
};

// ============================================================================
// Dimension-Operator Compatibility Matrix
// ============================================================================

export const DIMENSION_OPERATORS: Record<ConditionDimension, ConditionOperator[]> = {
  country: ['=', '!=', 'in', 'not_in'],
  city: ['=', '!=', 'in', 'not_in'],
  device: ['=', '!=', 'in', 'not_in'],
  browser: ['=', '!=', 'in', 'not_in'],
  os: ['=', '!=', 'in', 'not_in'],
  bot: ['=', '!=', 'in', 'not_in'],
  referer: ['=', '!=', 'in', 'not_in', 'contains', 'not_contains', 'prefix', 'regex'],
  time_range: ['<', '<=', '>', '>=', '=', '!='],
  cron: ['='],
  percentage: ['<', '<=', '>', '>=', '='],
} as const;

// ============================================================================
// Configuration Constants
// ============================================================================

export const DEFAULT_PERCENTAGE = 100;
export const DEFAULT_PRIORITY = 1000;
export const MAX_CONDITIONS_PER_RULE = 10;
export const MAX_RULES_PER_LINK = 20;
export const MIN_PERCENTAGE = 1;
export const MAX_PERCENTAGE = 100;
export const RESERVED_PERCENTAGE = 0;