import { Client, type IMessage } from "@stomp/stompjs";
import { request } from "@/lib/api";
import { API_URL } from "@/lib/config";
import type { CallSession, CallSignal, RelaySignalInput } from "@/types/call";

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

export type CallSocketHandlers = {
  onSignal: (signal: CallSignal) => void;
  onConnected?: () => void;
  onError?: (message: string) => void;
};

/**
 * Subscribes to /topic/rides/{rideId}/call for realtime signaling.
 * Mirrors subscribeToRideChat exactly so both hooks share the STOMP idiom.
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
    debug: () => {},
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

  client.activate();
  return { disconnect: () => void client.deactivate() };
}
