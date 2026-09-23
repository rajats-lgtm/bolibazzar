import Constants from 'expo-constants';
import { getSession, clearSession } from './session';

/**
 * API client.
 *
 * Native apps have no reliable cookie jar, so the session token issued at
 * login is sent as `Authorization: Bearer <token>`.
 */

const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ||
  'http://localhost:3000/api';

export type ApiResult = { ok: boolean; status: number; [key: string]: any };

export async function api(path: string, options: RequestInit = {}): Promise<ApiResult> {
  const session = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  try {
    const response = await fetch(BASE + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    // A rejected token means the session is gone; drop it so the UI can send
    // the user back to sign-in instead of looping on 401s.
    if (response.status === 401 && session?.token) await clearSession();
    return { ok: response.ok, status: response.status, ...data };
  } catch {
    return { ok: false, status: 0, error: 'Network error. Check your connection.' };
  }
}

export const post = (path: string, body?: any) =>
  api(path, { method: 'POST', body: JSON.stringify(body || {}) });

export const del = (path: string) => api(path, { method: 'DELETE' });

export const formatINR = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n)) ? '—' : '₹' + Number(n).toLocaleString('en-IN');

export const API_BASE = BASE;
