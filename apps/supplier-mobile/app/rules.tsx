import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { colors } from '../lib/theme';

export default function Rules() {
  const [supplier, setSupplier] = useState<any>(null); const [rules, setRules] = useState<any[]>([]); const [discount, setDiscount] = useState('5');
  async function load() { const saved = await AsyncStorage.getItem('bb_supplier'); const current = saved ? JSON.parse(saved) : null; setSupplier(current); if (current?.email) { const r = await api(`/supplier/rules/${encodeURIComponent(current.email)}`); setRules(r.rules || []); } }
  useEffect(() => { load(); }, []);
  async function add() { if (!supplier?.email) return Alert.alert('Set up supplier profile first'); const r = await api('/supplier/rules', { method: 'POST', body: JSON.stringify({ supplier_email: supplier.email, name: 'Mobile auto-bid', discount_pct: Number(discount) || 5, sub_category: 'any', delivery_days: 2, message: 'Best price from our store.' }) }); if (r.ok) { setRules([r.rule, ...rules]); Alert.alert('Rule active', 'Matching requests will receive an automatic offer.'); } else Alert.alert('Could not save', r.error || 'Try again'); }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}><TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity><Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Auto-bid rules</Text></View><ScrollView contentContainerStyle={{ padding: 16 }}><Text style={{ color: colors.muted, lineHeight: 20 }}>Automatically respond to matching buyer requests with a price below their budget.</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 20, marginBottom: 6 }}>DISCOUNT FROM BUYER BUDGET (%)</Text><TextInput value={discount} onChangeText={setDiscount} keyboardType="numeric" style={{ backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12, borderColor: colors.border, borderWidth: 1 }} /><TouchableOpacity onPress={add} style={{ marginTop: 12, backgroundColor: colors.indigo, padding: 14, borderRadius: 12, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>Add active rule</Text></TouchableOpacity><Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 26, marginBottom: 10 }}>Your rules</Text>{rules.map((rule) => <View key={rule.id} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 }}><Text style={{ color: colors.text, fontWeight: '600' }}>{rule.name}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{rule.discount_pct}% below budget · {rule.enabled ? 'Active' : 'Paused'}</Text></View>)}</ScrollView></SafeAreaView>;
}
