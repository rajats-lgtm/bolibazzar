import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RoleChoice from '../components/RoleChoice';
import OtpForm from '../components/OtpForm';
import { colors } from '../lib/theme';
import { homeFor, type Role } from '../lib/session';

/**
 * Signin: pick buyer or supplier, then verify by one-time code.
 * On success the user lands on their own side of the app.
 */
export default function Screen() {
  const [role, setRole] = useState<Role | null>(null);

  function finish() {
    // replace, not push: the auth screens must not stay in the back stack.
    router.replace(homeFor(role as Role) as any);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => (role ? setRole(null) : router.back())} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800' }}>
          {role ? (role === 'supplier' ? 'Supplier account' : 'Buyer account') : 'Welcome back'}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 8, marginBottom: 26, lineHeight: 21 }}>
          {role
            ? 'We\u2019ll send a 6-digit code to your email. No password needed.'
            : 'Choose how you want to log in.'}
        </Text>

        {role ? (
          <OtpForm role={role} mode="signin" onDone={finish} />
        ) : (
          <RoleChoice mode="signin" onPick={setRole} />
        )}

        {!role && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 28 }}>
            <Text style={{ color: colors.muted }}>New to BoliBazzar?</Text>
            <TouchableOpacity onPress={() => router.replace('/signup')}>
              <Text style={{ color: colors.fuchsia, fontWeight: '600' }}>Create an account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
