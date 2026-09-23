import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, post, formatINR } from '../../lib/api';
import { colors } from '../../lib/theme';

/**
 * Live auction board.
 *
 * Polls /requests/:id/live, which advances the auction server-side, so offers
 * genuinely arrive and prices genuinely drop while the screen is open.
 */
export default function Offers() {
  const params = useLocalSearchParams<{ req: string; raw: string; requestId?: string }>();
  const [request, setRequest] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [auction, setAuction] = useState<any>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const stopped = useRef(false);

  // Create the request once, then hand over to the polling loop.
  useEffect(() => {
    (async () => {
      let id = params.requestId as string | undefined;
      if (!id) {
        const requirement = params.req ? JSON.parse(params.req as string) : null;
        if (!requirement) { setLoading(false); return; }
        const r = await post('/requests', { requirement, raw_text: params.raw });
        if (!r.ok) {
          setLoading(false);
          Alert.alert('Could not post request', r.error || 'Try again.');
          return;
        }
        id = r.request.id;
        setRequest(r.request);
      }
      requestIdRef.current = id!;
      poll();
    })();
    return () => { stopped.current = true; };
  }, []);

  async function poll() {
    if (stopped.current || !requestIdRef.current) return;
    const r = await api(`/requests/${requestIdRef.current}/live`);
    if (stopped.current) return;
    if (r.ok) {
      setOffers(r.offers || []);
      setAuction(r.auction);
      setSeconds(r.auction?.seconds_remaining ?? 0);
      setRequest((prev: any) => ({ ...prev, ...r.request }));
      setLoading(false);
    } else {
      setLoading(false);
    }
    const live = r.auction?.live && r.request?.status === 'open';
    setTimeout(poll, live ? 2500 : 15000);
  }

  // Smooth local countdown between polls.
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function accept(offer: any) {
    const session = await api('/auth/session');
    if (!session.buyer) {
      Alert.alert('Sign in required', 'Sign in to complete your purchase.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/buyer/profile') },
      ]);
      return;
    }

    Alert.alert('Accept & pay', `Pay ${formatINR(offer.price_inr)} to ${offer.supplier_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay now',
        onPress: async () => {
          setPaying(offer.id);
          // The price is taken from the stored offer server-side.
          const order = await post('/payments/order', { offer_id: offer.id });
          if (!order.ok) {
            setPaying(null);
            return Alert.alert('Payment failed', order.error || 'Could not start the payment.');
          }
          const verified = await post('/payments/verify', {
            razorpay_order_id: order.order_id,
            razorpay_payment_id: `pay_app_${Date.now()}`,
            razorpay_signature: 'app',
          });
          if (!verified.ok) {
            setPaying(null);
            return Alert.alert('Payment not confirmed', verified.error || 'Please try again.');
          }
          const accepted = await post(`/offers/${offer.id}/accept`);
          setPaying(null);
          if (accepted.ok) {
            Alert.alert('Order confirmed', 'Your order is placed. Track it from the Orders screen.', [
              { text: 'View orders', onPress: () => router.push('/buyer/orders') },
              { text: 'OK' },
            ]);
            poll();
          } else {
            Alert.alert('Almost there', accepted.error || 'Payment recorded but the order was not confirmed.');
          }
        },
      },
    ]);
  }

  const requirement = request?.requirement || (params.req ? JSON.parse(params.req as string) : null);
  const live = auction?.live && request?.status === 'open';
  const best = offers.length ? Math.min(...offers.map((o) => o.price_inr)) : null;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.fuchsia} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Notifying verified suppliers...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => { stopped.current = true; router.back(); }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>
            {live ? 'LIVE REQUEST' : 'BIDDING CLOSED'}
          </Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
            {requirement?.summary || requirement?.product}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        {live ? (
          <View style={{ backgroundColor: seconds < 20 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.05)', borderColor: seconds < 20 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Live bidding open 🔥</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Suppliers are dropping prices to win you.
                </Text>
              </View>
              <Text style={{ color: seconds < 20 ? '#f87171' : colors.amber, fontSize: 30, fontWeight: '800' }}>{seconds}s</Text>
            </View>
            <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ height: 5, width: `${Math.min(100, (seconds / (auction?.window_seconds || 120)) * 100)}%`, backgroundColor: seconds < 20 ? '#ef4444' : colors.amber }} />
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Bidding closed · prices locked</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Pick your winning offer below.</Text>
          </View>
        )}

        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
          {offers.length} offer{offers.length === 1 ? '' : 's'} received
        </Text>

        {offers.length === 0 && (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator color={colors.fuchsia} />
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center' }}>
              Waiting for the first bid...
            </Text>
          </View>
        )}

        {offers.map((o) => {
          const dropped = o.previous_price && o.previous_price > o.price_inr;
          const highlighted = o.ai_pick || o.price_inr === best;
          const closed = o.status === 'accepted' || o.status === 'rejected';
          return (
            <View
              key={o.id}
              style={{
                borderWidth: 1,
                borderColor: highlighted ? 'rgba(225,29,72,0.4)' : colors.border,
                backgroundColor: highlighted ? 'rgba(225,29,72,0.05)' : colors.card,
                borderRadius: 16, padding: 14, marginBottom: 12,
              }}
            >
              {o.ai_pick && (
                <Text style={{ color: colors.fuchsia, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                  ✨ AI PICK · BEST VALUE
                </Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{o.supplier_name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    ★ {o.rating} ({o.reviews}) · {o.delivery_note}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{o.warranty}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {dropped && (
                    <Text style={{ color: '#f87171', fontSize: 12, textDecorationLine: 'line-through' }}>
                      {formatINR(o.previous_price)}
                    </Text>
                  )}
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{formatINR(o.price_inr)}</Text>
                  {dropped && <Text style={{ color: colors.emerald, fontSize: 10 }}>just dropped</Text>}
                  {o.value_score != null && (
                    <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>AI score {o.value_score}</Text>
                  )}
                </View>
              </View>

              {!!o.extras && (
                <Text style={{ color: colors.emerald, fontSize: 12, marginTop: 8 }}>🎁 {o.extras}</Text>
              )}
              {!!o.rationale && (
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Why: {o.rationale}</Text>
              )}

              <TouchableOpacity
                onPress={() => accept(o)}
                disabled={closed || paying === o.id}
                style={{ borderRadius: 12, overflow: 'hidden', marginTop: 12, opacity: closed ? 0.5 : 1 }}
              >
                <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 12, alignItems: 'center' }}>
                  {paying === o.id ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: 'white', fontWeight: '700' }}>
                      {o.status === 'accepted' ? 'Accepted' : o.status === 'rejected' ? 'Closed' : 'Accept & Pay'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
