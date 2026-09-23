import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

/**
 * A looping walkthrough of a real auction, for first-time visitors.
 *
 * Replays the genuine flow — type a requirement, AI structures it, sellers
 * bid, prices fall, you accept — rather than shipping a video: it stays
 * accurate if the product changes, adds nothing to the bundle, and is sharp at
 * any screen size. Honours the OS "reduce motion" setting by showing the end
 * state instead of animating.
 */

const TYPED = 'iPhone 17 Pro Max 256GB under ₹1,20,000';
const CHIPS = ['Apple', '17 Pro Max', '256GB', '₹1,20,000', 'Mumbai'];

const BIDS = [
  { name: 'Croma', note: 'Same-day delivery', price: 118900, drop: 114900 },
  { name: 'Reliance Digital', note: 'Next-day delivery', price: 117500, drop: 113200 },
  { name: 'iPlanet', note: '2-day shipping', price: 116400, drop: 111800 },
];

const STAGES = ['type', 'parse', 'notify', 'bid', 'win'] as const;
type Stage = (typeof STAGES)[number];
const DURATION: Record<Stage, number> = { type: 2600, parse: 1900, notify: 1500, bid: 5200, win: 3000 };

const CAPTIONS: Record<Stage, string> = {
  type: 'Say what you want — English, Hindi, Tamil or Marathi.',
  parse: 'AI pulls out the product, budget and location.',
  notify: 'Only matching, GST-verified sellers are alerted.',
  bid: 'They bid against each other. Prices fall while you watch.',
  win: 'Pick the winner. Pay by UPI. Track it to your door.',
};

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

function Bid({ bid, dropped, isPick, won }: any) {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const price = dropped ? bid.drop : bid.price;
  return (
    <Animated.View
      style={{
        opacity: slide,
        transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
        borderWidth: 1,
        borderColor: isPick && won ? 'rgba(225,29,72,0.5)' : colors.border,
        backgroundColor: isPick && won ? 'rgba(225,29,72,0.10)' : 'rgba(255,255,255,0.02)',
        borderRadius: 11,
        padding: 9,
        marginBottom: 7,
      }}
    >
      {isPick && won && (
        <Text style={{ color: colors.fuchsia, fontSize: 8, fontWeight: '700', marginBottom: 3, letterSpacing: 0.5 }}>
          ✦ AI PICK · BEST VALUE
        </Text>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{bid.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 9, marginTop: 1 }}>{bid.note}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {dropped && (
            <Text style={{ color: '#f87171', fontSize: 8, textDecorationLine: 'line-through' }}>{inr(bid.price)}</Text>
          )}
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{inr(price)}</Text>
          {dropped && <Text style={{ color: colors.emerald, fontSize: 7 }}>▼ dropped</Text>}
        </View>
      </View>
    </Animated.View>
  );
}

export default function HowItWorks() {
  const [stage, setStage] = useState<Stage>('type');
  const [typed, setTyped] = useState('');
  const [shown, setShown] = useState(0);
  const [dropped, setDropped] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => setReduced(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    if (reduced) { setTyped(TYPED); setShown(BIDS.length); setDropped(true); setStage('win'); return; }
    const next = STAGES[(STAGES.indexOf(stage) + 1) % STAGES.length];
    const timer = setTimeout(() => {
      if (next === 'type') { setTyped(''); setShown(0); setDropped(false); }
      setStage(next);
    }, DURATION[stage]);
    return () => clearTimeout(timer);
  }, [stage, reduced]);

  useEffect(() => {
    if (reduced || stage !== 'type') return;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setTyped(TYPED.slice(0, i));
      if (i >= TYPED.length) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, [stage, reduced]);

  useEffect(() => {
    if (reduced || stage !== 'bid') return;
    const timers = BIDS.map((_, i) => setTimeout(() => setShown(i + 1), 450 + i * 800));
    timers.push(setTimeout(() => setDropped(true), 3400));
    return () => timers.forEach(clearTimeout);
  }, [stage, reduced]);

  const index = STAGES.indexOf(stage);
  const showBoard = reduced || index >= STAGES.indexOf('bid');
  const won = reduced || stage === 'win';

  return (
    <View>
      {/* Screen */}
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 14, backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 13, padding: 11, minHeight: 66 }}>
          <Text style={{ color: colors.muted, fontSize: 10, marginBottom: 4 }}>✦ Ask AI what you want</Text>
          <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
            {typed}
            {!reduced && stage === 'type' ? '|' : ''}
          </Text>
        </View>

        {(reduced || index >= STAGES.indexOf('parse')) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {CHIPS.map((c) => (
              <View key={c} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(225,29,72,0.14)', borderColor: 'rgba(225,29,72,0.3)', borderWidth: 1 }}>
                <Text style={{ color: colors.fuchsia, fontSize: 9 }}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {!reduced && stage === 'notify' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            {['CR', 'RD', 'iP', 'VS'].map((n) => (
              <View key={n} style={{ height: 26, width: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 8, fontWeight: '700' }}>{n}</Text>
              </View>
            ))}
            <Text style={{ color: colors.emerald, fontSize: 9, marginLeft: 2 }}>notified</Text>
          </View>
        )}

        {showBoard && (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
              <Text style={{ color: colors.emerald, fontSize: 9 }}>● {reduced ? BIDS.length : shown} offers</Text>
              <Text style={{ color: colors.amber, fontSize: 9, fontWeight: '700' }}>{won ? 'closed' : '117s'}</Text>
            </View>
            {BIDS.slice(0, reduced ? BIDS.length : shown).map((b, i) => (
              <Bid key={b.name} bid={b} dropped={dropped && i < 2} isPick={i === BIDS.length - 1} won={won} />
            ))}
            {won && (
              <LinearGradient colors={[colors.indigo, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 11, paddingVertical: 9, alignItems: 'center', marginTop: 2 }}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>✓ Accepted · paid by UPI</Text>
              </LinearGradient>
            )}
          </View>
        )}
      </View>

      {/* Steps */}
      <View style={{ marginTop: 18 }}>
        {STAGES.map((key, i) => {
          const active = !reduced && key === stage;
          const done = !reduced && STAGES.indexOf(key) < index;
          return (
            <View
              key={key}
              style={{
                flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1,
                borderColor: active ? 'rgba(225,29,72,0.4)' : 'rgba(255,255,255,0.05)',
                backgroundColor: active ? 'rgba(225,29,72,0.06)' : 'transparent',
              }}
            >
              <View style={{ height: 24, width: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: active || done || reduced ? colors.fuchsia : 'rgba(255,255,255,0.08)' }}>
                {done ? (
                  <Ionicons name="checkmark" size={13} color="white" />
                ) : (
                  <Text style={{ color: active || reduced ? 'white' : colors.muted, fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                )}
              </View>
              <Text style={{ flex: 1, color: active || reduced ? colors.text : colors.muted, fontSize: 13, lineHeight: 19 }}>
                {CAPTIONS[key]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
