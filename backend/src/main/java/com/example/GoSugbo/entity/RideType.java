package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ride_types")
@Getter
@Setter
@NoArgsConstructor
public class RideType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ride_type_id")
    private Integer rideTypeId;

    @Column(nullable = false, unique = true, length = 30)
    private String name;

    @Convert(converter = VehicleType.DbConverter.class)
    @Column(name = "vehicle_type", nullable = false)
    private VehicleType vehicleType;

    @Column(name = "base_fare", nullable = false, precision = 8, scale = 2)
    private BigDecimal baseFare = BigDecimal.ZERO;

    @Column(name = "per_km_rate", nullable = false, precision = 8, scale = 2)
    private BigDecimal perKmRate = BigDecimal.ZERO;

    @Column(name = "per_min_rate", nullable = false, precision = 8, scale = 2)
    private BigDecimal perMinRate = BigDecimal.ZERO;

    @Column(name = "min_fare", nullable = false, precision = 8, scale = 2)
    private BigDecimal minFare = BigDecimal.ZERO;

    @Column(name = "surge_multiplier", nullable = false, precision = 3, scale = 2)
    private BigDecimal surgeMultiplier = BigDecimal.ONE;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}