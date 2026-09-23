import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Who is signed in on this device.
 *
 * The app serves both buyers and suppliers, so the stored session carries the
 * role alongside the token. The server issues role-scoped tokens — a buyer
 * token can never satisfy a supplier route — so the role here is only used to
 * decide which part of the app to show.
 */

export type Role = 'buyer' | 'supplier';

export type Session = {
  role: Role;
  token: string;
  /** Display name, cached so the UI has something before the profile loads. */
  name?: string;
  email?: string;
};

const KEY = 'bb_session';

let cached: Session | null | undefined;

export async function getSession(): Promise<Session | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function setSession(session: Session | null) {
  cached = session;
  try {
    if (session) await AsyncStorage.setItem(KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Storage is best-effort; the in-memory value still works this session.
  }
}

export async function clearSession() {
  await setSession(null);
}

/** Where a signed-in user belongs. */
export function homeFor(role: Role) {
  return role === 'supplier' ? '/supplier' : '/buyer';
}
