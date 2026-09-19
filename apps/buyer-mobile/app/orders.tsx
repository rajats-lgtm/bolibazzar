import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

const STAGES = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
];

function Tracker({ offerId }: { offerId: string }) {
  const [delivery, setDelivery] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const r = await api(`/delivery/${offerId}`);
        if (active && r.ok) setDelivery(r.delivery);
      })();
      return () => { active = false; };
    }, [offerId])
  );

  if (!delivery) return null;
  const index = STAGES.findIndex((s) => s.key === delivery.stage);

  return (
    <View style={{ marginTop: 14, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{delivery.courier} · {delivery.tracking_id}</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          {delivery.delivered ? 'Delivered' : `ETA ${delivery.eta_days} day${delivery.eta_days === 1 ? '' : 's'}`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {STAGES.map((s, i) => (
          <View key={s.key} style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: i <= index ? colors.emerald : 'rgba(255,255,255,0.12)',
              }}
            />
            {i < STAGES.length - 1 && (
              <View
                style={{
                  position: 'absolute', top: 6, left: '50%', right: '-50%', height: 2,
                  backgroundColor: i < index ? colors.emerald : 'rgba(255,255,255,0.12)',
                }}
              />
            )}
          </View>
        ))}
      </View>
      <Text style={{ color: colors.text, fontSize: 12, marginTop: 10, textAlign: 'center' }}>
        {STAGES[index]?.label || delivery.stage}
      </Text>
    </View>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const r = await api('/orders');
    if (r.status === 401) { setSignedIn(false); setLoading(false); return; }
    setSignedIn(true);
    if (r.ok) setOrders(r.orders || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>My orders</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.fuchsia} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.fuchsia} style={{ marginTop: 40 }} />
        ) : !signedIn ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Sign in to see your orders.</Text>
            <TouchableOpacity onPress={() => router.push('/profile')} style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderColor: colors.border, borderWidth: 1 }}>
              <Text style={{ color: colors.text }}>Go to profile</Text>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
            No orders yet. Post a requirement and accept a winning offer.
          </Text>
        ) : (
          orders.map((o) => (
            <View key={o.id} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{o.product}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                {o.supplier_name} · {o.from_city} → {o.to_city}
              </Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 }}>
                {formatINR(o.amount_inr)}
              </Text>
              {o.wallet_used_inr > 0 && (
                <Text style={{ color: colors.emerald, fontSize: 11, marginTop: 2 }}>
                  Wallet applied −{formatINR(o.wallet_used_inr)}
                </Text>
              )}
              <Tracker offerId={o.offer_id} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
