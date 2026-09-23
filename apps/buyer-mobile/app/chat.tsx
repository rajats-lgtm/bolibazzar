import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, post } from '../lib/api';
import { colors } from '../lib/theme';

/**
 * Buyer ↔ supplier chat for one offer.
 *
 * Both sides open this same screen; the server decides who the viewer is from
 * the bearer token and refuses anyone who is not a party to the offer, so the
 * screen never has to be told which role it is showing.
 *
 * New messages are polled rather than pushed: the rest of the app already
 * polls, there is no socket server to keep alive, and a chat that is only open
 * while someone is looking at it does not justify one.
 */
export default function Chat() {
  const params = useLocalSearchParams<{ offerId: string; title?: string }>();
  const offerId = params.offerId as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [viewer, setViewer] = useState<'buyer' | 'supplier'>('buyer');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const stopped = useRef(false);
  // Only ask for what we have not seen, so a long thread is fetched once.
  const since = useRef<string | null>(null);

  const merge = useCallback((incoming: any[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      return added.length ? [...prev, ...added] : prev;
    });
    since.current = incoming[incoming.length - 1].created_at;
  }, []);

  useEffect(() => {
    if (!offerId) { setLoading(false); setError('No conversation selected.'); return; }

    async function poll() {
      if (stopped.current) return;
      const path = since.current
        ? `/messages/${offerId}?since=${encodeURIComponent(since.current)}`
        : `/messages/${offerId}`;
      const r = await api(path);
      if (stopped.current) return;
      if (r.ok) {
        setViewer(r.viewer || 'buyer');
        merge(r.messages || []);
        setError(null);
      } else if (r.status === 401) {
        setError('Your session expired. Sign in again to keep chatting.');
      } else if (!since.current) {
        setError(r.error || 'Could not load this conversation.');
      }
      setLoading(false);
      setTimeout(poll, 4000);
    }
    poll();

    // Clear the other side's unread badge while the thread is open.
    post(`/messages/${offerId}/read`).catch(() => null);
    return () => { stopped.current = true; };
  }, [offerId, merge]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const r = await post('/messages', { offer_id: offerId, text: body });
    setSending(false);
    if (!r.ok) { setError(r.error || 'Message not sent.'); return; }
    setText('');
    setError(null);
    merge([r.message]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => { stopped.current = true; router.back(); }} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>CHAT</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
            {params.title || 'Conversation'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {loading && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={colors.fuchsia} />
            </View>
          )}

          {!loading && !messages.length && !error && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
                No messages yet.{'\n'}Ask about stock, warranty, or a better price.
              </Text>
            </View>
          )}

          {messages.map((m) => {
            const mine = m.sender === viewer;
            return (
              <View
                key={m.id}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  backgroundColor: mine ? 'rgba(225,29,72,0.16)' : colors.card,
                  borderColor: mine ? 'rgba(225,29,72,0.35)' : colors.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  borderBottomRightRadius: mine ? 4 : 16,
                  borderBottomLeftRadius: mine ? 16 : 4,
                  padding: 11,
                  marginBottom: 10,
                }}
              >
                {!mine && (
                  <Text style={{ color: colors.fuchsia, fontSize: 11, fontWeight: '700', marginBottom: 3 }}>
                    {m.sender_name}
                  </Text>
                )}
                <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{m.text}</Text>
                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 4, alignSelf: 'flex-end' }}>
                  {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {!!error && (
          <Text style={{ color: '#f87171', fontSize: 12, paddingHorizontal: 16, paddingBottom: 6 }}>{error}</Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            style={{
              flex: 1, color: colors.text, backgroundColor: colors.card,
              borderColor: colors.border, borderWidth: 1, borderRadius: 20,
              paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, maxHeight: 120, fontSize: 14,
            }}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            style={{
              height: 42, width: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.fuchsia, opacity: !text.trim() || sending ? 0.45 : 1,
            }}
          >
            {sending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={18} color="white" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
