import { NativeModules } from "react-native";

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type RtcPeer = {
  createOffer: () => Promise<{ type: "offer"; sdp: string }>;
  createAnswer: () => Promise<{ type: "answer"; sdp: string }>;
  setRemoteDescription: (
    sdp: string,
    type: "offer" | "answer",
  ) => Promise<void>;
  addIceCandidate: (candidate: Record<string, unknown>) => Promise<void>;
  onIceCandidate: (cb: (c: Record<string, unknown>) => void) => void;
  onConnectionState: (cb: (state: string) => void) => void;
  close: () => void;
};

export type LocalMedia = {
  stream: any;
  setMuted: (muted: boolean) => void;
  stop: () => void;
};

export type RtcRuntime = {
  createPeer: (iceServers: IceServer[], localStream?: any) => RtcPeer;
  getUserMedia: () => Promise<LocalMedia>;
};

let cached: RtcRuntime | null | undefined;

export function loadWebRtc(): RtcRuntime | null {
  if (cached !== undefined) return cached;

  const rnWebRtc = safeRequire();
  if (!rnWebRtc) {
    cached = null;
    return null;
  }

  const {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
  } = rnWebRtc;

  cached = {
    async getUserMedia() {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      return {
        stream,
        setMuted: (muted: boolean) =>
          stream.getAudioTracks().forEach((t: any) => {
            t.enabled = !muted;
          }),
        stop: () => stream.getTracks().forEach((t: any) => t.stop()),
      };
    },
    createPeer(iceServers, localStream) {
      const pc = new RTCPeerConnection({ iceServers });
      let iceCb: ((c: Record<string, unknown>) => void) | null = null;
      let stateCb: ((s: string) => void) | null = null;

      if (localStream) {
        localStream
          .getTracks()
          .forEach((t: any) => pc.addTrack(t, localStream));
      }

      pc.onicecandidate = (e: any) => {
        if (e.candidate && iceCb) {
          iceCb({
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        stateCb?.(pc.iceConnectionState);
      };

      return {
        async createOffer() {
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          return { type: "offer", sdp: offer.sdp };
        },
        async createAnswer() {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          return { type: "answer", sdp: answer.sdp };
        },
        async setRemoteDescription(sdp, type) {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type, sdp }),
          );
        },
        async addIceCandidate(candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        },
        onIceCandidate(cb) {
          iceCb = cb;
        },
        onConnectionState(cb) {
          stateCb = cb;
        },
        close() {
          pc.close();
        },
      };
    },
  };
  return cached;
}

function safeRequire(): any {
  // In Expo Go the native module does not exist, and importing the package
  // throws an uncatchable redbox ("WebRTC native module not found").
  // Check for the native side first so we fall back to signaling-only.
  if (!NativeModules.WebRTCModule) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-webrtc");
  } catch {
    return null;
  }
}
