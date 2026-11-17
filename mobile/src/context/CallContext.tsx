import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { router } from "expo-router";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  loadWebRtc,
  type IceServer,
  type LocalMedia,
  type RtcPeer,
} from "@/lib/webrtc";
import {
  fetchActiveCall,
  relayCallSignal,
  startRideCall,
  subscribeToRideCall,
} from "@/services/callService";
import type { CallSession, CallSignal } from "@/types/call";

// TURN is optional. Set these in mobile/.env (comma-separate multiple URLs):
//   EXPO_PUBLIC_TURN_URLS=turn:host:80,turn:host:443?transport=tcp
//   EXPO_PUBLIC_TURN_USERNAME=...
//   EXPO_PUBLIC_TURN_CREDENTIAL=...
const TURN_URLS = (process.env.EXPO_PUBLIC_TURN_URLS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TURN_USERNAME = process.env.EXPO_PUBLIC_TURN_USERNAME ?? "";
const TURN_CREDENTIAL = process.env.EXPO_PUBLIC_TURN_CREDENTIAL ?? "";

const ICE_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(TURN_URLS.length && TURN_USERNAME && TURN_CREDENTIAL ?
    [
      {
        urls: TURN_URLS,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
    ]
  : []),
];

if (ICE_SERVERS.length === 1) {
  console.log(
    "[call] No TURN configured. Calls across different networks may fail.",
  );
}

const RING_TIMEOUT_MS = 45_000;

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
  start: (rideId: number) => Promise<void>;
  accept: () => Promise<void>;
  reject: () => Promise<void>;
  hangup: (reason?: string) => Promise<void>;
  /** Hang up / reject if needed, then reset to idle. Call when leaving the screen. */
  leave: () => Promise<void>;
  toggleMute: () => void;
  /** Keep the call socket subscribed to this ride. Returns an unwatch function. */
  watchRide: (rideId: number) => () => void;
  /** The call screen tells the provider it is open so it is not pushed twice. */
  setCallScreenOpen: (open: boolean) => void;
};

const CallContext = createContext<CallState | null>(null);

export function useCallContext(): CallState {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCallContext must be used inside <CallProvider>");
  }
  return ctx;
}

function sameId(a: unknown, b: unknown) {
  return a != null && b != null && Number(a) === Number(b);
}

/**
 * Owns the single in-ride call for the whole app, so an incoming call can be
 * received on any screen that is watching the ride (ride tracking, rider home).
 *
 * Caller: start() -> POST /call/start -> getUserMedia -> createOffer -> relay offer
 *         -> receives "answer" -> setRemoteDescription.
 * Callee: receives "ringing" (screen opens) + "offer" (stored) -> Accept ->
 *         getUserMedia -> setRemoteDescription(offer) -> createAnswer -> relay answer.
 * ICE that arrives before the remote description is set is buffered.
 */
function CallProviderInner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [phase, setPhaseState] = useState<CallPhase>("idle");
  const [session, setSessionState] = useState<CallSession | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [watchers, setWatchers] = useState<{ key: number; rideId: number }[]>(
    [],
  );

  const peerRef = useRef<RtcPeer | null>(null);
  const mediaRef = useRef<LocalMedia | null>(null);
  const sessionRef = useRef<CallSession | null>(null);
  const phaseRef = useRef<CallPhase>("idle");
  const mutedRef = useRef(false);
  const watchKeyRef = useRef(0);
  const connectedRideRef = useRef<number | null>(null);
  const callScreenOpenRef = useRef(false);

  const startingRef = useRef(false);
  const acceptingRef = useRef(false);
  const pendingOfferRef = useRef<string | null>(null);
  const pendingIceRef = useRef<Record<string, unknown>[]>([]);
  const remoteSetRef = useRef(false);
  const acceptedRef = useRef(false);

  const handleSignalRef = useRef<(sig: CallSignal) => Promise<void>>(
    async () => {},
  );
  const syncActiveRef = useRef<(rideId: number) => Promise<void>>(
    async () => {},
  );
  const mediaSupported = loadWebRtc() !== null;

  // Update refs synchronously together with state so back-to-back signals
  // never see stale values.
  function setPhase(p: CallPhase) {
    phaseRef.current = p;
    setPhaseState(p);
  }
  function setSession(s: CallSession | null) {
    sessionRef.current = s;
    setSessionState(s);
  }

  function resetCallBuffers() {
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    remoteSetRef.current = false;
    acceptedRef.current = false;
  }

  function teardownPeer() {
    peerRef.current?.close();
    peerRef.current = null;
    mediaRef.current?.stop();
    mediaRef.current = null;
    resetCallBuffers();
    setPeerConnected(false);
  }

  function isBusy() {
    return (
      phaseRef.current === "calling" ||
      phaseRef.current === "ringing" ||
      phaseRef.current === "active"
    );
  }

  async function flushPendingIce() {
    const peer = peerRef.current;
    if (!peer) return;
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const c of queued) {
      try {
        await peer.addIceCandidate(c);
      } catch {
        /* ignore bad candidates */
      }
    }
  }

  function wirePeer(peer: RtcPeer, s: CallSession) {
    peer.onIceCandidate((candidate) => {
      void relayCallSignal(s.rideId, {
        type: "ice",
        callId: s.callId,
        candidate,
      }).catch(() => {});
    });
    peer.onConnectionState((state) => {
      if (state === "connected" || state === "completed") {
        setPeerConnected(true);
      } else if (state === "disconnected") {
        setPeerConnected(false);
      } else if (state === "failed") {
        setPeerConnected(false);
        setError(
          "Could not connect the call audio. These networks may need a TURN server.",
        );
      }
    });
  }

  // Callee: build the peer from the stored offer and send the answer.
  async function answerPendingOffer() {
    const s = sessionRef.current;
    const offerSdp = pendingOfferRef.current;
    const webrtc = loadWebRtc();
    if (!s || !offerSdp || !webrtc || peerRef.current) return;

    try {
      const peer = webrtc.createPeer(ICE_SERVERS, mediaRef.current?.stream);
      peerRef.current = peer;
      wirePeer(peer, s);

      await peer.setRemoteDescription(offerSdp, "offer");
      remoteSetRef.current = true;
      await flushPendingIce();

      const answer = await peer.createAnswer();
      await relayCallSignal(s.rideId, {
        type: "answer",
        callId: s.callId,
        sdpType: "answer",
        sdp: answer.sdp,
      });
      pendingOfferRef.current = null;
      setPhase("active");
    } catch (e: any) {
      setError(e?.message ?? "Failed to negotiate call.");
    }
  }

  function openIncomingScreen(rideId: number) {
    if (callScreenOpenRef.current) return;
    router.push({
      pathname: "/call",
      params: { rideId: String(rideId), mode: "incoming" },
    });
  }

  function beginRinging(s: CallSession) {
    teardownPeer();
    setError("");
    setSession(s);
    setPhase("ringing");
    openIncomingScreen(s.rideId);
  }

  // Late-join: if a call is already ringing for us (we were not subscribed
  // in time), pick it up from the backend. Needs GET /call/active; a missing
  // endpoint simply returns null.
  async function syncActive(rideId: number) {
    if (isBusy()) return;
    const me = userRef.current;
    if (!me) return;
    const snap = await fetchActiveCall(rideId);
    if (!snap || isBusy()) return;
    const s = snap.session;
    if (s.status !== "ringing" || !sameId(s.calleeId, me.id)) return;

    beginRinging(s);
    const offerSdp = snap.offer?.sdp;
    if (offerSdp && offerSdp !== "signaling-only") {
      pendingOfferRef.current = offerSdp;
    }
    pendingIceRef.current = (snap.iceCandidates ?? [])
      .map((c) => c.candidate)
      .filter((c): c is Record<string, unknown> => !!c);
  }

  async function handleSignal(sig: CallSignal) {
    // Ignore our own broadcasts (server echoes to both parties), but still
    // accept backend-generated timeouts, which carry the caller's id.
    const me = userRef.current;
    if (me && sameId(sig.fromUserId, me.id) && sig.type !== "timeout") return;

    switch (sig.type) {
      case "ringing": {
        // Incoming call. Only take it if we are free.
        if (isBusy()) return;
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
        beginRinging(incoming);
        return;
      }
      case "offer": {
        // Callee receives the caller's SDP offer. Store it; answer on accept.
        const s = sessionRef.current;
        if (!s || s.callId !== sig.callId || !sig.sdp) return;
        if (sig.sdp === "signaling-only") return;
        pendingOfferRef.current = sig.sdp;
        if (acceptedRef.current) await answerPendingOffer();
        return;
      }
      case "answer": {
        // Caller receives the callee's SDP answer.
        const s = sessionRef.current;
        if (!s || s.callId !== sig.callId || !sig.sdp) return;
        try {
          if (sig.sdp !== "signaling-only" && peerRef.current) {
            await peerRef.current.setRemoteDescription(sig.sdp, "answer");
            remoteSetRef.current = true;
            await flushPendingIce();
          }
          setPhase("active");
        } catch (e: any) {
          setError(e?.message ?? "Failed to connect call.");
        }
        return;
      }
      case "ice": {
        const s = sessionRef.current;
        if (!s || s.callId !== sig.callId || !sig.candidate) return;
        if (peerRef.current && remoteSetRef.current) {
          try {
            await peerRef.current.addIceCandidate(sig.candidate);
          } catch {
            /* ignore */
          }
        } else {
          pendingIceRef.current.push(sig.candidate);
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
  }

  // Always point at the latest handlers (fresh closures). Done in an effect
  // so no ref is written during render (React Compiler).
  useEffect(() => {
    handleSignalRef.current = handleSignal;
    syncActiveRef.current = syncActive;
  });

  // ----- Which ride are we listening to? -----
  const watchRide = useCallback((rideId: number) => {
    const key = ++watchKeyRef.current;
    setWatchers((w) => [...w, { key, rideId }]);
    return () => setWatchers((w) => w.filter((x) => x.key !== key));
  }, []);

  const setCallScreenOpen = useCallback((open: boolean) => {
    callScreenOpenRef.current = open;
  }, []);

  const watchedRideId =
    watchers.length > 0 ? watchers[watchers.length - 1].rideId : null;
  const callInProgress =
    !!session &&
    (phase === "calling" || phase === "ringing" || phase === "active");
  // Never drop the socket of a live call because a screen unmounted.
  const socketRideId = callInProgress ? session.rideId : watchedRideId;

  useEffect(() => {
    if (socketRideId == null) return;
    const rideId = socketRideId;
    const sub = subscribeToRideCall(rideId, {
      onSignal: (sig) => void handleSignalRef.current(sig),
      onConnected: () => {
        connectedRideRef.current = rideId;
        void syncActiveRef.current(rideId);
      },
      onDisconnected: () => {
        connectedRideRef.current = null;
      },
      onError: (m) => setError(m),
    });
    return () => {
      connectedRideRef.current = null;
      sub.disconnect();
    };
  }, [socketRideId]);

  // Provider unmount (app teardown / logout).
  useEffect(() => {
    return () => teardownPeer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply mute to the real audio track.
  useEffect(() => {
    mutedRef.current = muted;
    mediaRef.current?.setMuted(muted);
  }, [muted]);

  // ----- Actions -----
  // If a stale ringing call from this user is still open on the backend
  // (e.g. the app reloaded mid-call), end it and try once more.
  async function startSession(rideId: number): Promise<CallSession> {
    try {
      return await startRideCall(rideId);
    } catch (e: any) {
      const msg = String(e?.displayMessage ?? e?.message ?? "");
      if (!/already ringing/i.test(msg)) throw e;
      const snap = await fetchActiveCall(rideId);
      const me = userRef.current;
      if (!snap || !me || !sameId(snap.session.callerId, me.id)) throw e;
      await relayCallSignal(rideId, {
        type: "hangup",
        callId: snap.session.callId,
        reason: "stale",
      }).catch(() => {});
      return startRideCall(rideId);
    }
  }

  async function waitForSocket(rideId: number, ms = 4000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (connectedRideRef.current === rideId) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  const start = useCallback(async (targetRideId: number) => {
    if (startingRef.current || isBusy()) return;
    startingRef.current = true;
    setError("");
    teardownPeer();
    let startedSession: CallSession | null = null;
    try {
      // Be subscribed before the callee can answer, or the answer is lost.
      await waitForSocket(targetRideId);

      const s = await startSession(targetRideId);
      startedSession = s;
      setSession(s);
      setPhase("calling");

      const webrtc = loadWebRtc();
      if (webrtc) {
        const media = await webrtc.getUserMedia();
        media.setMuted(mutedRef.current);
        mediaRef.current = media;

        const peer = webrtc.createPeer(ICE_SERVERS, media.stream);
        peerRef.current = peer;
        wirePeer(peer, s);

        const offer = await peer.createOffer();
        await relayCallSignal(targetRideId, {
          type: "offer",
          callId: s.callId,
          sdpType: "offer",
          sdp: offer.sdp,
        });
      } else {
        // Signaling-only mode: still POST the offer so the callee's UI moves on.
        await relayCallSignal(targetRideId, {
          type: "offer",
          callId: s.callId,
          sdpType: "offer",
          sdp: "signaling-only",
        });
      }
    } catch (e: any) {
      // Don't leave the callee ringing if we failed (e.g. mic denied).
      if (startedSession) {
        void relayCallSignal(targetRideId, {
          type: "hangup",
          callId: startedSession.callId,
          reason: "caller_error",
        }).catch(() => {});
      }
      teardownPeer();
      setError(
        e instanceof ApiError ?
          e.displayMessage
        : (e?.message ?? "Could not start the call."),
      );
      setPhase("ended");
    } finally {
      startingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || acceptedRef.current || acceptingRef.current) return;
    acceptingRef.current = true;
    setError("");

    try {
      const webrtc = loadWebRtc();
      if (!webrtc) {
        // Signaling-only mode: tell the caller we picked up.
        try {
          await relayCallSignal(s.rideId, {
            type: "answer",
            callId: s.callId,
            sdpType: "answer",
            sdp: "signaling-only",
          });
          acceptedRef.current = true;
          setPhase("active");
        } catch (e: any) {
          setError(e?.message ?? "Failed to accept call.");
        }
        return;
      }

      // Get the mic BEFORE marking accepted, so an offer that arrives in the
      // meantime is only answered once local audio is ready.
      try {
        const media = await webrtc.getUserMedia();
        media.setMuted(mutedRef.current);
        mediaRef.current = media;
      } catch (e: any) {
        setError(e?.message ?? "Microphone permission is required.");
        return;
      }

      acceptedRef.current = true;
      // If the offer already arrived, answer now; otherwise the "offer"
      // handler answers as soon as it arrives.
      if (pendingOfferRef.current) await answerPendingOffer();
    } finally {
      acceptingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hangup = useCallback(async (reason: string = "user_hangup") => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      await relayCallSignal(s.rideId, {
        type: "hangup",
        callId: s.callId,
        reason,
      });
    } catch {
      /* best-effort */
    }
    teardownPeer();
    setPhase("ended");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = useCallback(async () => {
    const s = sessionRef.current;
    const p = phaseRef.current;
    if (s && (p === "calling" || p === "active")) {
      try {
        await relayCallSignal(s.rideId, {
          type: "hangup",
          callId: s.callId,
          reason: "left_screen",
        });
      } catch {
        /* best-effort */
      }
    } else if (s && p === "ringing") {
      try {
        await relayCallSignal(s.rideId, {
          type: "reject",
          callId: s.callId,
          reason: "left_screen",
        });
      } catch {
        /* best-effort */
      }
    }
    teardownPeer();
    setPhase("idle");
    setSession(null);
    setError("");
    setMuted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  // Nobody answered: stop ringing instead of waiting forever.
  useEffect(() => {
    if (phase !== "calling" && phase !== "ringing") return;
    const t = setTimeout(() => {
      if (phaseRef.current === "calling") {
        void hangup("no_answer").then(() => setError("No answer."));
      } else if (phaseRef.current === "ringing") {
        teardownPeer();
        setPhase("ended");
        setError("Missed call.");
      }
    }, RING_TIMEOUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hangup]);

  const value: CallState = {
    phase,
    session,
    error,
    mediaSupported,
    muted,
    peerConnected,
    start,
    accept,
    reject,
    hangup,
    leave,
    toggleMute,
    watchRide,
    setCallScreenOpen,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

/**
 * Keyed by user so logging out (or switching accounts) unmounts the inner
 * provider, which closes the peer and resets all call state.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <CallProviderInner key={user?.id ?? "anonymous"}>
      {children}
    </CallProviderInner>
  );
}
