import { Client, type IMessage } from "@stomp/stompjs";
import { request } from "@/lib/api";
import { API_URL } from "@/lib/config";
import type { ChatMessage } from "@/types/chat";

function wsUrl(): string {
  return `${API_URL.replace(/^http/, "ws")}/ws`;
}

export function fetchChatHistory(rideId: number) {
  return request<ChatMessage[]>(`/api/rides/${rideId}/chat`, { auth: true });
}

export function sendChatMessage(rideId: number, body: string) {
  return request<ChatMessage>(`/api/rides/${rideId}/chat`, {
    method: "POST",
    auth: true,
    body: { body },
  });
}

export type ChatSocketHandlers = {
  onMessage: (msg: ChatMessage) => void;
  onConnected?: () => void;
  onError?: (message: string) => void;
};

/**
 * Subscribes to /topic/rides/{rideId}/chat for realtime updates.
 * Returned handle exposes `disconnect()`. Call it on unmount.
 * (Message sending goes through REST — the broadcast picks it up here.)
 */
export function subscribeToRideChat(
  rideId: number,
  handlers: ChatSocketHandlers,
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
    client.subscribe(`/topic/rides/${rideId}/chat`, (msg: IMessage) => {
      try {
        handlers.onMessage(JSON.parse(msg.body));
      } catch {
        /* ignore malformed payload */
      }
    });
  };

  client.onStompError = (frame) => {
    handlers.onError?.(frame.headers["message"] ?? "Chat connection error");
  };
  client.onWebSocketError = () => {
    handlers.onError?.("Cannot reach the chat server");
  };

  client.activate();
  return { disconnect: () => void client.deactivate() };
}
