import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, post } from '../lib/api';
import { colors } from '../lib/theme';

/**
 * In-app notification feed.
 *
 * Push covers the phone being asleep, but push is best-effort — it is silently
 * unavailable in Expo Go, and a buyer can decline the permission outright. This
 * feed is the reliable record, and it is the same one the web app shows.
 *
 * Tapping an entry opens whatever it is about, so a price-drop alert is one tap
 * from the auction it belongs to.
 */

const ICONS: Record<string, any> = {
  new_request: 'megaphone-outline',
  new_offer: 'pricetag-outline',
  price_drop: 'trending-down-outline',
  offer_won: 'trophy-outline',
  chat_message: 'chatbubble-outline',
  order_stage: 'cube-outline',
};

const TINTS: Record<string, string> = {
  new_request: colors.indigo,
  new_offer: colors.fuchsia,
  price_drop: colors.emerald,
  offer_won: colors.amber,
  chat_message: colors.fuchsia,
  order_stage: colors.indigo,
};

function ago(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api('/notifications');
    if (r.ok) { setItems(r.notifications || []); setError(null); }
    else setError(r.status === 401 ? 'Sign in to see your notifications.' : r.error || 'Could not load notifications.');
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Opening the feed is the read receipt, exactly as on the web.
  useEffect(() => {
    if (!items.length) return;
    const unread = items.filter((n) => !n.read).map((n) => n.id);
    if (!unread.length) return;
    post('/notifications/read', { ids: unread }).catch(() => null);
  }, [items]);

  function open(n: any) {
    const data = n.data || {};
    if (n.type === 'chat_message' && data.offer_id) {
      router.push({ pathname: '/chat', params: { offerId: data.offer_id, title: n.title } });
      return;
    }
    if ((n.type === 'new_offer' || n.type === 'price_drop') && data.request_id) {
      router.push({ pathname: '/buyer/offers', params: { requestId: data.request_id } });
      return;
    }
    if (n.type === 'order_stage') { router.push('/buyer/orders'); return; }
    if (n.type === 'offer_won') { router.push('/supplier/orders'); return; }
    if (n.type === 'new_request') router.push('/supplier');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 12 }}>Notifications</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.fuchsia}
          />
        }
      >
        {loading && (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <ActivityIndicator color={colors.fuchsia} />
          </View>
        )}

        {!loading && !!error && (
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 50 }}>{error}</Text>
        )}

        {!loading && !error && !items.length && (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
              Nothing yet.{'\n'}Offers, price drops and order updates land here.
            </Text>
          </View>
        )}

        {items.map((n) => (
          <TouchableOpacity
            key={n.id}
            onPress={() => open(n)}
            style={{
              flexDirection: 'row', gap: 12, alignItems: 'flex-start',
              borderWidth: 1, borderColor: n.read ? colors.border : 'rgba(225,29,72,0.35)',
              backgroundColor: n.read ? colors.card : 'rgba(225,29,72,0.06)',
              borderRadius: 16, padding: 14, marginBottom: 10,
            }}
          >
            <View
              style={{
                height: 36, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                backgroundColor: (TINTS[n.type] || colors.indigo) + '26',
              }}
            >
              <Ionicons name={ICONS[n.type] || 'notifications-outline'} size={17} color={TINTS[n.type] || colors.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, flex: 1 }} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginLeft: 8 }}>{ago(n.created_at)}</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3, lineHeight: 18 }}>{n.body}</Text>
            </View>
            {!n.read && <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: colors.fuchsia, marginTop: 6 }} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
