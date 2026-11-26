export function formatLocalHour(iso: string, timezone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  }
}

export function hourFromLabel(label: string): number | null {
  const match = /^(\d{1,2}):/.exec(label.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

export function parseUtcTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null;
  const withZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  const ms = Date.parse(withZone);
  return Number.isFinite(ms) ? ms : null;
}
