import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, post, formatINR } from '../../lib/api';
import { colors } from '../../lib/theme';

const STAGES = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const LABELS: Record<string, string> = {
  confirmed: 'Order confirmed', packed: 'Packed at store', shipped: 'Shipped',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered',
};

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api('/supplier/orders');
    if (r.status === 401) { setSignedIn(false); setLoading(false); setRefreshing(false); return; }
    setSignedIn(true);
    if (r.ok) setOrders(r.orders || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function advance(order: any) {
    const next = STAGES[STAGES.indexOf(order.stage) + 1];
    if (!next) return;
    setBusy(order.id);
    const r = await post(`/orders/${order.id}/stage`, { stage: next });
    setBusy(null);
    if (r.ok) load();
    else Alert.alert('Could not update', r.error || 'Try again.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Orders to fulfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.fuchsia} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.fuchsia} style={{ marginTop: 40 }} />
        ) : !signedIn ? (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>Sign in to see your orders.</Text>
        ) : orders.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40, lineHeight: 20 }}>
            No orders yet. Win a bid and it appears here for dispatch.
          </Text>
        ) : (
          orders.map((o) => {
            const index = STAGES.indexOf(o.stage);
            const next = STAGES[index + 1];
            return (
              <View key={o.id} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 0.5 }}>
                  {o.tracking_id} · {o.courier}
                </Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 4 }}>{o.product}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                  Deliver to {o.to_city} · {formatINR(o.amount_inr)}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
                  {STAGES.map((s, i) => (
                    <View key={s} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i <= index ? colors.emerald : 'rgba(255,255,255,0.12)' }} />
                      {i < STAGES.length - 1 && (
                        <View style={{ position: 'absolute', top: 5, left: '50%', right: '-50%', height: 2, backgroundColor: i < index ? colors.emerald : 'rgba(255,255,255,0.12)' }} />
                      )}
                    </View>
                  ))}
                </View>
                <Text style={{ color: colors.text, fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                  {LABELS[o.stage] || o.stage}
                </Text>

                {next && (
                  <TouchableOpacity
                    onPress={() => advance(o)}
                    disabled={busy === o.id}
                    style={{ marginTop: 14, backgroundColor: colors.indigo, padding: 13, borderRadius: 12, alignItems: 'center' }}
                  >
                    {busy === o.id ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontWeight: '700' }}>Mark {LABELS[next].toLowerCase()}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
