import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import { colors } from '../lib/theme';
import { getSession, homeFor } from '../lib/session';

/**
 * Landing screen — the first thing anyone sees.
 *
 * Mirrors the desktop landing page: the pitch, how it works, and the two ways
 * in. Someone already signed in is sent straight to their side of the app.
 */

const STEPS = [
  { icon: 'sparkles-outline', title: 'Tell AI what you want', body: 'Type or speak it in English, Hindi, Tamil or Marathi.' },
  { icon: 'notifications-outline', title: 'Verified sellers are notified', body: 'Only matching, GST-registered suppliers. No spam.' },
  { icon: 'trending-down-outline', title: 'They compete live', body: 'Prices drop in real time as sellers bid to win you.' },
  { icon: 'bag-check-outline', title: 'Chat, pay, track', body: 'Negotiate, pay by UPI, follow it to your door.' },
] as const;

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
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 18 }}>How it works</Text>
          {STEPS.map((step, i) => (
            <View key={step.title} style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(225,29,72,0.10)', borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={step.icon as any} size={19} color={colors.fuchsia} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 0.8 }}>STEP {i + 1}</Text>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, marginTop: 2 }}>{step.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3, lineHeight: 19 }}>{step.body}</Text>
              </View>
            </View>
          ))}
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
