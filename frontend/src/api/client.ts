export const TOKEN_KEY = 'cse_portal_token';
export const REFRESH_KEY = 'cse_portal_refresh';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
export function setStoredTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, unknown>;
  signal?: AbortSignal;
}

export type ApiOpts = { signal?: AbortSignal };

const RATE_LIMIT_MESSAGE = "You're making requests too quickly. Please wait a moment and try again.";

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError')
  );
}

function resolveErrorMessage(res: Response, json: unknown): string {
  if (res.status === 429) {
    const retryAfter = res.headers?.get?.('Retry-After');
    return retryAfter ? `${RATE_LIMIT_MESSAGE} (Retry after ${retryAfter}s.)` : RATE_LIMIT_MESSAGE;
  }
  return json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
    ? (json as { message: string }).message
    : `Request failed (${res.status}).`;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getStoredRefreshToken();
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { success: boolean; data: { accessToken: string; refreshToken: string } };
      // If the user logged out while this refresh was in flight, the stored
      // refresh token has been cleared — do not write tokens back.
      if (getStoredRefreshToken() !== refresh) return null;
      setStoredTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken;
    } catch {
      return null;
    }
  })();
  return refreshPromise.finally(() => {
    refreshPromise = null;
  });
}

async function doFetch<T>(path: string, options: FetchOptions, canRefresh: boolean): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  const url = new URL(`${API_URL}${path}`, window.location.origin);
  if (query) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    url.search = parts.join('&');
  }

  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (isAbortError(err) || signal?.aborted) throw err;
    throw new ApiError('Unable to reach the server. Please try again.', 0);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const fields =
      json && typeof json === 'object' && 'fields' in json
        ? (json as { fields?: Record<string, string> }).fields
        : undefined;

    if (res.status === 401 && canRefresh && !path.startsWith('/auth/')) {
      const fresh = await refreshAccessToken();
      if (fresh) return doFetch(path, options, false); // exactly one retry
    }
    if (res.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(resolveErrorMessage(res, json), res.status, fields);
  }

  const envelope = json as ApiEnvelope<T> | null;
  return envelope?.data as T;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  return doFetch(path, options, true);
}

// Parses the shared { success, data, message } envelope for non-JSON-transport
// requests (multipart upload / binary download). Moved here so upload/download
// and doFetch agree on error shape and 401 handling.
function handleEnvelopeResponse(res: Response, json: unknown, onUnauthorized: boolean): void {
  if (!res.ok) {
    const fields =
      json && typeof json === 'object' && 'fields' in json
        ? (json as { fields?: Record<string, string> }).fields
        : undefined;
    if (res.status === 401 && onUnauthorized) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(resolveErrorMessage(res, json), res.status, fields);
  }
}

export async function apiUpload<T>(path: string, file: File, opts: { signal?: AbortSignal } = {}): Promise<T> {
  const doUpload = async (canRefresh: boolean): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `${API_URL}${path}`;
    let res: Response;
    try {
      res = await fetch(url, { method: 'POST', headers, body: formData, signal: opts.signal });
    } catch (err) {
      if (isAbortError(err) || opts.signal?.aborted) throw err;
      throw new ApiError('Unable to reach the server. Please try again.', 0);
    }

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (res.status === 401 && canRefresh && !path.startsWith('/auth/')) {
      const fresh = await refreshAccessToken();
      if (fresh) return doUpload(false); // exactly one retry
    }

    handleEnvelopeResponse(res, json, true);

    const envelope = json as ApiEnvelope<T> | null;
    return envelope?.data as T;
  };
  return doUpload(true);
}

export async function apiDownload(path: string, opts: { signal?: AbortSignal } = {}): Promise<Blob> {
  const doDownload = async (canRefresh: boolean): Promise<Blob> => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `${API_URL}${path}`;
    let res: Response;
    try {
      res = await fetch(url, { headers, signal: opts.signal });
    } catch (err) {
      if (isAbortError(err) || opts.signal?.aborted) throw err;
      throw new ApiError('Unable to reach the server. Please try again.', 0);
    }

    if (!res.ok) {
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (res.status === 401 && canRefresh && !path.startsWith('/auth/')) {
        const fresh = await refreshAccessToken();
        if (fresh) return doDownload(false); // exactly one retry
      }
      handleEnvelopeResponse(res, json, true);
    }

    return res.blob();
  };
  return doDownload(true);
}