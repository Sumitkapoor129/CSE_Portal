import { ApiError } from '../api/client';

export function errorFields(err: unknown): Record<string, string> | undefined {
  return err instanceof ApiError ? err.fields : undefined;
}

export function errorMessage(err: unknown): string | null {
  return err instanceof ApiError ? err.message : null;
}

export function applyServerError(
  err: unknown,
  setFieldErrors: (fields: Record<string, string>) => void,
  setServerError: (message: string | null) => void
): void {
  const fields = errorFields(err);
  if (fields && Object.keys(fields).length > 0) {
    setFieldErrors(fields);
    return;
  }
  const message = errorMessage(err);
  if (message) setServerError(message);
}