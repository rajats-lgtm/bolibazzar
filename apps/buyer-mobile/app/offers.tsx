import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

export default function Offers() {
  const params = useLocalSearchParams<{ req: string; raw: string }>();
  const requirement = params.req ? JSON.parse(params.req as string) : null;
  const [request, setRequest] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!requirement) return;
      const saved = await AsyncStorage.getItem('bb_user');
      const user = saved ? JSON.parse(saved) : null;
      const r = await api('/requests', { method: 'POST', body: JSON.stringify({ requirement, raw_text: params.raw, buyer_name: user?.name || 'Guest Buyer', buyer_email: user?.email || null }) });
      if (r.ok) {
        setRequest(r.request);
        const sim = await api(`/requests/${r.request.id}/simulate`, { method: 'POST' });
        setOffers((sim.offers || []).sort((a: any, b: any) => (b.value_score || 0) - (a.value_score || 0)));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!request || countdown <= 0) return;
    if ([48, 36, 24, 12].includes(countdown)) {
      api(`/requests/${request.id}/tick`, { method: 'POST' }).then((r: any) => { if (r.ok) setOffers(r.offers); });
    }
    const t = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, request]);

  async function accept(offer: any) {
    Alert.alert('Accept & Pay', `Pay ${formatINR(offer.price_inr)} to ${offer.supplier_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pay now', onPress: async () => {
        const r = await api('/payments/order', { method: 'POST', body: JSON.stringify({ offer_id: offer.id, amount_inr: offer.price_inr }) });
        if (!r.ok) return Alert.alert('Payment failed', r.error || 'Could not create order');
        if (r.mocked) {
          const verified = await api('/payments/verify', { method: 'POST', body: JSON.stringify({ razorpay_order_id: r.order_id, razorpay_payment_id: `mock_payment_${Date.now()}`, razorpay_signature: 'mock' }) });
          if (verified.ok && verified.status === 'paid') {
            const accepted = await api(`/offers/${offer.id}/accept`, { method: 'POST', body: JSON.stringify({}) });
            return Alert.alert(accepted.ok ? 'Order confirmed' : 'Payment complete', accepted.ok ? 'Your offer is accepted. Delivery tracking is now available.' : 'Payment was recorded successfully.');
          }
        }
        Alert.alert('Order created', 'Complete payment in the configured Razorpay checkout.');
      }}
    ]);
  }

  if (loading) return (<SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.fuchsia} /><Text style={{ color: colors.muted, marginTop: 12 }}>Notifying verified suppliers...</Text></SafeAreaView>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>LIVE REQUEST</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{requirement?.summary || requirement?.product}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {countdown > 0 && (
          <View style={{ borderRadius: 16, backgroundColor: countdown < 15 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: countdown < 15 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)', padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Live bidding open</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>Suppliers can drop prices</Text>
              </View>
              <Text style={{ color: countdown < 15 ? '#f87171' : '#fbbf24', fontSize: 26, fontWeight: '800' }}>{countdown}s</Text>
            </View>
          </View>
        )}
        {offers.map((o) => (
          <View key={o.id} style={{ borderRadius: 16, backgroundColor: o.ai_pick ? 'rgba(225,29,72,0.06)' : colors.card, borderWidth: 1, borderColor: o.ai_pick ? 'rgba(225,29,72,0.4)' : colors.border, padding: 14, marginBottom: 12 }}>
            {o.ai_pick && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="sparkles" size={12} color={colors.fuchsia} />
                <Text style={{ color: colors.fuchsia, fontSize: 11, fontWeight: '600', marginLeft: 4 }}>AI PICK · BEST VALUE</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{o.supplier_name}</Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>★ {o.rating} ({o.reviews}) · {o.delivery_note}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{o.warranty}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{formatINR(o.price_inr)}</Text>
                <Text style={{ color: colors.muted, fontSize: 10 }}>AI score {o.value_score}</Text>
              </View>
            </View>
            {o.extras ? <Text style={{ color: colors.emerald, fontSize: 12, marginTop: 8 }}>✨ {o.extras}</Text> : null}
            <TouchableOpacity onPress={() => accept(o)} style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={o.ai_pick ? [colors.indigo, colors.orange] : ['#334155', '#1e293b']} start={{x:0,y:0}} end={{x:1,y:0}} style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Accept & Pay</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
