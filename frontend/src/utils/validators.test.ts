import { describe, expect, it } from 'vitest';
import { required, validateEmail } from './validators';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('s@college.edu')).toBe(true);
  });
  it('rejects invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('required', () => {
  it('rejects empty and blank values', () => {
    expect(required('')).toBe(false);
    expect(required('   ')).toBe(false);
    expect(required(undefined)).toBe(false);
    expect(required(0)).toBe(false);
  });
  it('accepts non-empty strings and numbers', () => {
    expect(required('x')).toBe(true);
    expect(required(4)).toBe(true);
  });
});
