import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

export default function Supplier() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/requests').then((r: any) => { setRequests(r.requests || []); setLoading(false); }); }, []);
  if (loading) return (<SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.fuchsia} /></SafeAreaView>);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Buyer requests</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {requests.map((r) => (
          <View key={r.id} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <Text style={{ color: r.status === 'open' ? colors.emerald : colors.muted, fontSize: 10, textTransform: 'uppercase' }}>{r.status} · {new Date(r.created_at).toLocaleDateString('en-IN')}</Text>
            <Text style={{ color: colors.text, fontWeight: '600', marginTop: 4 }}>{r.requirement?.summary || r.requirement?.product}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{r.requirement?.brand} · Budget {formatINR(r.requirement?.budget_inr)} · {r.requirement?.location}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
