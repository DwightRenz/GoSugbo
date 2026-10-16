package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Store;
import com.example.GoSugbo.entity.StoreStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreRepository extends JpaRepository<Store, Integer> {
    Page<Store> findByStatus(StoreStatus status, Pageable pageable);
    Page<Store> findByOwnerId(Integer ownerId, Pageable pageable);
    List<Store> findByOwnerId(Integer ownerId);
    boolean existsByOwnerIdAndNameIgnoreCase(Integer ownerId, String name);
}