package com.example.GoSugbo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "customer_profiles")
@Getter
@Setter
@NoArgsConstructor
public class CustomerProfile {

    @Id
    @Column(name = "customer_id")
    private Integer customerId;

    @Column(name = "default_address_id")
    private Integer defaultAddressId;

    @Column(name = "loyalty_points", nullable = false)
    private int loyaltyPoints = 0;
}