package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.TrackingDtos.LocationBroadcast;
import com.example.GoSugbo.dto.TrackingDtos.StatusBroadcast;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrackingBroadcaster {

    private final SimpMessagingTemplate messaging;

    public void rideLocation(int rideId, int riderId, BigDecimal lat, BigDecimal lng) {
        send("/topic/rides/" + rideId + "/location",
                new LocationBroadcast(rideId, null, riderId, lat, lng, LocalDateTime.now()));
    }

    public void deliveryLocation(int deliveryId, int riderId, BigDecimal lat, BigDecimal lng) {
        send("/topic/deliveries/" + deliveryId + "/location",
                new LocationBroadcast(null, deliveryId, riderId, lat, lng, LocalDateTime.now()));
    }

    public void rideStatus(int rideId, String status, String notes) {
        send("/topic/rides/" + rideId + "/status",
                new StatusBroadcast(rideId, null, status, notes, LocalDateTime.now()));
    }

    public void deliveryStatus(int deliveryId, String status, String notes) {
        send("/topic/deliveries/" + deliveryId + "/status",
                new StatusBroadcast(null, deliveryId, status, notes, LocalDateTime.now()));
    }

    /** Fires when a payment is confirmed by webhook or poll. */
    public void paymentPaid(Integer rideId, Integer orderId, String status) {
        String channel = rideId != null
                ? "/topic/rides/" + rideId + "/payment"
                : "/topic/orders/" + orderId + "/payment";

        Map<String, Object> payload = new HashMap<>();   // ← HashMap allows nulls
        payload.put("rideId", rideId);
        payload.put("orderId", orderId);
        payload.put("status", status);
        payload.put("timestamp", LocalDateTime.now().toString());

        send(channel, payload);
    }

    private void send(String destination, Object payload) {
        try {
            messaging.convertAndSend(destination, payload);
        } catch (Exception ex) {
            log.warn("WS broadcast to {} failed: {}", destination, ex.getMessage());
        }
    }
}