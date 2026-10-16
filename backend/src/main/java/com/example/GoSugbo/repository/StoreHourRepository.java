package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.StoreHour;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreHourRepository extends JpaRepository<StoreHour, Integer> {
    List<StoreHour> findByStoreIdOrderByDayOfWeekAsc(Integer storeId);
    void deleteByStoreId(Integer storeId);
}