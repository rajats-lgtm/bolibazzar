import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { clearSession } from '../../lib/session';
import { colors } from '../../lib/theme';

export default function SupplierProfile() {
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const session = await api('/auth/session');
    setSupplier(session.ok ? session.supplier || null : null);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  async function signOut() {
    await api('/auth/session', { method: 'DELETE', body: JSON.stringify({ role: 'supplier' }) });
    await clearSession();
    router.replace('/');
  }

  const statusColour =
    supplier?.status === 'approved' ? colors.emerald :
    supplier?.status === 'suspended' || supplier?.status === 'rejected' ? '#f87171' : colors.amber;

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
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{supplier?.business_name}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{supplier?.email}</Text>
            {!!supplier?.city && <Text style={{ color: colors.muted, marginTop: 2 }}>{supplier.city}</Text>}

            <View style={{ marginTop: 18, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
              <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>ACCOUNT STATUS</Text>
              <Text style={{ color: statusColour, fontSize: 18, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' }}>
                {String(supplier?.status || '').replace(/_/g, ' ')}
              </Text>
              {supplier?.status !== 'approved' && (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                  You can browse live requests, but bidding unlocks once an admin approves your business.
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
                <Text style={{ color: colors.muted, fontSize: 11 }}>Rating</Text>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>★ {supplier?.rating}</Text>
              </View>
              <View style={{ flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
                <Text style={{ color: colors.muted, fontSize: 11 }}>Reviews</Text>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{supplier?.reviews}</Text>
              </View>
            </View>

            {([['Analytics', '/supplier/analytics'], ['Auto-bid rules', '/supplier/rules'], ['Orders to fulfil', '/supplier/orders']] as const).map(([label, path]) => (
              <TouchableOpacity
                key={path}
                onPress={() => router.push(path as any)}
                style={{ marginTop: 12, padding: 15, borderColor: colors.border, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={signOut} style={{ marginTop: 20, padding: 14, borderColor: colors.border, borderWidth: 1, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.muted }}>Sign out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
