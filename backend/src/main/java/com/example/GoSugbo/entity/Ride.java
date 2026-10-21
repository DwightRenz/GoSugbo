package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides")
@Getter
@Setter
@NoArgsConstructor
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ride_id")
    private Integer rideId;

    @Column(name = "customer_id", nullable = false)
    private Integer customerId;

    @Column(name = "rider_id")
    private Integer riderId;

    @Column(name = "ride_type_id", nullable = false)
    private Integer rideTypeId;

    @Column(name = "pickup_address_id", nullable = false)
    private Integer pickupAddressId;

    @Column(name = "dropoff_address_id", nullable = false)
    private Integer dropoffAddressId;

    @Column(name = "pickup_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal pickupLat;

    @Column(name = "pickup_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal pickupLng;

    @Column(name = "dropoff_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal dropoffLat;

    @Column(name = "dropoff_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal dropoffLng;

    @Convert(converter = RideStatus.DbConverter.class)
    @Column(nullable = false)
    private RideStatus status = RideStatus.REQUESTED;

    @Column(name = "estimated_distance_km", precision = 6, scale = 2)
    private BigDecimal estimatedDistanceKm;

    @Column(name = "estimated_duration_min")
    private Integer estimatedDurationMin;

    @Column(name = "actual_distance_km", precision = 6, scale = 2)
    private BigDecimal actualDistanceKm;

    @Column(name = "fare_amount", precision = 8, scale = 2)
    private BigDecimal fareAmount;

    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "pickup_at")
    private LocalDateTime pickupAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @Column(columnDefinition = "text")
    private String notes;
}