import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Request() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ supplier_name: '', price_inr: '', delivery_days: '2', warranty: '1 year manufacturer', extras: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api(`/requests/${id}`).then((r: any) => { setData(r); setLoading(false); if (r.request?.requirement?.budget_inr) setForm(f => ({ ...f, price_inr: String(Math.round(r.request.requirement.budget_inr * 0.95)) })); }); }, [id]);

  async function submit() {
    if (!form.supplier_name || !form.price_inr) return Alert.alert('Missing', 'Store name and price required');
    setSubmitting(true);
    const saved = await AsyncStorage.getItem('bb_supplier');
    const supplier = saved ? JSON.parse(saved) : null;
    const r = await api(`/requests/${id}/offers`, { method: 'POST', body: JSON.stringify({ ...form, supplier_id: supplier?.id || null, supplier_email: supplier?.email || null, supplier_type: supplier?.supplier_type || 'retail_store', rating: supplier?.rating, reviews: supplier?.reviews }) });
    setSubmitting(false);
    if (r.ok) { Alert.alert('Sent', 'Offer sent to buyer'); router.back(); }
    else Alert.alert('Failed', r.error || 'Try again');
  }

  if (loading || !data) return (<SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.fuchsia} /></SafeAreaView>);
  const req = data.request;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 12 }}>Submit offer</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 10, textTransform: 'uppercase' }}>Buyer wants</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 }}>{req.requirement?.summary || req.requirement?.product}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>Budget {formatINR(req.requirement?.budget_inr)} · {req.requirement?.location}</Text>
        </View>

        {[
          ['Store name', 'supplier_name', 'Croma - Andheri'],
          ['Your price (₹)', 'price_inr', '110000'],
          ['Delivery days', 'delivery_days', '2'],
          ['Warranty', 'warranty', '1 year manufacturer'],
          ['Extras', 'extras', 'Free case + HDFC 10% off'],
          ['Message to buyer', 'message', 'In stock, dispatch today'],
        ].map(([label, key, ph]) => (
          <View key={key} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>{label}</Text>
            <TextInput
              value={(form as any)[key]}
              onChangeText={(v) => setForm({ ...form, [key]: v })}
              placeholder={ph as string}
              placeholderTextColor={colors.muted}
              keyboardType={key === 'price_inr' || key === 'delivery_days' ? 'numeric' : 'default'}
              style={{ backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 10, borderColor: colors.border, borderWidth: 1 }}
            />
          </View>
        ))}

        <TouchableOpacity onPress={submit} disabled={submitting} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
          <LinearGradient colors={[colors.indigo, colors.orange]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding: 14, alignItems: 'center' }}>
            {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Send offer</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
