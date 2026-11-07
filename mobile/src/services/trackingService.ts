import { Client, type IMessage } from "@stomp/stompjs";
import { API_URL } from "@/lib/config";
import type {
  RideLocationBroadcast,
  RidePaymentBroadcast,
  RideStatusBroadcast,
} from "@/types/ride";

/**
 * Builds a WebSocket URL from the REST API base.
 * http://host:8080  → ws://host:8080/ws
 * https://host      → wss://host/ws
 */
function wsUrl(): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws`;
}

export type RideTrackingHandlers = {
  onLocation: (data: RideLocationBroadcast) => void;
  onStatus: (data: RideStatusBroadcast) => void;
  /** NEW — fires on /topic/rides/{id}/payment. Optional; old callers unaffected. */
  onPayment?: (data: RidePaymentBroadcast) => void;
  onError?: (message: string) => void;
  onConnected?: () => void;
};

/**
 * Connects to the STOMP broker and subscribes to a ride's
 * location / status / payment topics.
 * Returns a handle with a `disconnect()` method. Call it on unmount.
 *
 * Note: the backend STOMP endpoint is not authenticated at the
 * handshake level (WebSocketConfig permits all origins). If you later add
 * STOMP auth, pass the bearer token via connectHeaders.
 */
export function subscribeToRide(
  rideId: number,
  handlers: RideTrackingHandlers,
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

    client.subscribe(`/topic/rides/${rideId}/location`, (msg: IMessage) => {
      try {
        handlers.onLocation(JSON.parse(msg.body));
      } catch {
        /* ignore malformed payloads */
      }
    });

    client.subscribe(`/topic/rides/${rideId}/status`, (msg: IMessage) => {
      try {
        handlers.onStatus(JSON.parse(msg.body));
      } catch {
        /* ignore */
      }
    });

    // NEW
    client.subscribe(`/topic/rides/${rideId}/payment`, (msg: IMessage) => {
      try {
        handlers.onPayment?.(JSON.parse(msg.body));
      } catch {
        /* ignore */
      }
    });
  };

  client.onStompError = (frame) => {
    handlers.onError?.(frame.headers["message"] ?? "Tracking connection error");
  };

  client.onWebSocketError = () => {
    handlers.onError?.("Cannot reach the tracking server");
  };

  client.activate();

  return {
    disconnect: () => {
      void client.deactivate();
    },
  };
}
