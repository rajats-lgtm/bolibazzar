import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { AsyncStorage.getItem('bb_supplier').then(async (saved) => { const supplier = saved ? JSON.parse(saved) : null; if (supplier?.email) setData(await api(`/analytics/supplier/${encodeURIComponent(supplier.email)}`)); }); }, []);
  if (!data) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.fuchsia} /></SafeAreaView>;
  const stats = data.stats || {};
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}><TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity><Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Performance</Text></View>
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[["Open requests", stats.open_requests], ["Offers sent", stats.offers_submitted], ["Won", stats.offers_won], ["Win rate", `${stats.win_rate_pct || 0}%`]].map(([label, value]) => <View key={label} style={{ width: '47%', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}><Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text><Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 6 }}>{value}</Text></View>)}
      </View>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 10 }}>Recent offers</Text>
      {(data.recent_offers || []).map((offer: any) => <View key={offer.id} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 8 }}><Text style={{ color: colors.text, fontWeight: '600' }}>{formatINR(offer.price_inr)} · {offer.status}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{offer.message || 'Offer submitted'}</Text></View>)}
    </ScrollView>
  </SafeAreaView>;
}
