export type ChatSenderRole = "customer" | "rider";

export type ChatMessage = {
  messageId: number;
  rideId: number;
  senderId: number;
  senderRole: ChatSenderRole;
  body: string;
  createdAt: string;
  readAt: string | null;
};
