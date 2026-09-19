import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, post, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

export default function Request() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    price_inr: '', delivery_days: '2', delivery_note: 'Next-day delivery',
    warranty: '1 year manufacturer', extras: '', message: '',
  });

  useEffect(() => {
    (async () => {
      const r = await api(`/requests/${id}`);
      setLoading(false);
      if (!r.ok) return Alert.alert('Could not load', r.error || 'Try again.');
      setData(r);
      const budget = r.request?.requirement?.budget_inr;
      if (budget) setForm((f) => ({ ...f, price_inr: String(Math.round(budget * 0.95)) }));
    })();
  }, [id]);

  async function submit() {
    const price = Number(form.price_inr);
    if (!Number.isFinite(price) || price <= 0) return Alert.alert('Price needed', 'Enter a valid price.');
    setSubmitting(true);
    // Your identity comes from the session — no store name to type in.
    const r = await post(`/requests/${id}/offers`, {
      ...form,
      price_inr: price,
      delivery_days: Number(form.delivery_days) || 0,
    });
    setSubmitting(false);
    if (r.ok) {
      Alert.alert(r.updated ? 'Bid updated' : 'Offer sent', 'The buyer can see your offer now.');
      router.back();
    } else {
      Alert.alert('Could not send', r.error || 'Try again.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.fuchsia} />
      </SafeAreaView>
    );
  }

  const requirement = data?.request?.requirement || {};
  const rivals = (data?.offers || []).filter((o: any) => o.status !== 'rejected');
  const best = rivals.length ? Math.min(...rivals.map((o: any) => o.price_inr)) : null;

  const input = {
    backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12,
    borderColor: colors.border, borderWidth: 1, marginBottom: 12, fontSize: 15,
  } as const;
  const label = { color: colors.muted, fontSize: 11, marginBottom: 6, letterSpacing: 0.5 } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 12 }}>Submit offer</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 18 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
            {requirement.summary || requirement.product}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            {requirement.budget_inr ? `Budget ${formatINR(requirement.budget_inr)}` : 'Flexible budget'}
            {requirement.location ? ` · ${requirement.location}` : ''}
            {` · Qty ${requirement.quantity || 1}`}
          </Text>
          {best != null && (
            <Text style={{ color: colors.amber, fontSize: 12, marginTop: 8 }}>
              🔥 Best bid so far: {formatINR(best)} — go below it to take the lead.
            </Text>
          )}
        </View>

        <Text style={label}>YOUR PRICE (₹)</Text>
        <TextInput value={form.price_inr} onChangeText={(t) => setForm({ ...form, price_inr: t.replace(/[^\d]/g, '') })} keyboardType="numeric" style={input} />

        <Text style={label}>DELIVERY DAYS (0 = same day)</Text>
        <TextInput value={form.delivery_days} onChangeText={(t) => setForm({ ...form, delivery_days: t.replace(/[^\d]/g, '') })} keyboardType="numeric" style={input} />

        <Text style={label}>DELIVERY NOTE</Text>
        <TextInput value={form.delivery_note} onChangeText={(t) => setForm({ ...form, delivery_note: t })} style={input} />

        <Text style={label}>WARRANTY</Text>
        <TextInput value={form.warranty} onChangeText={(t) => setForm({ ...form, warranty: t })} style={input} />

        <Text style={label}>EXTRAS / FREEBIES</Text>
        <TextInput value={form.extras} onChangeText={(t) => setForm({ ...form, extras: t })} placeholder="Free case + 10% bank offer" placeholderTextColor={colors.muted} style={input} />

        <Text style={label}>MESSAGE TO BUYER</Text>
        <TextInput value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} multiline placeholder="In stock, ready to dispatch today." placeholderTextColor={colors.muted} style={{ ...input, minHeight: 70, textAlignVertical: 'top' }} />

        <TouchableOpacity onPress={submit} disabled={submitting} style={{ borderRadius: 12, overflow: 'hidden', marginTop: 6, marginBottom: 30 }}>
          <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 15, alignItems: 'center' }}>
            {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Send offer</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
