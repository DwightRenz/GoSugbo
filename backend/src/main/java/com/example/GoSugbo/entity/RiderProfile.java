package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "rider_profiles")
@Getter
@Setter
@NoArgsConstructor
public class RiderProfile {

    @Id
    @Column(name = "rider_id")
    private Integer riderId;

    @Convert(converter = VehicleType.DbConverter.class)
    @Column(name = "vehicle_type", nullable = false)
    private VehicleType vehicleType = VehicleType.MOTORCYCLE;

    @Column(name = "plate_number", length = 20)
    private String plateNumber;

    @Column(name = "license_no", length = 50)
    private String licenseNo;

    @Column(name = "is_available", nullable = false)
    private boolean available = false;

    @Column(name = "current_lat", precision = 10, scale = 7)
    private BigDecimal currentLat;

    @Column(name = "current_lng", precision = 10, scale = 7)
    private BigDecimal currentLng;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "total_deliveries", nullable = false)
    private int totalDeliveries = 0;
}