import { type ComponentRef, useMemo, useRef, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BackArrow from "@/components/gosugbo/back-arrow";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/hooks/use-chat";
import type { ChatMessage } from "@/types/chat";

/**
 * expo-router may deliver the same param as a string, an array, or
 * the literal strings "undefined" / "null" (from a bad String(x) cast).
 * This normalizes all of those to either a positive number or null.
 */
function parseRideId(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
}

function pickTitle(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === "undefined" || s === "null") return undefined;
  return s;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    rideId?: string | string[];
    title?: string | string[];
  }>();
  const rideId = parseRideId(params.rideId);
  const headerTitle =
    pickTitle(params.title) ?? (rideId != null ? `Ride #${rideId}` : "Chat");

  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // RN 0.88 types the TextInput ref as `_TextInputInstance`.
  // `ComponentRef<typeof TextInput>` resolves to that exact type.
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const { messages, loading, sending, connected, error, send } =
    useChat(rideId);

  const myRole = useMemo<"customer" | "rider" | null>(() => {
    if (!user) return null;
    return user.role === "rider" ? "rider" : "customer";
  }, [user]);

  async function handleSend() {
    if (!draft.trim() || sending) return;
    const ok = await send(draft);
    if (ok) {
      setDraft("");
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
    }
  }

  function timeLabel(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function goHome() {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }

  // ---- Missing / invalid ride id ----
  //
  // expo-router restores the last visited path on reload / re-login but does
  // NOT restore the params that were passed via router.push. So if we boot
  // into /chat with no rideId, we silently return to Home rather than
  // showing a dead-end error. Chat must always come from a ChatButton push.
  if (rideId == null) {
    setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/home");
    }, 0);

    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={goHome}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.headerButton}>
              <BackArrow />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Chat</Text>
            </View>
            <View style={styles.headerButton} />
          </View>

          <View style={styles.center}>
            <ActivityIndicator color="#4C1C24" />
            <Text style={styles.centerText}>Returning to Home…</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <View style={styles.header}>
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerButton}>
            <BackArrow />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              {connected ? "Online" : "Connecting…"}
            </Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        {loading ?
          <View style={styles.center}>
            <ActivityIndicator color="#4C1C24" />
            <Text style={styles.centerText}>Loading chat…</Text>
          </View>
        : <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.messageId)}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            onLayout={() => inputRef.current?.focus?.()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Say hello — messages appear in real time.
              </Text>
            }
            renderItem={({ item }) => {
              const mine = item.senderRole === myRole;
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    mine ? styles.bubbleRowMine : styles.bubbleRowOther,
                  ]}>
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleOther,
                    ]}>
                    <Text
                      style={[
                        styles.bubbleText,
                        mine ? styles.bubbleTextMine : styles.bubbleTextOther,
                      ]}>
                      {item.body}
                    </Text>
                    <Text
                      style={[
                        styles.bubbleTime,
                        mine ? styles.bubbleTimeMine : styles.bubbleTimeOther,
                      ]}>
                      {timeLabel(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        }

        {!!error && <Text style={styles.banner}>{error}</Text>}

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#88766E"
            value={draft}
            onChangeText={setDraft}
            maxLength={1000}
            editable={!sending}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendButton,
              (!draft.trim() || sending || pressed) && styles.sendDisabled,
            ]}>
            {sending ?
              <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.sendText}>Send</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3E9DB" },
  container: { flex: 1, maxWidth: 480, alignSelf: "center", width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E3CFB9",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#4C1C24", fontSize: 16, fontWeight: "800" },
  headerSubtitle: { color: "#88766E", fontSize: 11, marginTop: 2 },
  messages: { padding: 16, gap: 8 },
  bubbleRow: { width: "100%" },
  bubbleRowMine: { alignItems: "flex-end" },
  bubbleRowOther: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMine: { backgroundColor: "#4C1C24", borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3CFB9",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  bubbleTextMine: { color: "#FFFFFF" },
  bubbleTextOther: { color: "#4C1C24" },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: "#F3D6C6" },
  bubbleTimeOther: { color: "#88766E" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#E3CFB9",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    backgroundColor: "#FBF6EF",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    color: "#4C1C24",
    fontSize: 13,
    textAlignVertical: "top",
  },
  sendButton: {
    minHeight: 44,
    minWidth: 68,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  centerText: { color: "#4C1C24", fontSize: 13 },
  emptyText: {
    color: "#88766E",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 40,
  },
  banner: {
    color: "#A92D36",
    backgroundColor: "#FBEAEC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 11,
  },
});
