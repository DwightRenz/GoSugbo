export type RtcPeer = {
  createOffer: () => Promise<{ type: "offer"; sdp: string }>;
  createAnswer: () => Promise<{ type: "answer"; sdp: string }>;
  setRemoteDescription: (
    sdp: string,
    type: "offer" | "answer",
  ) => Promise<void>;
  addIceCandidate: (candidate: Record<string, unknown>) => Promise<void>;
  onIceCandidate: (cb: (c: Record<string, unknown>) => void) => void;
  close: () => void;
};

export type RtcRuntime = {
  createPeer: (iceServers: { urls: string }[]) => RtcPeer;
  getUserMedia: () => Promise<{ stop: () => void }>;
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
      return { stop: () => stream.getTracks().forEach((t: any) => t.stop()) };
    },
    createPeer(iceServers) {
      const pc = new RTCPeerConnection({ iceServers });
      let iceCb: ((c: Record<string, unknown>) => void) | null = null;

      pc.onicecandidate = (e: any) => {
        if (e.candidate && iceCb) {
          iceCb({
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        }
      };

      return {
        async createOffer() {
          const offer = await pc.createOffer();
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
        close() {
          pc.close();
        },
      };
    },
  };
  return cached;
}

function safeRequire(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-webrtc");
  } catch {
    return null;
  }
}
