import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { errorFields, errorMessage, applyServerError } from './errors';

describe('error helpers', () => {
  it('extracts fields and message from ApiError', () => {
    const err = new ApiError('Bad request', 400, { email: 'Duplicate' });
    expect(errorMessage(err)).toBe('Bad request');
    expect(errorFields(err)).toEqual({ email: 'Duplicate' });
  });

  it('applyServerError merges fields into setFieldErrors and falls back to serverError', () => {
    const setFields = vi.fn();
    const setServer = vi.fn();
    applyServerError(new ApiError('Bad', 400, { email: 'Duplicate' }), setFields, setServer);
    expect(setFields).toHaveBeenCalledWith({ email: 'Duplicate' });
    expect(setServer).not.toHaveBeenCalled();

    applyServerError(new ApiError('Server down', 500), setFields, setServer);
    expect(setServer).toHaveBeenCalledWith('Server down');
  });
});