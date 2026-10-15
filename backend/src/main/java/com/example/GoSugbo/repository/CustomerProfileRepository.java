package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Integer> {
}