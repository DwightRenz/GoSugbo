package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "deliveries")
@Getter
@Setter
@NoArgsConstructor
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "delivery_id")
    private Integer deliveryId;

    @Column(name = "order_id", nullable = false, unique = true)
    private Integer orderId;

    @Column(name = "rider_id", nullable = false)
    private Integer riderId;

    @Convert(converter = DeliveryStatus.DbConverter.class)
    @Column(nullable = false)
    private DeliveryStatus status = DeliveryStatus.ASSIGNED;

    @Column(name = "pickup_at")
    private LocalDateTime pickupAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "distance_km", precision = 6, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "proof_image")
    private String proofImage;

    @Column(columnDefinition = "text")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}