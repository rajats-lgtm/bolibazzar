import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, formatINR } from '../../lib/api';
import { colors } from '../../lib/theme';

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: tone || colors.text, fontSize: 22, fontWeight: '800', marginTop: 3 }}>{value}</Text>
    </View>
  );
}

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);

  const load = useCallback(async () => {
    const r = await api('/analytics/supplier');
    if (r.status === 401) { setSignedIn(false); setLoading(false); return; }
    setSignedIn(true);
    if (r.ok) setData(r);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        {loading ? (
          <ActivityIndicator color={colors.fuchsia} style={{ marginTop: 40 }} />
        ) : !signedIn ? (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>Sign in to see your analytics.</Text>
        ) : !data ? (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>No data yet.</Text>
        ) : (
          <>
            <Text style={{ color: colors.muted, marginBottom: 14 }}>{data.supplier?.business_name}</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Stat label="Open requests" value={data.stats.open_requests} />
              <Stat label="Offers submitted" value={data.stats.offers_submitted} />
              <Stat label="Won" value={data.stats.offers_won} tone={colors.emerald} />
              <Stat label="Win rate" value={`${data.stats.win_rate_pct}%`} tone={colors.amber} />
              <Stat label="Revenue" value={formatINR(data.stats.revenue_inr)} tone={colors.emerald} />
              <Stat
                label="Avg. gap above winner"
                value={data.stats.avg_price_gap_pct > 0 ? `+${data.stats.avg_price_gap_pct}%` : '—'}
                tone={data.stats.avg_price_gap_pct > 0 ? '#f87171' : colors.text}
              />
            </View>

            {data.hot_cities?.length > 0 && (
              <View style={{ marginTop: 22 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>🔥 Hot buyer cities</Text>
                {data.hot_cities.map((c: any) => (
                  <View key={c.city} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{c.city}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>{c.count} request{c.count === 1 ? '' : 's'}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.hot_categories?.length > 0 && (
              <View style={{ marginTop: 22 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>⚡ Hot categories</Text>
                {data.hot_categories.map((c: any) => (
                  <View key={c.sub_category} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 13, textTransform: 'capitalize' }}>
                      {String(c.sub_category).replace('_', ' ')}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>{c.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
