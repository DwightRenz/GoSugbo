package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Integer paymentId;

    @Column(name = "order_id", unique = true)
    private Integer orderId;

    @Column(name = "ride_id", unique = true)
    private Integer rideId;

    @Convert(converter = PaymentMethod.DbConverter.class)
    @Column(nullable = false)
    private PaymentMethod method = PaymentMethod.COD;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Convert(converter = PaymentStatus.DbConverter.class)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "reference_no", length = 100)
    private String referenceNo;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // NEW: store the PayMongo checkout session id for webhook lookups
    @Column(name = "paymongo_checkout_id", length = 100)
    private String paymongoCheckoutId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}