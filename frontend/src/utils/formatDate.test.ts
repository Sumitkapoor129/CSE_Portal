import { describe, expect, it } from 'vitest';
import { daysUntil, formatDate, formatDateTime } from './formatDate';

describe('formatDate', () => {
  it('formats ISO date string to YYYY-MM-DD', () => {
    expect(formatDate('2026-12-01T00:00:00Z')).toBe('2026-12-01');
  });
  it('returns "—" for null/undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('includes time', () => {
    expect(formatDateTime('2026-09-15T11:00:00Z')).toMatch(/2026-09-15/);
  });
});

describe('daysUntil', () => {
  it('returns positive days for future date', () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    expect(daysUntil(future)).toBe(3);
  });
  it('returns null for null input', () => {
    expect(daysUntil(null)).toBeNull();
  });
});
