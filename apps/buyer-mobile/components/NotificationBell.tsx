import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, AppState } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { colors } from '../lib/theme';

/**
 * Bell with an unread count, for the header of each home screen.
 *
 * Refreshes on a slow timer and whenever the app returns to the foreground or
 * the screen regains focus — the interesting case is a price drop that landed
 * while the phone was in a pocket, and polling faster than that only burns
 * battery for a number that changes every few minutes at most.
 */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  const load = useCallback(async () => {
    const r = await api('/notifications');
    if (r.ok) setUnread(r.unread || 0);
  }, []);

  useEffect(() => { load(); }, [load, pathname]);

  useEffect(() => {
    const timer = setInterval(load, 30000);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') load(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [load]);

  return (
    <TouchableOpacity onPress={() => router.push('/notifications')} hitSlop={10} style={{ padding: 4 }}>
      <Ionicons name="notifications-outline" size={22} color={colors.text} />
      {unread > 0 && (
        <View
          style={{
            position: 'absolute', top: 0, right: 0,
            minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
            backgroundColor: colors.fuchsia, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 9, fontWeight: '800' }}>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
