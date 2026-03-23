/**
 * Cron expression matcher
 * Supports standard 5-field cron format: minute hour day-of-month month day-of-week
 */

/**
 * Check if a timestamp matches a cron expression
 * @param cronExpression - Standard 5-field cron expression
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if the timestamp matches the cron expression
 */
export function matchesCron(cronExpression: string, timestamp: number): boolean {
  const date = new Date(timestamp);

  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression: must have 5 fields');
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    matchField(minute, date.getMinutes(), 0, 59) &&
    matchField(hour, date.getHours(), 0, 23) &&
    matchField(dayOfMonth, date.getDate(), 1, 31) &&
    matchField(month, date.getMonth() + 1, 1, 12) &&
    matchField(dayOfWeek, date.getDay(), 0, 6)
  );
}

/**
 * Match a single cron field against a value
 */
function matchField(
  field: string,
  value: number,
  min: number,
  max: number
): boolean {
  // Handle wildcard
  if (field === '*') {
    return true;
  }

  // Handle step values (*/n)
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) {
      return false;
    }
    return value % step === 0;
  }

  // Handle ranges (n-m)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(n => parseInt(n, 10));
    if (isNaN(start) || isNaN(end)) {
      return false;
    }
    return value >= start && value <= end;
  }

  // Handle lists (n,m,o)
  if (field.includes(',')) {
    const values = field.split(',').map(n => parseInt(n, 10));
    return values.includes(value);
  }

  // Handle exact value
  const exact = parseInt(field, 10);
  if (isNaN(exact)) {
    return false;
  }

  return value === exact;
}