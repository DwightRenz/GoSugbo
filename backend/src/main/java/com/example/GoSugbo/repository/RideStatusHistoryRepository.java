package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.RideStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RideStatusHistoryRepository extends JpaRepository<RideStatusHistory, Integer> {

    List<RideStatusHistory> findByRideIdOrderByCreatedAtAsc(Integer rideId);
}