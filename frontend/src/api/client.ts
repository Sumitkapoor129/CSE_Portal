export const TOKEN_KEY = 'cse_portal_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
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
    if (res.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(message, res.status);
  }

  const envelope = json as ApiEnvelope<T> | null;
  return envelope?.data as T;
}