import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import { colors } from '../lib/theme';
import { getSession, homeFor } from '../lib/session';
import HowItWorks from '../components/HowItWorks';

/**
 * Landing screen — the first thing anyone sees.
 *
 * Mirrors the desktop landing page: the pitch, how it works, and the two ways
 * in. Someone already signed in is sent straight to their side of the app.
 */

export default function Landing() {
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const session = await getSession();
        if (!active) return;
        if (session) router.replace(homeFor(session.role) as any);
        else setChecking(false);
      })();
      return () => { active = false; };
    }, [])
  );

  if (checking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Logo size={56} />
        <ActivityIndicator color={colors.fuchsia} style={{ marginTop: 20 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Logo size={38} />
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }}>
            Boli<Text style={{ color: colors.fuchsia }}>Bazzar</Text>
          </Text>
        </View>

        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 36, letterSpacing: 0.5 }}>
          INDIA&apos;S AI REVERSE MARKETPLACE
        </Text>
        <Text style={{ color: colors.text, fontSize: 38, fontWeight: '800', lineHeight: 46, marginTop: 10 }}>
          You Ask.{'\n'}
          <Text style={{ color: colors.fuchsia }}>Sellers Compete.</Text>{'\n'}
          You Win.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 15, marginTop: 16, lineHeight: 23 }}>
          Stop scrolling through listings. Say what you want to buy — verified suppliers
          across India bid against each other, and you pick the winner.
        </Text>

        <TouchableOpacity onPress={() => router.push('/signup')} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 32 }}>
          <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 17, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Create an account</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/signin')}
          style={{ marginTop: 12, padding: 17, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
        >
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Sign in</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 44 }}>
          <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 0.8, marginBottom: 6 }}>SEE IT WORK</Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 22, marginBottom: 6 }}>
            Watch a real auction happen
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
            Post what you want. Verified sellers bid against each other in a live
            window, and the price only moves one way.
          </Text>
          <HowItWorks />
        </View>

        <View style={{ marginTop: 16, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            Selling on BoliBazzar? Create a supplier account to get live buyer
            requests with real budgets.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
