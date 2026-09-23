import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { GlassSurface } from "@/components/Glass";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiConversation, ApiError, ApiMessage } from "@/services/api";

const POLL_INTERVAL_MS = 4000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ChatThread() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [conversation, setConversation] = useState<ApiConversation | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<ApiMessage>>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const init = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const { conversation: convo } = await api.messages.start(username);
      setConversation(convo);
      const res = await api.messages.list(convo.id);
      setMessages([...res.items].reverse()); // API returns newest-first; display oldest-at-top
      api.messages.markRead(convo.id).catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open this conversation.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    init();
  }, [init]);

  // Lightweight polling for new incoming messages (no websocket in this build).
  useEffect(() => {
    if (!conversation) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.messages.list(conversation.id);
        const chronological = [...res.items].reverse();
        setMessages((prev) => (chronological.length !== prev.length ? chronological : prev));
        if (res.items.some((m) => !m.isOwn && !m.isRead)) {
          api.messages.markRead(conversation.id).catch(() => {});
        }
      } catch {
        // silent — next poll will retry
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversation]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !conversation || sending) return;
    setSending(true);
    setDraft("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Optimistic bubble so the sender sees it instantly.
    const optimistic: ApiMessage = {
      id: `temp-${Date.now()}`,
      conversationId: conversation.id,
      senderId: user?.id ?? "me",
      isOwn: true,
      body,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const { message } = await api.messages.send(conversation.id, body);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? message : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body); // restore so the person doesn't lose what they typed
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Screen edges={["top"]} style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </Screen>
    );
  }

  if (error || !conversation) {
    return (
      <Screen edges={["top"]} style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error ?? "Conversation unavailable"}</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </Pressable>
        <Pressable style={styles.headerCenter} onPress={() => router.push(`/creator/${conversation.otherUser.username}`)}>
          {conversation.otherUser.avatarUrl ? (
            <Image source={{ uri: conversation.otherUser.avatarUrl }} style={styles.headerAvatar} cachePolicy="disk" />
          ) : (
            <View style={[styles.headerAvatarFallback, { backgroundColor: theme.surfaceAlt }]}>
              <Ionicons name="person" size={16} color={theme.textMuted} />
            </View>
          )}
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {conversation.otherUser.fullName}
          </Text>
        </Pressable>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs, flexGrow: 1, justifyContent: messages.length ? "flex-end" : "center" }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Say hello to {conversation.otherUser.fullName.split(" ")[0]} 👋
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, { justifyContent: item.isOwn ? "flex-end" : "flex-start" }]}>
              {item.isOwn ? (
                <View style={[styles.bubble, { backgroundColor: theme.accent, borderBottomRightRadius: radius.sm }]}>
                  <Text style={[styles.bubbleText, { color: "#fff" }]}>{item.body}</Text>
                </View>
              ) : (
                <GlassSurface
                  style={[styles.bubble, { borderBottomLeftRadius: radius.sm }]}
                  strength="subtle"
                  elevated={false}
                >
                  <Text style={[styles.bubbleText, { color: theme.textPrimary }]}>{item.body}</Text>
                </GlassSurface>
              )}
            </View>
          )}
        />

        <GlassSurface
          style={[styles.inputRow, { borderTopColor: theme.border }]}
          strength="strong"
          bordered={false}
          elevated={false}
          borderRadius={0}
        >
          <View style={styles.inputRowTop}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message…"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.surfaceAlt }]}
              multiline
              maxLength={2000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: !draft.trim() || sending ? 0.5 : 1 }]}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
        </GlassSurface>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  headerAvatar: { width: 30, height: 30, borderRadius: 15 },
  headerAvatarFallback: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.bodyStrong, fontSize: 15, maxWidth: 200 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "78%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleText: { ...typography.body, fontSize: 15 },
  inputRow: { borderTopWidth: StyleSheet.hairlineWidth },
  inputRowTop: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  input: { flex: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, maxHeight: 120, ...typography.body, fontSize: 15 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
