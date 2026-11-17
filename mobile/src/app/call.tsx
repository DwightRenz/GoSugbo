import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BackArrow from "@/components/gosugbo/back-arrow";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/hooks/use-call";
import { useActiveRide } from "@/hooks/use-active-ride";

function parseId(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function CallScreen() {
  const params = useLocalSearchParams<{
    rideId?: string | string[];
    title?: string | string[];
  }>();
  const rideId = parseId(params.rideId);
  const title = Array.isArray(params.title) ? params.title[0] : params.title;

  const { user } = useAuth();
  const isRider = user?.role === "rider";
  const active = useActiveRide(isRider);
  const call = useCall(rideId);

  // Caller auto-starts on mount. Callee waits for an incoming ringing signal.
  useEffect(() => {
    if (rideId == null || call.phase !== "idle") return;
    // If there's an active incoming session already, do nothing; the hook's
    // signal handler has already switched phase to "ringing".
    if (call.session) return;
    void call.start(rideId, title ?? "the other party");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }

  if (rideId == null) {
    console.log("CALL opened without rideId", JSON.stringify(params));
    return <Redirect href="/home" />;
  }
  const heading =
    call.phase === "calling" ? "Calling…"
    : call.phase === "ringing" ? "Incoming call"
    : call.phase === "active" ? "In call"
    : call.phase === "ended" ? "Call ended"
    : "Voice call";

  const otherParty =
    title ??
    (isRider ?
      active.ride?.customer?.fullName
    : active.ride?.rider?.fullName) ??
    "the other party";

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.container}>
        <View style={s.header}>
          <Pressable onPress={goBack} style={s.headerButton}>
            <BackArrow />
          </Pressable>
          <Text style={s.headerTitle}>Voice call</Text>
          <View style={s.headerButton} />
        </View>

        <View style={s.body}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {otherParty
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </Text>
          </View>
          <Text style={s.name}>{otherParty}</Text>
          <Text style={s.status}>{heading}</Text>
          {!call.mediaSupported && (
            <Text style={s.note}>
              Voice media requires a dev-client rebuild with
              react-native-webrtc. Signaling is live.
            </Text>
          )}
          {call.phase === "active" && (
            <Text style={s.note}>
              {call.peerConnected ? "Peer connected" : "Connecting…"}
            </Text>
          )}
          {!!call.error && <Text style={s.error}>{call.error}</Text>}
        </View>

        <View style={s.actions}>
          {call.phase === "ringing" && (
            <>
              <Pressable
                onPress={() => {
                  void call.reject().finally(goBack);
                }}
                style={[s.round, s.decline]}>
                <Text style={s.roundText}>Decline</Text>
              </Pressable>
              <Pressable
                onPress={() => void call.accept()}
                style={[s.round, s.accept]}>
                <Text style={s.roundText}>Accept</Text>
              </Pressable>
            </>
          )}

          {(call.phase === "calling" || call.phase === "active") && (
            <>
              {call.phase === "active" && (
                <Pressable onPress={call.toggleMute} style={[s.round, s.mute]}>
                  <Text style={s.roundText}>
                    {call.muted ? "Unmute" : "Mute"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  void call.hangup().finally(goBack);
                }}
                style={[s.round, s.decline]}>
                <Text style={s.roundText}>
                  {call.phase === "calling" ? "Cancel" : "Hang up"}
                </Text>
              </Pressable>
            </>
          )}

          {call.phase === "ended" && (
            <Pressable onPress={goBack} style={[s.round, s.accept]}>
              <Text style={s.roundText}>Close</Text>
            </Pressable>
          )}

          {call.phase === "idle" && <ActivityIndicator color="#4C1C24" />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3E9DB" },
  container: { flex: 1, maxWidth: 480, alignSelf: "center", width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, color: "#4C1C24", fontSize: 18, fontWeight: "700" },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: { color: "#FFFFFF", fontSize: 40, fontWeight: "800" },
  name: { color: "#4C1C24", fontSize: 22, fontWeight: "800" },
  status: { color: "#88766E", fontSize: 14 },
  note: {
    color: "#88766E",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  error: { color: "#A92D36", fontSize: 12, textAlign: "center", marginTop: 8 },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  round: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  accept: { backgroundColor: "#087C35" },
  decline: { backgroundColor: "#A92D36" },
  mute: { backgroundColor: "#4C1C24" },
  roundText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});


