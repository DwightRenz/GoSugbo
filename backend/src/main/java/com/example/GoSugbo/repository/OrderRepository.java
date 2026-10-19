package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Order;
import com.example.GoSugbo.entity.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    Optional<Order> findByOrderCode(String orderCode);

    boolean existsByOrderCode(String orderCode);

    Page<Order> findByCustomerIdOrderByPlacedAtDesc(Integer customerId, Pageable pageable);

    Page<Order> findByStoreIdOrderByPlacedAtDesc(Integer storeId, Pageable pageable);

    Page<Order> findByStoreIdAndStatusOrderByPlacedAtDesc(
            Integer storeId, OrderStatus status, Pageable pageable);

    Page<Order> findByRiderIdOrderByPlacedAtDesc(Integer riderId, Pageable pageable);

    Page<Order> findByStatusAndRiderIdIsNullOrderByPlacedAtAsc(OrderStatus status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.orderId = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Integer id);

    long countByCustomerId(Integer customerId);

    long countByStoreId(Integer storeId);
}