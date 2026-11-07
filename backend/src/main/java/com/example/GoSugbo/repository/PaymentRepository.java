package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Payment;
import com.example.GoSugbo.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    Optional<Payment> findByOrderId(Integer orderId);

    Optional<Payment> findByRideId(Integer rideId);

    Optional<Payment> findByReferenceNo(String referenceNo);

    Optional<Payment> findByRideIdAndStatusNot(Integer rideId, PaymentStatus status);
}