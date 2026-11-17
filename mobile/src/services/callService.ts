import { Client, type IMessage } from "@stomp/stompjs";
import { request } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { tokenStorage } from "@/lib/storage";
import type {
  CallSession,
  CallSignal,
  CallSnapshot,
  RelaySignalInput,
} from "@/types/call";

function wsUrl(): string {
  return `${API_URL.replace(/^http/, "ws")}/ws`;
}

export function startRideCall(rideId: number) {
  return request<CallSession>(`/api/rides/${rideId}/call/start`, {
    method: "POST",
    auth: true,
  });
}

export function relayCallSignal(rideId: number, input: RelaySignalInput) {
  return request<CallSignal>(`/api/rides/${rideId}/call/relay`, {
    method: "POST",
    auth: true,
    body: input,
  });
}

/**
 * Late-join snapshot: the ringing session plus the stored offer and ICE.
 * Returns null when there is no active call, or when the backend does not
 * have this endpoint yet (GET /api/rides/{rideId}/call/active).
 */
export async function fetchActiveCall(
  rideId: number,
): Promise<CallSnapshot | null> {
  try {
    const snap = await request<CallSnapshot | null>(
      `/api/rides/${rideId}/call/active`,
      { auth: true },
    );
    return snap ?? null;
  } catch {
    return null;
  }
}

export type CallSocketHandlers = {
  onSignal: (signal: CallSignal) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
};

/**
 * Subscribes to /topic/rides/{rideId}/call for realtime signaling.
 * Sends the bearer token on CONNECT so the backend can authorize the
 * subscription (it must check the user belongs to this ride).
 */
export function subscribeToRideCall(
  rideId: number,
  handlers: CallSocketHandlers,
) {
  const client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // Needed for STOMP over React Native's WebSocket.
    debug: () => {},
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    beforeConnect: async (c) => {
      const token = await tokenStorage.get();
      c.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
  });

  client.onConnect = () => {
    handlers.onConnected?.();
    client.subscribe(`/topic/rides/${rideId}/call`, (msg: IMessage) => {
      try {
        handlers.onSignal(JSON.parse(msg.body));
      } catch {
        /* ignore malformed payload */
      }
    });
  };

  client.onStompError = (frame) => {
    handlers.onError?.(frame.headers["message"] ?? "Call connection error");
  };
  client.onWebSocketError = () => {
    handlers.onError?.("Cannot reach the call server");
  };
  client.onWebSocketClose = () => {
    handlers.onDisconnected?.();
  };

  client.activate();
  return { disconnect: () => void client.deactivate() };
}
