package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.ChatMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class ChatDtos {

    private ChatDtos() {}

    public record SendMessageRequest(
            @NotBlank(message = "Message cannot be empty")
            @Size(max = 1000, message = "Message must be 1000 characters or fewer")
            String body
    ) {}

    public record ChatMessageResponse(
            Long messageId,
            Integer rideId,
            Integer senderId,
            String senderRole,
            String body,
            LocalDateTime createdAt,
            LocalDateTime readAt
    ) {
        public static ChatMessageResponse from(ChatMessage m) {
            return new ChatMessageResponse(
                    m.getMessageId(), m.getRideId(), m.getSenderId(),
                    m.getSenderRole(), m.getBody(), m.getCreatedAt(), m.getReadAt());
        }
    }
}