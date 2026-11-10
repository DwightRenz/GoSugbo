package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.ChatDtos.ChatMessageResponse;
import com.example.GoSugbo.dto.ChatDtos.SendMessageRequest;
import com.example.GoSugbo.entity.ChatMessage;
import com.example.GoSugbo.entity.Ride;
import com.example.GoSugbo.entity.RideStatus;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.ChatMessageRepository;
import com.example.GoSugbo.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ChatService {

    /** Chat is writable only while the ride is active. */
    private static final Set<RideStatus> CHAT_WRITABLE = EnumSet.of(
            RideStatus.ACCEPTED,
            RideStatus.ARRIVED_PICKUP,
            RideStatus.IN_PROGRESS);

    private final ChatMessageRepository messages;
    private final RideRepository rides;
    private final SimpMessagingTemplate messaging;

    /** Roles the caller may assume on this ride. */
    private static String roleFor(Ride ride, int callerId) {
        if (ride.getCustomerId().equals(callerId)) return "customer";
        if (ride.getRiderId() != null && ride.getRiderId().equals(callerId)) return "rider";
        return null;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> history(int callerId, boolean callerIsAdmin, int rideId) {
        Ride ride = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (!callerIsAdmin && roleFor(ride, callerId) == null) {
            throw ApiException.forbidden("You do not have access to this ride's chat");
        }
        if (ride.getRiderId() == null) {
            // No rider assigned yet — return empty; nothing to converse about.
            return List.of();
        }
        return messages.findByRideIdOrderByCreatedAtAsc(rideId)
                .stream().map(ChatMessageResponse::from).toList();
    }

    @Transactional
    public ChatMessageResponse send(int callerId, int rideId, SendMessageRequest req) {
        Ride ride = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));

        String role = roleFor(ride, callerId);
        if (role == null) {
            throw ApiException.forbidden("You do not have access to this ride's chat");
        }
        if (ride.getRiderId() == null) {
            throw ApiException.conflict("Chat opens once a rider accepts the ride");
        }
        if (!CHAT_WRITABLE.contains(ride.getStatus())) {
            throw ApiException.conflict("Chat is closed for this ride");
        }

        String body = req.body().trim();
        if (body.isEmpty()) {
            throw ApiException.badRequest("Message cannot be empty");
        }

        ChatMessage msg = new ChatMessage();
        msg.setRideId(rideId);
        msg.setSenderId(callerId);
        msg.setSenderRole(role);
        msg.setBody(body);
        ChatMessage saved = messages.save(msg);

        ChatMessageResponse payload = ChatMessageResponse.from(saved);
        try {
            messaging.convertAndSend("/topic/rides/" + rideId + "/chat", payload);
        } catch (Exception ignore) {
            // Broadcast failure must not roll back the persisted message.
        }
        return payload;
    }
}