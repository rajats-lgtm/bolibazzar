import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { post, setToken } from '../lib/api';
import { colors } from '../lib/theme';

/**
 * Two-step passcode sign-in. In local development the server returns the code
 * in the response, so you can sign in without an SMS or email provider.
 */
export default function OtpLogin({
  role = 'buyer',
  onSignedIn,
}: {
  role?: 'buyer' | 'supplier';
  onSignedIn: (account: any) => void;
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
    setLoading(true);
    const r = await post('/auth/otp/request', { email: email.trim(), role });
    setLoading(false);
    if (!r.ok) return Alert.alert('Could not send code', r.error || 'Try again.');
    setStep('verify');
    setCooldown(30);
    setDevCode(r.dev_code || null);
  }

  async function verify() {
    if (code.trim().length !== 6) return Alert.alert('Code needed', 'Enter the 6-digit code.');
    setLoading(true);
    const r = await post('/auth/otp/verify', {
      email: email.trim(), code: code.trim(), role, name: name.trim() || undefined,
    });
    setLoading(false);
    if (!r.ok) return Alert.alert('Could not verify', r.error || 'Check the code and try again.');
    if (r.token) await setToken(r.token);
    onSignedIn(role === 'supplier' ? r.supplier : r.user);
  }

  const input = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    fontSize: 16,
  } as const;

  return (
    <View>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>
        {role === 'supplier' ? 'Supplier sign in' : 'Sign in'}
      </Text>
      <Text style={{ color: colors.muted, marginTop: 6, marginBottom: 20, lineHeight: 20 }}>
        {step === 'identify'
          ? 'We’ll send a 6-digit code to your email. No password needed.'
          : `Enter the code we sent to ${email}`}
      </Text>

      {step === 'identify' ? (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={input}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={role === 'supplier' ? 'Business name (new accounts)' : 'Full name (new accounts)'}
            placeholderTextColor={colors.muted}
            style={input}
          />
          <TouchableOpacity onPress={requestCode} disabled={loading} style={{ borderRadius: 12, overflow: 'hidden', marginTop: 6 }}>
            <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 15, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Send code</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {devCode && (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.35)', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <Text style={{ color: colors.amber, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Dev mode</Text>
              <Text style={{ color: colors.text, fontSize: 24, letterSpacing: 8, fontWeight: '700', marginTop: 4 }}>{devCode}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Shown because OTP_DEV_MODE is on.</Text>
            </View>
          )}
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            style={{ ...input, textAlign: 'center', fontSize: 30, letterSpacing: 12, paddingVertical: 16 }}
          />
          <TouchableOpacity onPress={verify} disabled={loading} style={{ borderRadius: 12, overflow: 'hidden', marginTop: 6 }}>
            <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 15, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Verify &amp; continue</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
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
