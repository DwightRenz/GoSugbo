package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_profiles")
@Getter
@Setter
@NoArgsConstructor
public class AdminProfile {

    @Id
    @Column(name = "admin_id")
    private Integer adminId;

    @Column(name = "permissions", columnDefinition = "TEXT")
    private String permissions;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;
}