package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ride_status_history")
@Getter
@Setter
@NoArgsConstructor
public class RideStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Integer historyId;

    @Column(name = "ride_id", nullable = false)
    private Integer rideId;

    @Convert(converter = RideStatus.DbConverter.class)
    @Column(nullable = false)
    private RideStatus status;

    @Column(name = "changed_by")
    private Integer changedBy;

    @Column(length = 255)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}