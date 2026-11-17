import { useCallback, useEffect, useRef, useState } from "react";
import {
  relayCallSignal,
  startRideCall,
  subscribeToRideCall,
} from "@/services/callService";
import { loadWebRtc, type RtcPeer } from "@/lib/webrtc";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { CallSession, CallSignal } from "@/types/call";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export type CallPhase =
  | "idle"
  | "calling" // caller initiated, waiting for answer
  | "ringing" // callee received incoming
  | "active" // both connected
  | "ended";

export type CallState = {
  phase: CallPhase;
  session: CallSession | null;
  error: string;
  mediaSupported: boolean;
  muted: boolean;
  peerConnected: boolean;
  remoteName: string | null;
  start: (rideId: number, remoteName: string) => Promise<void>;
  accept: () => Promise<void>;
  reject: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
};

/**
 * Orchestrates a single in-ride call. The caller:
 *   start(rideId) → POST /call/start → waiting for "answer" signal
 * The callee:
 *   receives "ringing" signal → user taps Accept → accept() → POST answer
 * Both sides relay ICE via /call/relay.
 *
 * Signaling works without react-native-webrtc (Postman-verifiable). Media
 * only flows when the native module is present (dev-client rebuild).
 */
export function useCall(rideId: number | null): CallState {
  const { user } = useAuth();
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [session, setSession] = useState<CallSession | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [remoteName, setRemoteName] = useState<string | null>(null);

  const socketRef = useRef<{ disconnect: () => void } | null>(null);
  const peerRef = useRef<RtcPeer | null>(null);
  const mediaRef = useRef<{ stop: () => void } | null>(null);
  const sessionRef = useRef<CallSession | null>(null);
  const phaseRef = useRef<CallPhase>("idle");
  const mediaSupported = loadWebRtc() !== null;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Subscribe to signaling for this ride while a call is possible.
  useEffect(() => {
    if (rideId == null) return;
    socketRef.current = subscribeToRideCall(rideId, {
      onSignal: (sig) => void handleSignal(sig),
      onError: (m) => setError(m),
    });
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      teardownPeer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  function teardownPeer() {
    peerRef.current?.close();
    peerRef.current = null;
    mediaRef.current?.stop();
    mediaRef.current = null;
    setPeerConnected(false);
  }

  const handleSignal = useCallback(
    async (sig: CallSignal) => {
      // Ignore our own broadcasts (server echoes to both parties).
      if (user && sig.fromUserId === user.id) return;

      switch (sig.type) {
        case "ringing": {
          // Incoming call. Only accept if we are the callee and not already on a call.
          if (phaseRef.current !== "idle") return;
          const incoming: CallSession = {
            callId: sig.callId,
            rideId: sig.rideId,
            callerId: sig.fromUserId,
            calleeId: sig.toUserId,
            callerRole: sig.fromRole,
            calleeRole: sig.fromRole === "customer" ? "rider" : "customer",
            status: "ringing",
            startedAt: sig.timestamp,
            answeredAt: null,
            endedAt: null,
            endReason: null,
          };
          setSession(incoming);
          setPhase("ringing");
          return;
        }
        case "offer": {
          // Callee receives the caller's SDP offer.
          const s = sessionRef.current;
          if (!s || s.callId !== sig.callId || !sig.sdp) return;
          const webrtc = loadWebRtc();
          if (!webrtc) return; // signaling-only mode: skip media
          try {
            const peer = peerRef.current ?? webrtc.createPeer(ICE_SERVERS);
            peerRef.current = peer;
            peer.onIceCandidate((candidate) => {
              void relayCallSignal(s.rideId, {
                type: "ice",
                callId: s.callId,
                candidate,
              }).catch(() => {});
            });
            await peer.setRemoteDescription(sig.sdp, "offer");
            const answer = await peer.createAnswer();
            await relayCallSignal(s.rideId, {
              type: "answer",
              callId: s.callId,
              sdpType: "answer",
              sdp: answer.sdp,
            });
            setPhase("active");
            setPeerConnected(true);
          } catch (e: any) {
            setError(e?.message ?? "Failed to negotiate call.");
          }
          return;
        }
        case "answer": {
          // Caller receives the callee's SDP answer.
          const s = sessionRef.current;
          if (!s || s.callId !== sig.callId || !sig.sdp) return;
          try {
            await peerRef.current?.setRemoteDescription(sig.sdp, "answer");
            setPhase("active");
            setPeerConnected(true);
          } catch (e: any) {
            setError(e?.message ?? "Failed to connect call.");
          }
          return;
        }
        case "ice": {
          const s = sessionRef.current;
          if (!s || s.callId !== sig.callId || !sig.candidate) return;
          try {
            await peerRef.current?.addIceCandidate(sig.candidate);
          } catch {
            /* candidates may arrive before peer is ready; drop silently */
          }
          return;
        }
        case "hangup":
        case "reject":
        case "timeout": {
          const s = sessionRef.current;
          if (!s || s.callId !== sig.callId) return;
          teardownPeer();
          setPhase("ended");
          setError(
            sig.type === "timeout" ? "Call timed out."
            : sig.type === "reject" ? "Call declined."
            : "Call ended.",
          );
          return;
        }
      }
    },
    [user],
  );

  const start = useCallback(async (targetRideId: number, name: string) => {
    setError("");
    setRemoteName(name);
    try {
      const s = await startRideCall(targetRideId);
      setSession(s);
      setPhase("calling");

      // Caller creates the SDP offer immediately after POST start.
      const webrtc = loadWebRtc();
      if (webrtc) {
        mediaRef.current = await webrtc.getUserMedia();
        const peer = webrtc.createPeer(ICE_SERVERS);
        peerRef.current = peer;
        peer.onIceCandidate((candidate) => {
          void relayCallSignal(targetRideId, {
            type: "ice",
            callId: s.callId,
            candidate,
          }).catch(() => {});
        });
        const offer = await peer.createOffer();
        await relayCallSignal(targetRideId, {
          type: "offer",
          callId: s.callId,
          sdpType: "offer",
          sdp: offer.sdp,
        });
      } else {
        // Signaling-only mode — still POST the offer so the callee's UI moves on.
        await relayCallSignal(targetRideId, {
          type: "offer",
          callId: s.callId,
          sdpType: "offer",
          sdp: "signaling-only",
        });
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.displayMessage : "Could not start the call.",
      );
      setPhase("ended");
    }
  }, []);

  const accept = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    setError("");
    const webrtc = loadWebRtc();
    if (webrtc) {
      mediaRef.current = await webrtc.getUserMedia();
      // The offer handler creates the peer + sends the answer.
    }
    // The actual answer is sent when the "offer" signal arrives.
  }, []);

  const reject = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      await relayCallSignal(s.rideId, {
        type: "reject",
        callId: s.callId,
        reason: "declined",
      });
    } catch {
      /* best-effort */
    }
    teardownPeer();
    setPhase("ended");
  }, []);

  const hangup = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      await relayCallSignal(s.rideId, {
        type: "hangup",
        callId: s.callId,
        reason: "user_hangup",
      });
    } catch {
      /* best-effort */
    }
    teardownPeer();
    setPhase("ended");
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  // The hook is single-use per ride; reset when rideId changes.
  useEffect(() => {
    if (rideId == null) {
      teardownPeer();
      setPhase("idle");
      setSession(null);
      setError("");
      setRemoteName(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  return {
    phase,
    session,
    error,
    mediaSupported,
    muted,
    peerConnected,
    remoteName,
    start,
    accept,
    reject,
    hangup,
    toggleMute,
  };
}
