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
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  useEffect(() => {
    AsyncStorage.getItem('bb_user').then((s) => { if (s) { const u = JSON.parse(s); setUser(u); loadWallet(u.email); } });
  }, []);
  async function loadWallet(em: string) {
    const r = await api(`/wallet/${encodeURIComponent(em)}`);
    if (r.ok) setWallet(r.wallet);
    const m = await api(`/me/${encodeURIComponent(em)}`);
    if (m.ok) setUser({ ...m.user });
  }
  async function login() {
    if (!name || !email) return Alert.alert('Missing', 'Name + email needed');
    const r = await api('/auth/session', { method: 'POST', body: JSON.stringify({ name, email }) });
    if (r.ok) { await AsyncStorage.setItem('bb_user', JSON.stringify(r.user)); setUser(r.user); loadWallet(email); }
  }
  async function logout() { await AsyncStorage.removeItem('bb_user'); setUser(null); setWallet(null); }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!user ? (
          <View>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Sign in</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12, marginBottom: 10 }} />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={{ backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12, marginBottom: 12 }} />
            <TouchableOpacity onPress={login} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={[colors.indigo, colors.orange]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding: 14, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>Hi {user.name?.split(' ')[0] || 'there'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{user.email}</Text>
            {user.tier && (
              <View style={{ marginTop: 16, backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)', borderWidth: 1, borderRadius: 16, padding: 16 }}>
                <Text style={{ color: colors.muted, fontSize: 11, textTransform: 'uppercase' }}>Loyalty tier</Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{user.tier.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{user.tier.cashback_pct}% cashback on every purchase</Text>
              </View>
            )}
            <View style={{ marginTop: 16, backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, borderRadius: 16, padding: 16 }}>
              <Text style={{ color: colors.muted, fontSize: 11, textTransform: 'uppercase' }}>Wallet</Text>
              <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800' }}>{formatINR(wallet?.balance_inr || 0)}</Text>
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
