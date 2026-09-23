import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import type { Role } from '../lib/session';

/** The buyer-or-supplier fork, shared by sign-in and sign-up. */
export default function RoleChoice({
  mode,
  onPick,
}: {
  mode: 'signin' | 'signup';
  onPick: (role: Role) => void;
}) {
  const verb = mode === 'signup' ? 'Sign up' : 'Log in';

  const options: { role: Role; icon: any; title: string; body: string }[] = [
    {
      role: 'buyer',
      icon: 'bag-handle-outline',
      title: `${verb} as a buyer`,
      body: 'Tell AI what you want to buy and let verified sellers compete for your business.',
    },
    {
      role: 'supplier',
      icon: 'storefront-outline',
      title: `${verb} as a supplier`,
      body: 'Get live buyer requests with real budgets and win them with your best price.',
    },
  ];

  return (
    <View>
      {options.map((option) => (
        <TouchableOpacity
          key={option.role}
          onPress={() => onPick(option.role)}
          style={{
            flexDirection: 'row',
            gap: 14,
            alignItems: 'center',
            padding: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            marginBottom: 12,
          }}
        >
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(225,29,72,0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={option.icon} size={22} color={colors.fuchsia} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{option.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3, lineHeight: 18 }}>{option.body}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
