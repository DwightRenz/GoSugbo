package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Integer> {

    List<Address> findByUserIdOrderByDefaultAddressDescCreatedAtDesc(Integer userId);

    Optional<Address> findByAddressIdAndUserId(Integer addressId, Integer userId);

    @Modifying
    @Query("UPDATE Address a SET a.defaultAddress = false WHERE a.userId = :userId")
    void clearDefaultForUser(@Param("userId") Integer userId);
}