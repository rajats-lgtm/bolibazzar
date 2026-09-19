import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

export default function SupplierHome() {
  const [supplier, setSupplier] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const session = await api('/auth/session');
    const current = session.ok ? session.supplier || null : null;
    setSupplier(current);
    if (!current) { setRequests([]); setLoading(false); setRefreshing(false); return; }
    const r = await api('/requests');
    if (r.ok) setRequests(r.requests || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = requests.filter((r) => r.status === 'open').length;
  const bidOn = requests.filter((r) => r.my_offer).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo size={32} />
          <View>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
              Boli<Text style={{ color: colors.fuchsia }}>Bazzar</Text>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 10 }}>Supplier</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => router.push('/analytics')} style={{ padding: 8 }}>
            <Ionicons name="stats-chart" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={{ padding: 8 }}>
            <Ionicons name="person-circle-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.fuchsia} style={{ marginTop: 40 }} />
      ) : !supplier ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="storefront-outline" size={48} color={colors.fuchsia} />
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
            Sign in to start bidding
          </Text>
          <Text style={{ color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            See live buyer requests from across India and win them with your best price.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={{ marginTop: 22, backgroundColor: colors.indigo, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Supplier sign in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.fuchsia} />}
        >
          {supplier.status !== 'approved' && (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.35)', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: colors.amber, fontWeight: '700' }}>Awaiting approval</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                You can browse live requests, but bidding unlocks once an admin approves your business.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
              <Text style={{ color: colors.muted, fontSize: 11 }}>Open requests</Text>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{open}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
              <Text style={{ color: colors.muted, fontSize: 11 }}>You bid on</Text>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{bidOn}</Text>
            </View>
          </View>

          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10 }}>Live buyer requests</Text>

          {requests.length === 0 && (
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 30, lineHeight: 20 }}>
              No requests yet. They appear here the moment a buyer posts one.
            </Text>
          )}

          {requests.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => router.push({ pathname: '/request', params: { id: r.id } })}
              disabled={r.status !== 'open' || supplier.status !== 'approved'}
              style={{
                backgroundColor: colors.card, borderColor: r.my_offer ? 'rgba(225,29,72,0.35)' : colors.border,
                borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10,
                opacity: r.status === 'open' ? 1 : 0.55,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: r.status === 'open' ? colors.emerald : colors.muted }} />
                <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1 }}>
                  {String(r.status).toUpperCase()} · {new Date(r.created_at).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 5 }} numberOfLines={2}>
                {r.requirement?.summary || r.requirement?.product}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                {r.requirement?.budget_inr ? `Budget ${formatINR(r.requirement.budget_inr)}` : 'Flexible budget'}
                {r.requirement?.location ? ` · ${r.requirement.location}` : ''}
                {` · Qty ${r.requirement?.quantity || 1}`}
              </Text>
              {r.my_offer && (
                <Text style={{ color: colors.fuchsia, fontSize: 12, marginTop: 6 }}>
                  ✓ You bid {formatINR(r.my_offer.price_inr)} · {r.my_offer.status}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
