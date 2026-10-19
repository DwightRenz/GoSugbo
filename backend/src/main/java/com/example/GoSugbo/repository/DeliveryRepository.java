package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Delivery;
import com.example.GoSugbo.entity.DeliveryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Integer> {

    Optional<Delivery> findByOrderId(Integer orderId);

    Page<Delivery> findByRiderIdOrderByCreatedAtDesc(Integer riderId, Pageable pageable);

    boolean existsByRiderIdAndStatusIn(Integer riderId, Collection<DeliveryStatus> statuses);

    Optional<Delivery> findFirstByRiderIdAndStatusInOrderByCreatedAtDesc(
            Integer riderId, Collection<DeliveryStatus> statuses);
}