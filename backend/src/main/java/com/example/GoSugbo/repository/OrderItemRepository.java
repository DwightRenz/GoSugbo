package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    List<OrderItem> findByOrderIdOrderByItemIdAsc(Integer orderId);

    void deleteByOrderId(Integer orderId);

    long countByOrderId(Integer orderId);
}