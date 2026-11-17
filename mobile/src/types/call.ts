export type CallStatus = "ringing" | "active" | "ended" | "rejected" | "missed";

export type CallSignalType =
  | "ringing"
  | "offer"
  | "answer"
  | "ice"
  | "hangup"
  | "reject"
  | "timeout";

/** Matches backend CallDtos.CallSession */
export type CallSession = {
  callId: number;
  rideId: number;
  callerId: number;
  calleeId: number;
  callerRole: "customer" | "rider";
  calleeRole: "customer" | "rider";
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  endReason: string | null;
};

/** Matches backend CallDtos.CallSignal */
export type CallSignal = {
  type: CallSignalType;
  callId: number;
  rideId: number;
  fromUserId: number;
  toUserId: number;
  fromRole: "customer" | "rider";
  sdpType: string | null;
  sdp: string | null;
  candidate: Record<string, unknown> | null;
  reason: string | null;
  timestamp: string;
};

/** Body of POST /api/rides/{rideId}/call/relay */
export type RelaySignalInput = {
  type: "offer" | "answer" | "ice" | "hangup" | "reject";
  callId: number;
  sdpType?: string;
  sdp?: string;
  candidate?: Record<string, unknown>;
  reason?: string;
};

/**
 * NEW. GET /api/rides/{rideId}/call/active
 * Lets a callee who wasn't subscribed in time (app on another screen, brief
 * socket drop) catch up on the ringing call, the stored offer and any ICE
 * candidates that were already sent. Needs a matching backend endpoint.
 */
export type CallSnapshot = {
  session: CallSession;
  offer: CallSignal | null;
  iceCandidates: CallSignal[];
};
