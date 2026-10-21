package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    Optional<Payment> findByOrderId(Integer orderId);

    Optional<Payment> findByRideId(Integer rideId);
}