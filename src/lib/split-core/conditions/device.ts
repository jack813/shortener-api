import type { ConditionContext, MatchResult, DeviceType } from '../types';

export interface DeviceCondition {
  dimension: 'device';
  operator: '=' | '!=' | 'in' | 'not_in';
  value: string | string[];
}

export function matchDevice(condition: DeviceCondition, context: ConditionContext): MatchResult {
  const { operator, value } = condition;
  const actualDevice = context.device;

  if (!actualDevice) {
    return { matched: false, reason: 'Device not available in context' };
  }

  const actualDeviceStr = String(actualDevice).toLowerCase();
  const values = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [String(value).toLowerCase()];

  switch (operator) {
    case '=':
      return { matched: actualDeviceStr === values[0] };

    case '!=':
      return { matched: actualDeviceStr !== values[0] };

    case 'in':
      return { matched: values.includes(actualDeviceStr) };

    case 'not_in':
      return { matched: !values.includes(actualDeviceStr) };

    default:
      return { matched: false, reason: `Unsupported operator for device: ${operator}` };
  }
}