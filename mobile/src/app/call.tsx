import { useEffect, useRef, useState } from "react";
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
import { fetchRide } from "@/services/rideService";

function parseId(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function firstParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function CallScreen() {
  const params = useLocalSearchParams<{
    rideId?: string | string[];
    title?: string | string[];
    mode?: string | string[];
  }>();
  const rideId = parseId(params.rideId);
  const title = firstParam(params.title);
  // "incoming": opened by the provider because someone is calling us.
  // "outgoing": opened by CallButton, so we place the call.
  const mode = firstParam(params.mode) === "incoming" ? "incoming" : "outgoing";

  const { user } = useAuth();
  const isRider = user?.role === "rider";
  const call = useCall(rideId);
  const [peerName, setPeerName] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Tell the provider this screen is open so it does not push a second one.
  useEffect(() => {
    call.setCallScreenOpen(true);
    return () => call.setCallScreenOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hang up / decline if the user leaves the screen mid-call.
  useEffect(() => {
    return () => {
      void call.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look up the other person's name.
  useEffect(() => {
    if (rideId == null) return;
    let active = true;
    fetchRide(rideId)
      .then((ride) => {
        if (!active) return;
        setPeerName(
          (isRider ? ride.customer?.fullName : ride.rider?.fullName) ?? null,
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [rideId, isRider]);

  // Only the caller auto-starts. The callee waits for the incoming ringing
  // signal, so opening this screen never triggers a counter-call.
  useEffect(() => {
    if (rideId == null || mode !== "outgoing" || startedRef.current) return;
    startedRef.current = true;
    void call.start(rideId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, mode]);

  // Opened as "incoming" but the call is already gone: don't spin forever.
  useEffect(() => {
    if (mode !== "incoming" || call.phase !== "idle") return;
    const t = setTimeout(goBack, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, call.phase]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }

  if (rideId == null) {
    return <Redirect href="/home" />;
  }

  const heading =
    call.phase === "calling" ? "Calling…"
    : call.phase === "ringing" ? "Incoming call"
    : call.phase === "active" ? "In call"
    : call.phase === "ended" ? "Call ended"
    : mode === "incoming" ? "Connecting…"
    : "Voice call";

  const otherParty = title ?? peerName ?? "the other party";
  const initials =
    otherParty
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.container}>
        <View style={s.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={s.headerButton}>
            <BackArrow />
          </Pressable>
          <Text style={s.headerTitle}>Voice call</Text>
          <View style={s.headerButton} />
        </View>

        <View style={s.body}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{otherParty}</Text>
          <Text style={s.status}>{heading}</Text>
          {!call.mediaSupported && (
            <Text style={s.note}>
              Voice audio needs a development build with react-native-webrtc
              (not Expo Go). Signaling still works.
            </Text>
          )}
          {call.phase === "active" && (
            <Text style={s.note}>
              {call.peerConnected ? "Peer connected" : "Connecting audio…"}
            </Text>
          )}
          {!!call.error && <Text style={s.error}>{call.error}</Text>}
        </View>

        <View style={s.actions}>
          {call.phase === "ringing" && (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void call.reject().finally(goBack);
                }}
                style={[s.round, s.decline]}>
                <Text style={s.roundText}>Decline</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void call.accept()}
                style={[s.round, s.accept]}>
                <Text style={s.roundText}>Accept</Text>
              </Pressable>
            </>
          )}

          {(call.phase === "calling" || call.phase === "active") && (
            <>
              {call.phase === "active" && (
                <Pressable
                  accessibilityRole="button"
                  onPress={call.toggleMute}
                  style={[s.round, s.mute]}>
                  <Text style={s.roundText}>
                    {call.muted ? "Unmute" : "Mute"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
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
            <Pressable
              accessibilityRole="button"
              onPress={goBack}
              style={[s.round, s.accept]}>
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
});
