const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function required(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value);
}

export function requiredWithMessage(value: unknown, field: string): string | null {
  return required(value) ? null : `${field} is required`;
}