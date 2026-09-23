import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, post } from '../../lib/api';
import { colors } from '../../lib/theme';

const CATEGORIES = ['any', 'smartphone', 'laptop', 'tablet', 'tv', 'headphones'];

export default function Rules() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: 'Mobile auto-bid', brand: '', sub_category: 'any',
    discount_pct: '5', delivery_days: '2', min_price: '',
  });

  const load = useCallback(async () => {
    const r = await api('/supplier/rules');
    if (r.status === 401) { setLoading(false); return; }
    if (r.ok) setRules(r.rules || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    setSaving(true);
    const r = await post('/supplier/rules', {
      name: form.name,
      brand: form.brand.trim() || null,
      sub_category: form.sub_category,
      discount_pct: Number(form.discount_pct) || 5,
      delivery_days: Number(form.delivery_days) || 2,
      min_price: form.min_price ? Number(form.min_price) : null,
      message: 'Best price from our store.',
    });
    setSaving(false);
    if (r.ok) { Alert.alert('Rule active', 'Matching requests will now get an automatic offer.'); load(); }
    else Alert.alert('Could not save', r.error || 'Try again.');
  }

  async function toggle(rule: any) {
    await post(`/supplier/rules/${rule.id}/toggle`);
    load();
  }

  async function remove(rule: any) {
    Alert.alert('Delete rule', `Remove "${rule.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await api(`/supplier/rules/${rule.id}`, { method: 'DELETE' }); load(); },
      },
    ]);
  }

  const input = {
    backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12,
    borderColor: colors.border, borderWidth: 1, marginBottom: 12,
  } as const;
  const label = { color: colors.muted, fontSize: 11, marginBottom: 6, letterSpacing: 0.5 } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Auto-bid rules</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        <Text style={{ color: colors.muted, lineHeight: 20, marginBottom: 20 }}>
          Bid automatically on matching requests, even while you sleep. Your rule fires the moment a buyer posts.
        </Text>

        <Text style={label}>RULE NAME</Text>
        <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} style={input} />

        <Text style={label}>BRAND (blank = any)</Text>
        <TextInput value={form.brand} onChangeText={(t) => setForm({ ...form, brand: t })} placeholder="Apple" placeholderTextColor={colors.muted} style={input} />

        <Text style={label}>CATEGORY</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setForm({ ...form, sub_category: c })}
              style={{
                paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1,
                borderColor: form.sub_category === c ? colors.fuchsia : colors.border,
                backgroundColor: form.sub_category === c ? 'rgba(225,29,72,0.12)' : 'transparent',
              }}
            >
              <Text style={{ color: form.sub_category === c ? colors.fuchsia : colors.muted, fontSize: 12, textTransform: 'capitalize' }}>
                {c.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={label}>DISCOUNT BELOW BUYER BUDGET (%)</Text>
        <TextInput value={form.discount_pct} onChangeText={(t) => setForm({ ...form, discount_pct: t.replace(/[^\d]/g, '') })} keyboardType="numeric" style={input} />

        <Text style={label}>DELIVERY DAYS</Text>
        <TextInput value={form.delivery_days} onChangeText={(t) => setForm({ ...form, delivery_days: t.replace(/[^\d]/g, '') })} keyboardType="numeric" style={input} />

        <Text style={label}>NEVER GO BELOW (₹, optional floor)</Text>
        <TextInput value={form.min_price} onChangeText={(t) => setForm({ ...form, min_price: t.replace(/[^\d]/g, '') })} keyboardType="numeric" placeholder="e.g. 80000" placeholderTextColor={colors.muted} style={input} />

        <TouchableOpacity onPress={add} disabled={saving} style={{ backgroundColor: colors.indigo, padding: 15, borderRadius: 12, alignItems: 'center' }}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Add active rule</Text>}
        </TouchableOpacity>

        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 10 }}>Your rules</Text>

        {loading ? (
          <ActivityIndicator color={colors.fuchsia} />
        ) : rules.length === 0 ? (
          <Text style={{ color: colors.muted }}>No rules yet.</Text>
        ) : (
          rules.map((rule) => (
            <View
              key={rule.id}
              style={{
                backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8,
                borderWidth: 1, borderColor: rule.enabled ? 'rgba(16,185,129,0.3)' : colors.border,
                opacity: rule.enabled ? 1 : 0.6,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{rule.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    {rule.brand ? `${rule.brand} · ` : ''}
                    {rule.sub_category !== 'any' ? `${rule.sub_category} · ` : ''}
                    {rule.discount_pct}% below budget · {rule.enabled ? 'Active' : 'Paused'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => toggle(rule)} style={{ padding: 8 }}>
                    <Ionicons name={rule.enabled ? 'pause' : 'play'} size={18} color={colors.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(rule)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={18} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
