package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Payment;
import com.example.GoSugbo.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    Optional<Payment> findByOrderId(Integer orderId);

    boolean existsByOrderId(Integer orderId);

    List<Payment> findByStatus(PaymentStatus status);
}