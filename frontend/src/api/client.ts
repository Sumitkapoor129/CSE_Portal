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
  const { method = 'GET', body, query } = options;

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
    });
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `Request failed (${res.status}).`;
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
    throw new ApiError(message, res.status, fields);
  }

  const envelope = json as ApiEnvelope<T> | null;
  return envelope?.data as T;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  return doFetch(path, options, true);
}