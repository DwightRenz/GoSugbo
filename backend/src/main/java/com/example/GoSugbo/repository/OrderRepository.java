package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Order;
import com.example.GoSugbo.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    Optional<Order> findByOrderCode(String orderCode);

    boolean existsByOrderCode(String orderCode);

    Page<Order> findByCustomerIdOrderByPlacedAtDesc(Integer customerId, Pageable pageable);

    Page<Order> findByStoreIdOrderByPlacedAtDesc(Integer storeId, Pageable pageable);

    Page<Order> findByStoreIdAndStatusOrderByPlacedAtDesc(
            Integer storeId, OrderStatus status, Pageable pageable);

    Page<Order> findByRiderIdOrderByPlacedAtDesc(Integer riderId, Pageable pageable);

    long countByCustomerId(Integer customerId);

    long countByStoreId(Integer storeId);
}