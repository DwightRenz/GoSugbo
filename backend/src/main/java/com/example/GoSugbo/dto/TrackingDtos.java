package com.example.GoSugbo.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class TrackingDtos {

    private TrackingDtos() {}

    /** Broadcast whenever a rider moves (ride or delivery context). */
    public record LocationBroadcast(
            Integer rideId,          // null when this is a delivery
            Integer deliveryId,      // null when this is a ride
            Integer riderId,
            BigDecimal lat,
            BigDecimal lng,
            LocalDateTime timestamp
    ) {}

    /** Broadcast whenever a ride/delivery status flips. */
    public record StatusBroadcast(
            Integer rideId,          // null when this is a delivery
            Integer deliveryId,      // null when this is a ride
            String status,
            String notes,
            LocalDateTime timestamp
    ) {}
}