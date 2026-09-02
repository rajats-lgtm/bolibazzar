import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Logo from '../components/Logo';
import { api, formatINR } from '../lib/api';
import { colors } from '../lib/theme';

const EXAMPLES = [
  'iPhone 17 Pro Max 256GB Black under ₹1,20,000',
  'MacBook Air M5 16GB under ₹95,000 in Bengaluru',
  'Samsung OLED 55-inch TV under ₹80,000 same-day',
  'PS6 with one controller under ₹55,000 Mumbai',
];

export default function Home() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    const r = await api('/extract', { method: 'POST', body: JSON.stringify({ text }) });
    setLoading(false);
    if (!r.ok) { Alert.alert('AI failed', r.error || 'Try again'); return; }
    // Speak the summary
    if (r.requirement?.summary) {
      const lang = r.requirement.detected_language === 'hi' ? 'hi-IN' : 'en-IN';
      Speech.speak(r.requirement.summary, { language: lang });
    }
    router.push({ pathname: '/offers', params: { req: JSON.stringify(r.requirement), raw: text } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo size={32} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>
            Boli<Text style={{ color: colors.fuchsia }}>Bazzar</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={{ padding: 8 }}>
          <Ionicons name="person-circle-outline" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>India's AI Reverse Marketplace</Text>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800', lineHeight: 40 }}>
          You Ask.{'\n'}
          <Text style={{ color: colors.fuchsia }}>Sellers Compete.</Text>{'\n'}
          You Win.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 15, marginTop: 14, lineHeight: 22 }}>
          Speak or type in English, Hindi, Tamil or Marathi. Our AI understands, verified suppliers bid live.
        </Text>

        <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 24 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What would you like to buy today?"
            placeholderTextColor={colors.muted}
            multiline
            style={{ color: colors.text, fontSize: 16, minHeight: 60 }}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 14 }} onPress={() => Alert.alert('Voice', 'Long-press to speak (implement expo-speech-recognition)')}>
              <Ionicons name="mic" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity disabled={loading || !text.trim()} onPress={submit} style={{ flex: 1, borderRadius: 14, overflow: 'hidden', opacity: loading || !text.trim() ? 0.5 : 1 }}>
              <LinearGradient colors={[colors.indigo, colors.orange]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {loading ? <ActivityIndicator color="white" /> : <Ionicons name="send" size={18} color="white" />}
                <Text style={{ color: 'white', fontWeight: '600' }}>Ask AI</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Try one of these</Text>
          {EXAMPLES.map((ex) => (
            <TouchableOpacity key={ex} onPress={() => setText(ex)} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14 }}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
          <TouchableOpacity onPress={() => router.push('/profile')} style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' }}>
            <Ionicons name="wallet" size={20} color={colors.emerald} />
            <Text style={{ color: colors.text, marginTop: 6, fontWeight: '500' }}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' }}>
            <Ionicons name="clipboard" size={20} color={colors.fuchsia} />
            <Text style={{ color: colors.text, marginTop: 6, fontWeight: '500' }}>My requests</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
