import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchChatHistory,
  sendChatMessage,
  subscribeToRideChat,
} from "@/services/chatService";
import { ApiError } from "@/lib/api";
import type { ChatMessage } from "@/types/chat";

export type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  connected: boolean;
  error: string;
  send: (body: string) => Promise<boolean>;
};

export function useChat(rideId: number | null): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef<{ disconnect: () => void } | null>(null);

  // Fetch history + subscribe once per ride.
  useEffect(() => {
    if (rideId == null) return;
    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError("");
    });

    fetchChatHistory(rideId)
      .then((list) => {
        if (!active) return;
        setMessages(list);
      })
      .catch((e) => {
        if (!active) return;
        setError(
          e instanceof ApiError ? e.displayMessage : "Could not load chat.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    socketRef.current = subscribeToRideChat(rideId, {
      onConnected: () => active && setConnected(true),
      onMessage: (msg) => {
        if (!active) return;
        // Dedupe in case the sender also got their own broadcast back.
        setMessages((prev) =>
          prev.some((m) => m.messageId === msg.messageId) ? prev : (
            [...prev, msg]
          ),
        );
      },
      onError: (m) => active && setError(m),
    });

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [rideId]);

  const send = useCallback(
    async (body: string) => {
      if (rideId == null) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;
      setSending(true);
      setError("");
      try {
        const saved = await sendChatMessage(rideId, trimmed);
        // Optimistic add — the broadcast dedupe above keeps it single.
        setMessages((prev) =>
          prev.some((m) => m.messageId === saved.messageId) ? prev : (
            [...prev, saved]
          ),
        );
        return true;
      } catch (e) {
        setError(
          e instanceof ApiError ? e.displayMessage : "Could not send message.",
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [rideId],
  );

  return { messages, loading, sending, connected, error, send };
}
