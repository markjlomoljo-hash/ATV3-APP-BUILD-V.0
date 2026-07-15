/**
 * CutisAI — Persistent Conversation Screen
 *
 * Zero-fabrication: no assistant text is generated or shown unless a real
 * configured provider returned and passed validation. All states are honest.
 * Conversations and messages persist to Supabase via the web API.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type ConversationStatus = 'active' | 'archived' | 'deleted';
type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

interface Conversation {
  id: string;
  title: string | null;
  status: ConversationStatus;
  lastMessageAt: string | null;
  createdAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  runtimeMode: string | null;
  modelName: string | null;
  evidenceRefs: unknown[];
  createdAt: string;
}

type ScreenState =
  | 'loading'
  | 'ready'
  | 'auth_required'
  | 'consent_required'
  | 'not_configured'
  | 'database_unavailable';

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

function generateIdempotencyKey(): string {
  return `cutisai-msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function stateMessage(state: ScreenState): string {
  switch (state) {
    case 'auth_required': return 'Sign in to access CutisAI conversations.';
    case 'consent_required': return 'Personal learning consent is required before CutisAI can retain conversation history. Enable it in Profile → Privacy.';
    case 'not_configured': return 'CutisAI is not yet configured in this deployment. The conversation persistence layer is ready — the AI provider will be connected by Codex.';
    case 'database_unavailable': return 'Conversation persistence is temporarily unavailable. Nothing was saved.';
    default: return '';
  }
}

export default function CutisAIScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadConversations = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) { setScreenState('not_configured'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/cutisai/conversations`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.status === 403) { setScreenState('consent_required'); return; }
      if (res.status === 503) { setScreenState('database_unavailable'); return; }
      if (!res.ok) { setScreenState('not_configured'); return; }
      const payload = await res.json() as { conversations?: Conversation[] };
      setConversations(payload.conversations ?? []);
      setScreenState('ready');
    } catch {
      setScreenState('database_unavailable');
    }
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE}/api/cutisai/conversations/${conversationId}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const payload = await res.json() as { messages?: Message[] };
      setMessages(payload.messages ?? []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    } catch {
      // silent — messages remain empty, user can retry
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openConversation = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv);
    await loadMessages(conv.id);
  }, [loadMessages]);

  const createConversation = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/api/cutisai/conversations`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'idempotency-key': generateIdempotencyKey(),
        },
        body: JSON.stringify({ role: 'user', content: '', requestedTools: [] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' })) as { error?: string };
        if (err.error === 'consent_required') {
          Alert.alert('Consent Required', 'Enable personal learning consent in Profile → Privacy to use CutisAI.');
        }
        return;
      }
      const payload = await res.json() as { conversation?: Conversation };
      if (payload.conversation) {
        setConversations(prev => [payload.conversation!, ...prev]);
        await openConversation(payload.conversation);
      }
    } catch {
      Alert.alert('Error', 'Could not create conversation. Please try again.');
    }
  }, [openConversation]);

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending || !activeConversation) return;
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    setSending(true);
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      conversationId: activeConversation.id,
      role: 'user',
      content,
      runtimeMode: null,
      modelName: null,
      evidenceRefs: [],
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res = await fetch(`${API_BASE}/api/cutisai/conversations`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'idempotency-key': generateIdempotencyKey(),
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          role: 'user',
          content,
          requestedTools: [],
        }),
      });
      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setDraft(content);
        const err = await res.json().catch(() => ({ error: 'unknown' })) as { error?: string };
        Alert.alert('Send Failed', err.error === 'consent_required'
          ? 'Personal learning consent is required.'
          : 'Message could not be saved. Please try again.');
        return;
      }
      const payload = await res.json() as { message?: Message; assistant?: { status: string; error?: string } };
      // Replace optimistic with real message
      setMessages(prev => [
        ...prev.filter(m => m.id !== optimisticMsg.id),
        ...(payload.message ? [payload.message] : []),
      ]);
      // Show assistant status if not_configured (expected until Codex connects provider)
      if (payload.assistant?.status === 'not_configured') {
        const statusMsg: Message = {
          id: `status-${Date.now()}`,
          conversationId: activeConversation.id,
          role: 'assistant',
          content: 'CutisAI provider is not yet configured. Your message was saved. The AI response layer will be connected by Codex.',
          runtimeMode: 'not_configured',
          modelName: null,
          evidenceRefs: [],
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, statusMsg]);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setDraft(content);
      Alert.alert('Error', 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [draft, sending, activeConversation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading CutisAI…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState !== 'ready') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>CutisAI</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.stateIcon}>
            {screenState === 'consent_required' ? '🔒' : screenState === 'auth_required' ? '🔑' : '⚙️'}
          </Text>
          <Text style={styles.stateTitle}>{screenState.replace(/_/g, ' ')}</Text>
          <Text style={styles.stateMessage}>{stateMessage(screenState)}</Text>
          {screenState === 'auth_required' && (
            <Button title="Sign In" onPress={() => router.push('/auth/sign-in' as never)} style={styles.stateBtn} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (activeConversation) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { setActiveConversation(null); setMessages([]); }} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Conversations</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{activeConversation.title ?? 'New Conversation'}</Text>
          </View>
          {/* Not-configured notice */}
          <View style={styles.noticeBar}>
            <Text style={styles.noticeText}>
              💡 Message persistence is live. AI response generation requires Codex provider configuration.
            </Text>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loadingMessages} onRefresh={() => loadMessages(activeConversation.id)} />}
          >
            {messages.length === 0 && !loadingMessages && (
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>Start a conversation</Text>
                <Text style={styles.emptyText}>
                  Ask CutisAI about your skin patterns, treatment questions, or ingredient concerns.
                  Your messages are saved securely.
                </Text>
              </View>
            )}
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
                  {msg.content}
                </Text>
                {msg.runtimeMode === 'not_configured' && (
                  <Text style={styles.runtimeBadge}>not_configured</Text>
                )}
                <Text style={styles.messageTime}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.messageInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask CutisAI…"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
              accessibilityLabel="Message input"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!draft.trim() || sending}
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              accessibilityLabel="Send message"
              accessibilityRole="button"
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CutisAI</Text>
        <TouchableOpacity onPress={createConversation} style={styles.newBtn} accessibilityLabel="New conversation">
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* About card */}
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🧠 CutisAI — Clinical Skin Assistant</Text>
          <Text style={styles.aboutText}>
            CutisAI answers questions about your skin patterns, treatments, and ingredients using
            evidence-backed context from your logs. It never diagnoses, prescribes, or fabricates
            citations. All conversations are saved privately.
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.statusText}>AI provider: awaiting Codex configuration</Text>
          </View>
        </Card>

        {/* Conversations list */}
        <Text style={styles.sectionTitle}>Conversations</Text>
        {conversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Tap "+ New" to start your first conversation with CutisAI.</Text>
            <Button title="Start Conversation" onPress={createConversation} style={styles.startBtn} />
          </Card>
        ) : (
          conversations.map(conv => (
            <TouchableOpacity
              key={conv.id}
              onPress={() => openConversation(conv)}
              style={styles.convCard}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation: ${conv.title ?? 'Untitled'}`}
            >
              <View style={styles.convLeft}>
                <Text style={styles.convTitle} numberOfLines={1}>{conv.title ?? 'New Conversation'}</Text>
                <Text style={styles.convMeta}>
                  {conv.lastMessageAt
                    ? new Date(conv.lastMessageAt).toLocaleDateString()
                    : new Date(conv.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.convArrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Safety notice */}
        <Card style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>⚕️ Medical Boundaries</Text>
          <Text style={styles.safetyText}>
            CutisAI does not diagnose, prescribe, or replace professional care. It surfaces
            observed associations, not guaranteed causation. Always consult a qualified provider
            for medical decisions.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { paddingRight: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  title: { ...Typography.title3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  newBtn: { paddingLeft: Spacing.sm },
  newBtnText: { ...Typography.bodyMedium, color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  stateIcon: { fontSize: 48, marginBottom: Spacing.lg },
  stateTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.sm, textTransform: 'capitalize' },
  stateMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  stateBtn: { marginTop: Spacing.xl },
  aboutCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...Typography.caption, color: Colors.textMuted },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.lg },
  startBtn: { minWidth: 180 },
  convCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  convLeft: { flex: 1 },
  convTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  convMeta: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  convArrow: { fontSize: 22, color: Colors.textMuted },
  safetyCard: { marginTop: Spacing.lg, backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  safetyTitle: { ...Typography.bodyMedium, color: '#92400e', marginBottom: 6 },
  safetyText: { ...Typography.caption, color: '#78350f', lineHeight: 18 },
  noticeBar: {
    backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#bfdbfe',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  noticeText: { ...Typography.caption, color: '#1d4ed8' },
  messageList: { flex: 1 },
  messageListContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  emptyMessages: { alignItems: 'center', paddingTop: Spacing.xxl },
  messageBubble: {
    maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  messageText: { ...Typography.body, lineHeight: 20 },
  userText: { color: '#fff' },
  assistantText: { color: Colors.textPrimary },
  runtimeBadge: {
    ...Typography.caption, color: Colors.textMuted, marginTop: 4,
    fontStyle: 'italic',
  },
  messageTime: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontSize: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  messageInput: {
    flex: 1, ...Typography.body, color: Colors.textPrimary,
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    maxHeight: 120, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.gray300 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
