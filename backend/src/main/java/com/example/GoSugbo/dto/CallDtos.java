package com.example.GoSugbo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.Map;

public final class CallDtos {

    private CallDtos() {}

    /** Client → server: initiate a call. The server picks the callee as the other party on the ride. */
    public record StartCallRequest() {}

    /** Broadcast to both parties when a call starts / gets answered / ends. */
    public record CallSignal(
            String type,           // "offer" | "answer" | "ice" | "hangup" | "reject" | "busy" | "timeout" | "ringing"
            Integer callId,
            Integer rideId,
            Integer fromUserId,
            Integer toUserId,
            String fromRole,       // "customer" | "rider"
            String sdpType,        // "offer" | "answer" (for SDP messages)
            String sdp,            // raw SDP text
            Map<String, Object> candidate,  // ICE candidate payload
            String reason,         // for hangup/reject (optional)
            LocalDateTime timestamp
    ) {}

    /** Server → client after POST /api/rides/{rideId}/call/start. */
    public record CallSession(
            Integer callId,
            Integer rideId,
            Integer callerId,
            Integer calleeId,
            String callerRole,     // "customer" | "rider"
            String calleeRole,     // "customer" | "rider"
            String status,         // "ringing" | "active" | "ended" | "rejected" | "missed"
            LocalDateTime startedAt,
            LocalDateTime answeredAt,
            LocalDateTime endedAt,
            String endReason
    ) {}

    /** Relay payload: SDP / ICE / hangup from a client. */
    public record RelayRequest(
            @NotBlank String type,      // "offer" | "answer" | "ice" | "hangup" | "reject"
            @NotNull Integer callId,
            String sdpType,
            String sdp,
            Map<String, Object> candidate,
            String reason
    ) {}
}