import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API client for the supplier app.
 *
 * Native apps cannot rely on a cookie jar, so the session token returned at
 * login is stored locally and sent as `Authorization: Bearer <token>`.
 */

const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ||
  'http://localhost:3000/api';

const TOKEN_KEY = 'bb_supplier_token';

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== null) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function setToken(token: string | null) {
  cachedToken = token;
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage is best-effort; the in-memory token still works this session.
  }
}

export type ApiResult = { ok: boolean; status: number; [key: string]: any };

export async function api(path: string, options: RequestInit = {}): Promise<ApiResult> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(BASE + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    // A rejected token means the session is gone — clear it so the UI can
    // send the user back to sign-in instead of looping on 401s.
    if (response.status === 401 && token) await setToken(null);
    return { ok: response.ok, status: response.status, ...data };
  } catch (error: any) {
    return { ok: false, status: 0, error: 'Network error. Check your connection.' };
  }
}

export const post = (path: string, body?: any) =>
  api(path, { method: 'POST', body: JSON.stringify(body || {}) });

export const formatINR = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n)) ? '—' : '₹' + Number(n).toLocaleString('en-IN');

export const API_BASE = BASE;
