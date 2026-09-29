import { describe, expect, it } from 'vitest';
import { daysUntil, formatDate, formatDateTime, isValidDateString, todayLocal } from './formatDate';

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
  it('returns null for unparseable input', () => {
    expect(daysUntil('not-a-date')).toBeNull();
  });
});

describe('todayLocal', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('matches the local calendar date', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(todayLocal()).toBe(expected);
  });
});

describe('isValidDateString', () => {
  it('accepts a valid YYYY-MM-DD date', () => {
    expect(isValidDateString('2026-09-20')).toBe(true);
  });
  it('rejects empty strings', () => {
    expect(isValidDateString('')).toBe(false);
  });
  it('rejects invalid months and days', () => {
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-00-10')).toBe(false);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-04-31')).toBe(false);
  });
  it('rejects malformed strings', () => {
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('gibberish')).toBe(false);
  });
  it('accepts full ISO timestamps', () => {
    expect(isValidDateString('2026-09-20T10:00:00Z')).toBe(true);
  });
  it('accepts other Date-parseable formats via the fallback', () => {
    expect(isValidDateString('2026/09/20')).toBe(true);
  });
});
