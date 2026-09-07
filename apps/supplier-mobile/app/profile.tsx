import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

export default function Profile() {
  const [supplier, setSupplier] = useState<any>(null);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  useEffect(() => {
    AsyncStorage.getItem('bb_supplier').then((s) => { if (s) setSupplier(JSON.parse(s)); });
  }, []);
  async function login() {
    if (!businessName || !email) return Alert.alert('Missing', 'Business name + email needed');
    const r = await api('/suppliers/session', { method: 'POST', body: JSON.stringify({ business_name: businessName, email }) });
    if (r.ok) { await AsyncStorage.setItem('bb_supplier', JSON.stringify(r.supplier)); setSupplier(r.supplier); }
  }
  async function logout() { await AsyncStorage.removeItem('bb_supplier'); setSupplier(null); }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!supplier ? (
          <View>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Supplier onboarding</Text>
            <TextInput value={businessName} onChangeText={setBusinessName} placeholder="Business name" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12, marginBottom: 10 }} />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={{ backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12, marginBottom: 12 }} />
            <TouchableOpacity onPress={login} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={[colors.indigo, colors.orange]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding: 14, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{supplier.business_name}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{supplier.email}</Text>
            <View style={{ marginTop: 16, backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, borderRadius: 16, padding: 16 }}>
              <Text style={{ color: colors.muted, fontSize: 11, textTransform: 'uppercase' }}>Account status</Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{supplier.status || 'pending_review'}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>You can submit offers while verification is reviewed.</Text>
            </View>
            <TouchableOpacity onPress={logout} style={{ marginTop: 24, padding: 14, borderColor: colors.border, borderWidth: 1, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.muted }}>Sign out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
