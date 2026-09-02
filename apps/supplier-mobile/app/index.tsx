import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

export default function SupplierHome() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, total: 0 });

  async function load() {
    setLoading(true);
    const r = await api('/requests');
    const list = r.requests || [];
    setRequests(list);
    setStats({ open: list.filter((x: any) => x.status === 'open').length, total: list.length });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

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
        <TouchableOpacity onPress={() => router.push('/analytics')} style={{ padding: 8 }}>
          <Ionicons name="stats-chart" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshing={loading} onRefresh={load}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', lineHeight: 32 }}>Incoming buyer requests</Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>Live requirements. Submit your best offer to win.</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 8 }}>
          <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
            <Text style={{ color: colors.muted, fontSize: 10, textTransform: 'uppercase' }}>Open</Text>
            <Text style={{ color: colors.emerald, fontSize: 26, fontWeight: '800' }}>{stats.open}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
            <Text style={{ color: colors.muted, fontSize: 10, textTransform: 'uppercase' }}>Total</Text>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{stats.total}</Text>
          </View>
        </View>

        {loading ? <ActivityIndicator color={colors.fuchsia} style={{ marginTop: 30 }} /> :
          requests.map((r) => (
            <TouchableOpacity key={r.id} onPress={() => router.push({ pathname: '/request', params: { id: r.id } })} style={{ backgroundColor: colors.card, borderColor: r.status === 'open' ? 'rgba(16,185,129,0.3)' : colors.border, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: r.status === 'open' ? colors.emerald : colors.muted }} />
                <Text style={{ color: colors.muted, fontSize: 10, textTransform: 'uppercase' }}>{r.status} · {new Date(r.created_at).toLocaleDateString('en-IN')}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, marginTop: 6 }}>{r.requirement?.summary || r.requirement?.product}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {r.requirement?.brand ? <Chip label={r.requirement.brand} /> : null}
                {r.requirement?.budget_inr ? <Chip label={`Budget ${formatINR(r.requirement.budget_inr)}`} /> : null}
                {r.requirement?.location ? <Chip label={r.requirement.location} /> : null}
              </View>
            </TouchableOpacity>
          ))
        }
      </ScrollView>

      <TouchableOpacity onPress={() => router.push('/rules')} style={{ position: 'absolute', bottom: 24, right: 24, borderRadius: 28, overflow: 'hidden' }}>
        <LinearGradient colors={[colors.indigo, colors.orange]} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="flash" size={18} color="white" />
          <Text style={{ color: 'white', fontWeight: '700' }}>Auto-bid rules</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Chip({ label }: { label: string }) {
  return <Text style={{ color: colors.muted, fontSize: 11, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>{label}</Text>;
}
