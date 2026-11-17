package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.CallDtos.CallSession;
import com.example.GoSugbo.dto.CallDtos.CallSignal;
import com.example.GoSugbo.dto.CallDtos.RelayRequest;
import com.example.GoSugbo.entity.Ride;
import com.example.GoSugbo.entity.RideStatus;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory signaling orchestrator for in-ride voice calls.
 * Media is WebRTC P2P on the clients; this service only relays SDP/ICE and
 * tracks call state so we can time out unanswered calls and reject overlaps.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CallService {

    /** Calls are only permitted while the ride is active — same as chat. */
    private static final Set<RideStatus> CALL_WRITABLE = EnumSet.of(
            RideStatus.ACCEPTED,
            RideStatus.ARRIVED_PICKUP,
            RideStatus.IN_PROGRESS);

    private static final long RING_TIMEOUT_SECONDS = 45;

    private final RideRepository rides;
    private final SimpMessagingTemplate messaging;

    /** callId → session */
    private final Map<Integer, CallSession> sessions = new ConcurrentHashMap<>();
    /** rideId → callId (only one live call per ride at a time) */
    private final Map<Integer, Integer> activeCallByRide = new ConcurrentHashMap<>();
    private final AtomicInteger callIdSeq = new AtomicInteger(1000);

    // ------------------------------------------------------------ start

    public CallSession start(int callerId, int rideId) {
        Ride ride = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));

        String callerRole = roleFor(ride, callerId);
        if (callerRole == null) {
            throw ApiException.forbidden("You do not have access to this ride");
        }
        if (ride.getRiderId() == null) {
            throw ApiException.conflict("Calling opens once a rider accepts the ride");
        }
        if (!CALL_WRITABLE.contains(ride.getStatus())) {
            throw ApiException.conflict("Calling is closed for this ride");
        }

        Integer existing = activeCallByRide.get(rideId);
        if (existing != null) {
            CallSession s = sessions.get(existing);
            if (s != null && "ringing".equals(s.status())) {
                throw ApiException.conflict("A call is already ringing for this ride");
            }
            if (s != null && "active".equals(s.status())) {
                throw ApiException.conflict("A call is already in progress for this ride");
            }
        }

        int calleeId = "customer".equals(callerRole) ? ride.getRiderId() : ride.getCustomerId();
        String calleeRole = "customer".equals(callerRole) ? "rider" : "customer";

        int callId = callIdSeq.incrementAndGet();
        CallSession session = new CallSession(
                callId, rideId, callerId, calleeId,
                callerRole, calleeRole,
                "ringing", LocalDateTime.now(), null, null, null);

        sessions.put(callId, session);
        activeCallByRide.put(rideId, callId);

        // Notify both sides (caller sees "ringing" toast; callee sees incoming-call UI).
        broadcast(rideId, new CallSignal(
                "ringing", callId, rideId, callerId, calleeId,
                callerRole, null, null, null, null, LocalDateTime.now()));

        return session;
    }

    // ------------------------------------------------------------ relay

    public CallSignal relay(int callerId, int rideId, RelayRequest req) {
        CallSession s = sessions.get(req.callId());
        if (s == null) {
            throw ApiException.notFound("Call session not found (it may have ended)");
        }
        if (!s.rideId().equals(rideId)) {
            throw ApiException.forbidden("Call does not belong to this ride");
        }
        if (!s.callerId().equals(callerId) && !s.calleeId().equals(callerId)) {
            throw ApiException.forbidden("You are not a participant in this call");
        }

        String fromRole = s.callerId().equals(callerId) ? s.callerRole() : s.calleeRole();
        int toUserId = s.callerId().equals(callerId) ? s.calleeId() : s.callerId();

        String type = req.type();
        CallSession updated = s;
        switch (type) {
            case "answer" -> updated = new CallSession(
                    s.callId(), s.rideId(), s.callerId(), s.calleeId(),
                    s.callerRole(), s.calleeRole(),
                    "active", s.startedAt(), LocalDateTime.now(), null, null);
            case "hangup" -> updated = new CallSession(
                    s.callId(), s.rideId(), s.callerId(), s.calleeId(),
                    s.callerRole(), s.calleeRole(),
                    "ended", s.startedAt(), s.answeredAt(),
                    LocalDateTime.now(), req.reason() == null ? "hangup" : req.reason());
            case "reject" -> updated = new CallSession(
                    s.callId(), s.rideId(), s.callerId(), s.calleeId(),
                    s.callerRole(), s.calleeRole(),
                    "rejected", s.startedAt(), s.answeredAt(),
                    LocalDateTime.now(), req.reason() == null ? "rejected" : req.reason());
            case "offer", "ice" -> { /* still ringing/active, no state change */ }
            default -> throw ApiException.badRequest("Unknown call signal type: " + type);
        }

        sessions.put(s.callId(), updated);
        if ("ended".equals(updated.status()) || "rejected".equals(updated.status())) {
            activeCallByRide.remove(rideId, s.callId());
        }

        CallSignal out = new CallSignal(
                type, s.callId(), rideId,
                callerId, toUserId, fromRole,
                req.sdpType(), req.sdp(), req.candidate(), req.reason(),
                LocalDateTime.now());

        broadcast(rideId, out);
        return out;
    }

    // ------------------------------------------------------------ timeout sweep

    /**
     * Every 5s, expire calls that have been ringing longer than RING_TIMEOUT_SECONDS.
     * Matches your existing @Scheduled cleanup-job pattern (OtpCleanupJob, TokenCleanupJob).
     */
    @Scheduled(fixedDelay = 5000)
    public void expireRingingCalls() {
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(RING_TIMEOUT_SECONDS);
        sessions.forEach((callId, s) -> {
            if ("ringing".equals(s.status()) && s.startedAt().isBefore(cutoff)) {
                CallSession ended = new CallSession(
                        s.callId(), s.rideId(), s.callerId(), s.calleeId(),
                        s.callerRole(), s.calleeRole(),
                        "missed", s.startedAt(), null,
                        LocalDateTime.now(), "timeout");
                sessions.put(callId, ended);
                activeCallByRide.remove(s.rideId(), callId);

                broadcast(s.rideId(), new CallSignal(
                        "timeout", callId, s.rideId(), s.callerId(), s.calleeId(),
                        s.callerRole(), null, null, null, "timeout", LocalDateTime.now()));
            }
        });
        // Prune fully-ended sessions older than 5 minutes to keep memory bounded.
        sessions.entrySet().removeIf(e -> {
            CallSession s = e.getValue();
            return s.endedAt() != null && s.endedAt().isBefore(LocalDateTime.now().minusMinutes(5));
        });
    }

    // ------------------------------------------------------------ helpers

    private void broadcast(int rideId, CallSignal signal) {
        try {
            messaging.convertAndSend("/topic/rides/" + rideId + "/call", signal);
        } catch (Exception ex) {
            log.warn("WS call-signal broadcast for ride {} failed: {}", rideId, ex.getMessage());
        }
    }

    private static String roleFor(Ride ride, int callerId) {
        if (ride.getCustomerId().equals(callerId)) return "customer";
        if (ride.getRiderId() != null && ride.getRiderId().equals(callerId)) return "rider";
        return null;
    }
}