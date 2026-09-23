import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, post } from '../../lib/api';
import { colors } from '../../lib/theme';

/**
 * Supplier KYC.
 *
 * Collected before a business can trade: the registered name, GSTIN, address
 * and a named contact. The server validates the GSTIN structurally (state
 * code, PAN block and check digit) and an admin approves the account before
 * bidding unlocks.
 */

const TYPES = [
  { value: 'retail_store', label: 'Retail store' },
  { value: 'brand_store', label: 'Brand store' },
  { value: 'authorised_reseller', label: 'Authorised reseller' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'distributor', label: 'Distributor' },
] as const;

type Form = {
  business_name: string; gst: string; contact_name: string; phone: string;
  address: string; city: string; pincode: string; supplier_type: string;
  brand_authorisations: string;
};

export default function SupplierOnboarding() {
  const [form, setForm] = useState<Form>({
    business_name: '', gst: '', contact_name: '', phone: '',
    address: '', city: '', pincode: '', supplier_type: 'retail_store',
    brand_authorisations: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pre-fill whatever the account already has.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const s = await api('/auth/session');
        if (!active) return;
        const sup = s.supplier;
        if (sup) {
          setForm((f) => ({
            ...f,
            business_name: sup.business_name || '',
            gst: sup.gst || '',
            contact_name: sup.contact_name || '',
            phone: sup.phone || '',
            address: sup.address || '',
            city: sup.city || '',
            pincode: sup.pincode || '',
            supplier_type: sup.supplier_type || 'retail_store',
            brand_authorisations: (sup.brand_authorisations || []).join(', '),
          }));
        }
        setLoading(false);
      })();
      return () => { active = false; };
    }, [])
  );

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  }

  async function submit() {
    setSaving(true);
    setErrors({});
    const r = await post('/suppliers', {
      ...form,
      brand_authorisations: form.brand_authorisations
        .split(',').map((b) => b.trim()).filter(Boolean),
    });
    setSaving(false);

    if (!r.ok) {
      // Field-level messages come back from the server; show them inline.
      if (r.fields) {
        setErrors(r.fields);
        Alert.alert('Check your details', 'Some fields need correcting.');
      } else {
        Alert.alert('Could not save', r.error || 'Please try again.');
      }
      return;
    }
    Alert.alert(
      'Submitted for verification',
      'Your details are with our team. You can browse live requests now — bidding unlocks once your business is approved.',
      [{ text: 'Continue', onPress: () => router.replace('/supplier') }]
    );
  }

  const inputStyle = (key: keyof Form) => ({
    backgroundColor: colors.card,
    borderColor: errors[key] ? '#f87171' : colors.border,
    borderWidth: 1,
    color: colors.text,
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
  });

  function Field({ label, k, placeholder, hint, ...rest }: any) {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 7, letterSpacing: 0.4 }}>{label}</Text>
        <TextInput
          value={form[k as keyof Form]}
          onChangeText={(t) => set(k, t)}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={inputStyle(k)}
          {...rest}
        />
        {!!errors[k] && <Text style={{ color: '#f87171', fontSize: 12, marginTop: 5 }}>{errors[k]}</Text>}
        {!errors[k] && !!hint && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{hint}</Text>}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.fuchsia} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 12 }}>Business details</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: 'rgba(67,56,202,0.10)', borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 22, flexDirection: 'row', gap: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.fuchsia} />
            <Text style={{ color: colors.muted, fontSize: 13, flex: 1, lineHeight: 19 }}>
              Buyers pay through BoliBazzar, so every seller is verified before
              they can trade. These details go to our team for approval.
            </Text>
          </View>

          <Field label="REGISTERED BUSINESS NAME" k="business_name" placeholder="Croma Retail Pvt Ltd" />
          <Field
            label="GSTIN"
            k="gst"
            placeholder="27AAPFU0939F1ZV"
            autoCapitalize="characters"
            maxLength={15}
            hint="15 characters, as printed on your GST certificate"
          />
          <Field label="CONTACT PERSON" k="contact_name" placeholder="Full name" />
          <Field label="PHONE" k="phone" placeholder="98765 43210" keyboardType="phone-pad" hint="Used for order and payout updates" />
          <Field label="REGISTERED ADDRESS" k="address" placeholder="Shop 12, Phoenix Marketcity, Kurla West" multiline numberOfLines={3} style={{ ...inputStyle('address'), minHeight: 88, textAlignVertical: 'top' }} />
          <Field label="CITY" k="city" placeholder="Mumbai" />
          <Field label="PIN CODE" k="pincode" placeholder="400070" keyboardType="number-pad" maxLength={6} />

          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 9, letterSpacing: 0.4 }}>BUSINESS TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: errors.supplier_type ? 6 : 18 }}>
            {TYPES.map((t) => {
              const active = form.supplier_type === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => set('supplier_type', t.value)}
                  style={{
                    paddingVertical: 9, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1,
                    borderColor: active ? colors.fuchsia : colors.border,
                    backgroundColor: active ? 'rgba(225,29,72,0.12)' : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? colors.fuchsia : colors.muted, fontSize: 13 }}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!errors.supplier_type && <Text style={{ color: '#f87171', fontSize: 12, marginBottom: 14 }}>{errors.supplier_type}</Text>}

          <Field
            label="BRAND AUTHORISATIONS (OPTIONAL)"
            k="brand_authorisations"
            placeholder="Apple, Samsung, Sony"
            hint="Comma separated. We only send you requests you can fulfil."
          />

          <TouchableOpacity onPress={submit} disabled={saving} style={{ borderRadius: 13, overflow: 'hidden', marginTop: 6 }}>
            <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, alignItems: 'center' }}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Submit for verification</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 17 }}>
            Your GSTIN is checked against its state code and check digit before
            it reaches our team.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
