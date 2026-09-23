import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, formatINR } from '../../lib/api';
import { clearSession } from '../../lib/session';
import { colors } from '../../lib/theme';

export default function BuyerProfile() {
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const session = await api('/auth/session');
    if (!session.ok || !session.buyer) { setLoading(false); return; }
    setUser(session.buyer);
    const w = await api('/wallet');
    if (w.ok) setWallet(w.wallet);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  async function signOut() {
    await api('/auth/session', { method: 'DELETE', body: JSON.stringify({ role: 'buyer' }) });
    await clearSession();
    router.replace('/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator color={colors.fuchsia} style={{ marginTop: 40 }} />
        ) : (
          <View>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>
              Hi {String(user?.name || '').split(' ')[0] || 'there'}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.email}</Text>

            {user?.tier && (
              <View style={{ marginTop: 16, backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)', borderWidth: 1, borderRadius: 16, padding: 16 }}>
                <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>LOYALTY TIER</Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 2 }}>{user.tier.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  {user.tier.cashback_pct}% cashback on every purchase
                </Text>
                {user.tier.next_label && (
                  <>
                    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${user.tier.progress_pct}%`, backgroundColor: colors.amber }} />
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
                      {formatINR(user.tier.next_tier_at - user.tier.total_spent_inr)} more to reach {user.tier.next_label}
                    </Text>
                  </>
                )}
              </View>
            )}

            <View style={{ marginTop: 16, backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, borderRadius: 16, padding: 16 }}>
              <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>WALLET</Text>
              <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 2 }}>
                {formatINR(wallet?.balance_inr || 0)}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Use it for an instant discount on any order.</Text>
            </View>

            {(wallet?.transactions || []).length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Recent activity</Text>
                {wallet.transactions.slice(-6).reverse().map((t: any) => (
                  <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: colors.text, fontSize: 13 }}>{t.reason}</Text>
                      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{new Date(t.at).toLocaleDateString('en-IN')}</Text>
                    </View>
                    <Text style={{ color: t.type === 'credit' ? colors.emerald : colors.muted, fontWeight: '700' }}>
                      {t.type === 'credit' ? '+' : '−'}{formatINR(t.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.push('/buyer/orders')}
              style={{ marginTop: 20, padding: 15, borderColor: colors.border, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>My orders</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity onPress={signOut} style={{ marginTop: 12, padding: 14, borderColor: colors.border, borderWidth: 1, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.muted }}>Sign out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
