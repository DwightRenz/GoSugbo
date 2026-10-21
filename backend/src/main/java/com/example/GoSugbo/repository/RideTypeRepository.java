package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.RideType;
import com.example.GoSugbo.entity.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RideTypeRepository extends JpaRepository<RideType, Integer> {

    Optional<RideType> findByNameIgnoreCase(String name);

    List<RideType> findByActiveTrueOrderByBaseFareAsc();

    Optional<RideType> findFirstByVehicleTypeAndActiveTrue(VehicleType vehicleType);
}