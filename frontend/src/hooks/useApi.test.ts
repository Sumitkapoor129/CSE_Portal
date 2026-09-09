// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

describe('useApi', () => {
  it('flows through loading -> data', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const { result } = renderHook(() => useApi<number[]>(fetcher));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(result.current.error).toBeNull();
  });

  it('captures error string on rejection', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApi<number[]>(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });

  it('refetch re-runs the fetcher', async () => {
    let calls = 0;
    const fetcher = vi.fn(async () => ++calls);
    const { result } = renderHook(() => useApi<number>(fetcher));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
