package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Ride;
import com.example.GoSugbo.entity.RideStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RideRepository extends JpaRepository<Ride, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Ride r where r.rideId = :id")
    Optional<Ride> findByIdForUpdate(@Param("id") Integer id);

    Page<Ride> findByCustomerIdOrderByRequestedAtDesc(Integer customerId, Pageable pageable);

    Page<Ride> findByRiderIdOrderByRequestedAtDesc(Integer riderId, Pageable pageable);

    boolean existsByRiderIdAndStatusIn(Integer riderId, Collection<RideStatus> statuses);

    boolean existsByCustomerIdAndStatusIn(Integer customerId, Collection<RideStatus> statuses);

    Optional<Ride> findFirstByRiderIdAndStatusInOrderByRequestedAtDesc(
            Integer riderId, Collection<RideStatus> statuses);

    Optional<Ride> findFirstByCustomerIdAndStatusInOrderByRequestedAtDesc(
            Integer customerId, Collection<RideStatus> statuses);

    /** Open requests a rider can see on the job board. */
    @Query("select r from Ride r where r.status = com.example.GoSugbo.entity.RideStatus.REQUESTED " +
            "and r.riderId is null order by r.requestedAt asc")
    Page<Ride> findOpenRequests(Pageable pageable);

    /** Simple bounding-box candidate search for nearby available riders. */
    @Query(value =
            "select rp.* from rider_profiles rp " +
                    "where rp.is_available = 1 " +
                    "  and rp.current_lat is not null and rp.current_lng is not null " +
                    "  and rp.vehicle_type = :vehicleType " +
                    "  and rp.current_lat between :minLat and :maxLat " +
                    "  and rp.current_lng between :minLng and :maxLng " +
                    "  and not exists (select 1 from rides rd " +
                    "                  where rd.rider_id = rp.rider_id " +
                    "                    and rd.status in ('accepted','arrived_pickup','in_progress')) " +
                    "limit 50",
            nativeQuery = true)
    List<Object[]> findNearbyAvailableRiders(
            @Param("vehicleType") String vehicleType,
            @Param("minLat") double minLat, @Param("maxLat") double maxLat,
            @Param("minLng") double minLng, @Param("maxLng") double maxLng);
}