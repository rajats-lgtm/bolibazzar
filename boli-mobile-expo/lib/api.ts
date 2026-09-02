import Constants from 'expo-constants';

const BASE = (Constants.expoConfig?.extra as any)?.apiBaseUrl || 'https://request-to-offers.preview.emergentagent.com/api';

export async function api(path: string, options: RequestInit = {}) {
  const url = BASE + path;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...data };
}

export const formatINR = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n)) ? '—' : '₹' + Number(n).toLocaleString('en-IN');
