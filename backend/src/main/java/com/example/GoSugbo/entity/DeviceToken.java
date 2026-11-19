package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_tokens", indexes = {
        @Index(name = "idx_device_token_user", columnList = "user_id"),
        @Index(name = "idx_device_token_token", columnList = "token", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "device_token_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "token", nullable = false, unique = true, length = 512)
    private String token;

    /** "android" | "ios" | "web" */
    @Column(name = "platform", length = 20)
    private String platform;

    @Column(name = "device_info", length = 255)
    private String deviceInfo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}