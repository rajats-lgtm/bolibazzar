import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../lib/api';
import { setSession, type Role } from '../lib/session';
import { colors } from '../lib/theme';

/**
 * Two-step passcode form, shared by sign-in and sign-up.
 *
 * Outside production the server returns the code in the response, so it is
 * shown on screen and nobody needs a mail provider to get in.
 */
export default function OtpForm({
  role,
  mode,
  onDone,
}: {
  role: Role;
  mode: 'signin' | 'signup';
  onDone: (account: any) => void;
}) {
  const [step, setStep] = useState<'identify' | 'verify'>('identify');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode() {
    if (!email.trim()) return Alert.alert('Email needed', 'Enter your email address.');
    if (mode === 'signup' && !name.trim()) {
      return Alert.alert(
        role === 'supplier' ? 'Business name needed' : 'Name needed',
        role === 'supplier' ? 'Enter your business name.' : 'Enter your full name.'
      );
    }
    setLoading(true);
    const r = await post('/auth/otp/request', { email: email.trim(), role });
    setLoading(false);
    if (!r.ok) return Alert.alert('Could not send the code', r.error || 'Please try again.');
    setStep('verify');
    setCooldown(30);
    setDevCode(r.dev_code || null);
  }

  async function verify() {
    if (code.trim().length !== 6) return Alert.alert('Code needed', 'Enter the 6-digit code.');
    setLoading(true);
    const r = await post('/auth/otp/verify', {
      email: email.trim(),
      code: code.trim(),
      role,
      name: name.trim() || undefined,
      business_name: role === 'supplier' ? name.trim() || undefined : undefined,
    });
    setLoading(false);
    if (!r.ok) return Alert.alert('Could not verify', r.error || 'Check the code and try again.');

    const account = role === 'supplier' ? r.supplier : r.user;
    if (r.token) {
      await setSession({
        role,
        token: r.token,
        email: email.trim(),
        name: account?.business_name || account?.name,
      });
    }
    onDone(account);
  }

  const input = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    padding: 15,
    borderRadius: 13,
    marginBottom: 11,
    fontSize: 16,
  } as const;

  return (
    <View>
      {step === 'identify' ? (
        <>
          {mode === 'signup' && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={role === 'supplier' ? 'Business name' : 'Full name'}
              placeholderTextColor={colors.muted}
              style={input}
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={input}
          />
          <TouchableOpacity onPress={requestCode} disabled={loading} style={{ borderRadius: 13, overflow: 'hidden', marginTop: 6 }}>
            <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Send code</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ color: colors.muted, marginBottom: 14, lineHeight: 20 }}>
            Enter the 6-digit code we sent to {email}
          </Text>
          {devCode && (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.35)', borderWidth: 1, borderRadius: 13, padding: 14, marginBottom: 14 }}>
              <Text style={{ color: colors.amber, fontSize: 11, letterSpacing: 1 }}>DEV MODE</Text>
              <Text style={{ color: colors.text, fontSize: 26, letterSpacing: 9, fontWeight: '700', marginTop: 4 }}>{devCode}</Text>
            </View>
          )}
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            style={{ ...input, textAlign: 'center', fontSize: 30, letterSpacing: 12, paddingVertical: 17 }}
          />
          <TouchableOpacity onPress={verify} disabled={loading} style={{ borderRadius: 13, overflow: 'hidden', marginTop: 6 }}>
            <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Verify &amp; continue</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
            <TouchableOpacity onPress={() => setStep('identify')}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Use a different email</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={requestCode} disabled={cooldown > 0}>
              <Text style={{ color: cooldown > 0 ? colors.muted : colors.fuchsia, fontSize: 13 }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
