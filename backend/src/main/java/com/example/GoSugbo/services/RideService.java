package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.RideDtos.*;
import com.example.GoSugbo.entity.*;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RideService {

    private static final Set<RideStatus> ACTIVE = EnumSet.of(
            RideStatus.ACCEPTED, RideStatus.ARRIVED_PICKUP, RideStatus.IN_PROGRESS);

    private static final Map<RideStatus, Set<RideStatus>> TRANSITIONS = Map.of(
            RideStatus.REQUESTED,      Set.of(RideStatus.ACCEPTED, RideStatus.CANCELLED),
            RideStatus.ACCEPTED,       Set.of(RideStatus.ARRIVED_PICKUP, RideStatus.CANCELLED),
            RideStatus.ARRIVED_PICKUP, Set.of(RideStatus.IN_PROGRESS, RideStatus.CANCELLED, RideStatus.NO_SHOW),
            RideStatus.IN_PROGRESS,    Set.of(RideStatus.COMPLETED, RideStatus.CANCELLED),
            RideStatus.COMPLETED,      Set.of(),
            RideStatus.CANCELLED,      Set.of(),
            RideStatus.NO_SHOW,        Set.of()
    );

    private static final double AVG_SPEED_KMH = 25.0;

    private final RideRepository rides;
    private final RideTypeRepository rideTypes;
    private final RideStatusHistoryRepository history;
    private final AddressRepository addresses;
    private final UserRepository users;
    private final RiderProfileRepository riders;
    private final PaymentRepository payments;

    // ------------------------------------------------------------- pricing

    @Transactional(readOnly = true)
    public List<RideTypeResponse> listRideTypes() {
        return rideTypes.findByActiveTrueOrderByBaseFareAsc()
                .stream().map(RideTypeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public FareEstimateResponse estimate(FareEstimateRequest req) {
        RideType type = rideTypes.findById(req.rideTypeId())
                .orElseThrow(() -> ApiException.notFound("Ride type not found"));
        if (!type.isActive()) throw ApiException.conflict("Ride type is not available");

        double km = haversineKm(
                req.pickupLat().doubleValue(), req.pickupLng().doubleValue(),
                req.dropoffLat().doubleValue(), req.dropoffLng().doubleValue());

        int minutes = (int) Math.max(1, Math.ceil(km / AVG_SPEED_KMH * 60.0));
        BigDecimal fare = computeFare(type, BigDecimal.valueOf(km), minutes);

        return new FareEstimateResponse(
                type.getRideTypeId(), type.getName(),
                round2(BigDecimal.valueOf(km)), minutes, fare);
    }

    // -------------------------------------------------------------- booking

    @Transactional
    public RideResponse book(int customerId, CreateRideRequest req) {
        if (rides.existsByCustomerIdAndStatusIn(customerId, EnumSet.of(
                RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.ARRIVED_PICKUP, RideStatus.IN_PROGRESS))) {
            throw ApiException.conflict("You already have an active ride");
        }
        RideType type = rideTypes.findById(req.rideTypeId())
                .orElseThrow(() -> ApiException.notFound("Ride type not found"));
        if (!type.isActive()) throw ApiException.conflict("Ride type is not available");

        Address pickup = addresses.findById(req.pickupAddressId())
                .orElseThrow(() -> ApiException.badRequest("Pickup address not found"));
        Address dropoff = addresses.findById(req.dropoffAddressId())
                .orElseThrow(() -> ApiException.badRequest("Dropoff address not found"));

        if (!pickup.getUserId().equals(customerId) || !dropoff.getUserId().equals(customerId)) {
            throw ApiException.forbidden("You can only use your own addresses");
        }
        if (pickup.getLatitude() == null || pickup.getLongitude() == null
                || dropoff.getLatitude() == null || dropoff.getLongitude() == null) {
            throw ApiException.badRequest("Pickup and dropoff addresses need coordinates");
        }
        if (pickup.getAddressId().equals(dropoff.getAddressId())) {
            throw ApiException.badRequest("Pickup and dropoff must be different");
        }

        double km = haversineKm(
                pickup.getLatitude().doubleValue(), pickup.getLongitude().doubleValue(),
                dropoff.getLatitude().doubleValue(), dropoff.getLongitude().doubleValue());
        int minutes = (int) Math.max(1, Math.ceil(km / AVG_SPEED_KMH * 60.0));

        Ride ride = new Ride();
        ride.setCustomerId(customerId);
        ride.setRideTypeId(type.getRideTypeId());
        ride.setPickupAddressId(pickup.getAddressId());
        ride.setDropoffAddressId(dropoff.getAddressId());
        ride.setPickupLat(pickup.getLatitude());
        ride.setPickupLng(pickup.getLongitude());
        ride.setDropoffLat(dropoff.getLatitude());
        ride.setDropoffLng(dropoff.getLongitude());
        ride.setStatus(RideStatus.REQUESTED);
        ride.setEstimatedDistanceKm(round2(BigDecimal.valueOf(km)));
        ride.setEstimatedDurationMin(minutes);
        ride.setFareAmount(computeFare(type, BigDecimal.valueOf(km), minutes));
        ride.setNotes(blankToNull(req.notes()));

        Ride saved = rides.save(ride);
        log(saved.getRideId(), RideStatus.REQUESTED, customerId, "Ride requested");
        return build(saved);
    }

    // ------------------------------------------------------ rider job board

    @Transactional(readOnly = true)
    public Page<AvailableRideResponse> listAvailable(Pageable pageable) {
        Page<Ride> page = rides.findOpenRequests(pageable);
        List<Ride> list = page.getContent();
        if (list.isEmpty()) return new PageImpl<>(List.of(), pageable, 0);

        Map<Integer, RideType> typeById = rideTypes
                .findAllById(list.stream().map(Ride::getRideTypeId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(RideType::getRideTypeId, Function.identity()));

        Set<Integer> addressIds = new HashSet<>();
        for (Ride r : list) {
            addressIds.add(r.getPickupAddressId());
            addressIds.add(r.getDropoffAddressId());
        }
        Map<Integer, Address> addressById = addresses.findAllById(addressIds)
                .stream().collect(Collectors.toMap(Address::getAddressId, Function.identity()));

        List<AvailableRideResponse> out = list.stream()
                .map(r -> AvailableRideResponse.from(
                        r, typeById.get(r.getRideTypeId()),
                        addressById.get(r.getPickupAddressId()),
                        addressById.get(r.getDropoffAddressId())))
                .toList();
        return new PageImpl<>(out, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<NearbyRiderResponse> nearbyRiders(BigDecimal lat, BigDecimal lng,
                                                  String vehicleType, double radiusKm) {
        double dLat = radiusKm / 111.0;
        double dLng = radiusKm / (111.0 * Math.cos(Math.toRadians(lat.doubleValue())));
        List<Object[]> rows = rides.findNearbyAvailableRiders(
                vehicleType, lat.doubleValue() - dLat, lat.doubleValue() + dLat,
                lng.doubleValue() - dLng, lng.doubleValue() + dLng);

        List<Integer> riderIds = rows.stream()
                .map(r -> ((Number) r[0]).intValue()).toList();
        Map<Integer, User> userById = users.findAllById(riderIds)
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        List<NearbyRiderResponse> out = new ArrayList<>();
        for (Object[] row : rows) {
            int riderId = ((Number) row[0]).intValue();
            User u = userById.get(riderId);
            if (u == null) continue;
            BigDecimal rLat = (BigDecimal) row[5];
            BigDecimal rLng = (BigDecimal) row[6];
            double dist = haversineKm(lat.doubleValue(), lng.doubleValue(),
                    rLat.doubleValue(), rLng.doubleValue());
            out.add(new NearbyRiderResponse(
                    riderId, u.getFullName(),
                    row[1] == null ? null : row[1].toString(),
                    row[2] == null ? null : row[2].toString(),
                    row[7] == null ? BigDecimal.ZERO : new BigDecimal(row[7].toString()),
                    rLat, rLng, round2(BigDecimal.valueOf(dist)).doubleValue()));
        }
        out.sort(Comparator.comparingDouble(NearbyRiderResponse::distanceKm));
        return out;
    }

    // -------------------------------------------------- rider: accept a ride

    @Transactional
    public RideResponse accept(int riderId, int rideId) {
        RiderProfile profile = riders.findById(riderId)
                .orElseThrow(() -> ApiException.notFound("Rider profile not found"));
        if (!profile.isAvailable()) throw ApiException.conflict("Go online before accepting rides");
        if (rides.existsByRiderIdAndStatusIn(riderId, ACTIVE)) {
            throw ApiException.conflict("You already have an active ride");
        }

        Ride ride = rides.findByIdForUpdate(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (ride.getStatus() != RideStatus.REQUESTED || ride.getRiderId() != null) {
            throw ApiException.conflict("Ride is no longer available");
        }

        ride.setRiderId(riderId);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setAcceptedAt(LocalDateTime.now());
        Ride saved = rides.save(ride);
        log(saved.getRideId(), RideStatus.ACCEPTED, riderId, "Rider accepted ride");
        return build(saved);
    }

    // ------------------------------------------------- status transitions

    @Transactional
    public RideResponse updateStatus(int callerId, boolean callerIsAdmin, int rideId,
                                     UpdateRideStatusRequest req) {
        Ride ride = rides.findByIdForUpdate(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));

        RideStatus next;
        try { next = RideStatus.fromValue(req.status()); }
        catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown ride status: " + req.status());
        }

        boolean isAssignedRider = ride.getRiderId() != null && ride.getRiderId().equals(callerId);
        boolean isCustomer = ride.getCustomerId().equals(callerId);

        if (next == RideStatus.CANCELLED) {
            if (!(isAssignedRider || isCustomer || callerIsAdmin)) {
                throw ApiException.forbidden("You cannot cancel this ride");
            }
            if (ride.getStatus() == RideStatus.IN_PROGRESS) {
                throw ApiException.conflict("Cannot cancel an in-progress ride");
            }
        } else if (next == RideStatus.NO_SHOW) {
            if (!isAssignedRider) throw ApiException.forbidden("Only the assigned rider can mark no-show");
        } else {
            if (!isAssignedRider) throw ApiException.forbidden("Only the assigned rider can update this ride");
        }

        if (next == ride.getStatus()) return build(ride);

        Set<RideStatus> allowed = TRANSITIONS.getOrDefault(ride.getStatus(), Set.of());
        if (!allowed.contains(next)) {
            throw ApiException.conflict("Cannot change ride status from "
                    + ride.getStatus().getValue() + " to " + next.getValue());
        }

        switch (next) {
            case ARRIVED_PICKUP -> { /* no field */ }
            case IN_PROGRESS -> ride.setPickupAt(LocalDateTime.now());
            case COMPLETED -> {
                ride.setCompletedAt(LocalDateTime.now());
                if (req.actualDistanceKm() != null) {
                    ride.setActualDistanceKm(req.actualDistanceKm());
                } else if (ride.getEstimatedDistanceKm() != null) {
                    ride.setActualDistanceKm(ride.getEstimatedDistanceKm());
                }
                RideType type = rideTypes.findById(ride.getRideTypeId()).orElse(null);
                if (type != null && ride.getActualDistanceKm() != null) {
                    int minutes = ride.getEstimatedDurationMin() == null ? 1 : ride.getEstimatedDurationMin();
                    ride.setFareAmount(computeFare(type, ride.getActualDistanceKm(), minutes));
                }
                riders.findById(ride.getRiderId()).ifPresent(p -> {
                    p.setTotalDeliveries(p.getTotalDeliveries() + 1);
                    riders.save(p);
                });
                markRideCodPaid(ride);
            }
            case CANCELLED -> {
                ride.setCancelledAt(LocalDateTime.now());
                ride.setCancellationReason(blankToNull(req.notes()));
            }
            case NO_SHOW -> ride.setCancelledAt(LocalDateTime.now());
            default -> {}
        }

        ride.setStatus(next);
        if (req.notes() != null && !req.notes().isBlank() && next != RideStatus.CANCELLED) {
            ride.setNotes(req.notes().trim());
        }
        Ride saved = rides.save(ride);
        log(saved.getRideId(), next, callerId, req.notes());
        return build(saved);
    }

    // --------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public Page<RideResponse> listMineAsCustomer(int customerId, Pageable pageable) {
        Page<Ride> page = rides.findByCustomerIdOrderByRequestedAtDesc(customerId, pageable);
        return new PageImpl<>(buildAll(page.getContent()), pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<RideResponse> listMineAsRider(int riderId, Pageable pageable) {
        Page<Ride> page = rides.findByRiderIdOrderByRequestedAtDesc(riderId, pageable);
        return new PageImpl<>(buildAll(page.getContent()), pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public RideResponse getActiveAsCustomer(int customerId) {
        Ride r = rides.findFirstByCustomerIdAndStatusInOrderByRequestedAtDesc(
                        customerId, EnumSet.of(RideStatus.REQUESTED, RideStatus.ACCEPTED,
                                RideStatus.ARRIVED_PICKUP, RideStatus.IN_PROGRESS))
                .orElseThrow(() -> ApiException.notFound("You have no active ride"));
        return build(r);
    }

    @Transactional(readOnly = true)
    public RideResponse getActiveAsRider(int riderId) {
        Ride r = rides.findFirstByRiderIdAndStatusInOrderByRequestedAtDesc(riderId, ACTIVE)
                .orElseThrow(() -> ApiException.notFound("You have no active ride"));
        return build(r);
    }

    @Transactional(readOnly = true)
    public RideResponse get(int callerId, boolean callerIsAdmin, int rideId) {
        Ride r = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));
        boolean allowed = callerIsAdmin
                || r.getCustomerId().equals(callerId)
                || (r.getRiderId() != null && r.getRiderId().equals(callerId));
        if (!allowed) throw ApiException.forbidden("You do not have access to this ride");
        return build(r);
    }

    @Transactional(readOnly = true)
    public List<RideStatusHistoryResponse> history(int callerId, boolean callerIsAdmin, int rideId) {
        Ride r = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));
        boolean allowed = callerIsAdmin
                || r.getCustomerId().equals(callerId)
                || (r.getRiderId() != null && r.getRiderId().equals(callerId));
        if (!allowed) throw ApiException.forbidden("You do not have access to this ride");
        return history.findByRideIdOrderByCreatedAtAsc(rideId)
                .stream().map(RideStatusHistoryResponse::from).toList();
    }

    // --------------------------------------------------------------- helpers

    private RideResponse build(Ride r) {
        return buildAll(List.of(r)).get(0);
    }

    private List<RideResponse> buildAll(List<Ride> list) {
        if (list.isEmpty()) return List.of();

        Map<Integer, RideType> typeById = rideTypes
                .findAllById(list.stream().map(Ride::getRideTypeId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(RideType::getRideTypeId, Function.identity()));

        Set<Integer> userIds = new HashSet<>();
        for (Ride r : list) {
            userIds.add(r.getCustomerId());
            if (r.getRiderId() != null) userIds.add(r.getRiderId());
        }
        Map<Integer, User> userById = users.findAllById(userIds)
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Integer, RiderProfile> profileById = riders.findAllById(
                        list.stream().map(Ride::getRiderId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(RiderProfile::getRiderId, Function.identity()));

        Set<Integer> addressIds = new HashSet<>();
        for (Ride r : list) {
            addressIds.add(r.getPickupAddressId());
            addressIds.add(r.getDropoffAddressId());
        }
        Map<Integer, Address> addressById = addresses.findAllById(addressIds)
                .stream().collect(Collectors.toMap(Address::getAddressId, Function.identity()));

        return list.stream().map(r -> RideResponse.from(
                r, typeById.get(r.getRideTypeId()),
                addressById.get(r.getPickupAddressId()),
                addressById.get(r.getDropoffAddressId()),
                userById.get(r.getCustomerId()),
                r.getRiderId() == null ? null : userById.get(r.getRiderId()),
                r.getRiderId() == null ? null : profileById.get(r.getRiderId())
        )).toList();
    }

    private BigDecimal computeFare(RideType t, BigDecimal km, int minutes) {
        BigDecimal fare = t.getBaseFare()
                .add(t.getPerKmRate().multiply(km))
                .add(t.getPerMinRate().multiply(BigDecimal.valueOf(minutes)))
                .multiply(t.getSurgeMultiplier());
        if (fare.compareTo(t.getMinFare()) < 0) fare = t.getMinFare();
        return round2(fare);
    }

    private void log(int rideId, RideStatus status, Integer changedBy, String notes) {
        RideStatusHistory h = new RideStatusHistory();
        h.setRideId(rideId);
        h.setStatus(status);
        h.setChangedBy(changedBy);
        h.setNotes(blankToNull(notes));
        history.save(h);
    }

    private void markRideCodPaid(Ride ride) {
        BigDecimal fare = ride.getFareAmount();
        if (fare == null) return;

        payments.findByRideId(ride.getRideId()).ifPresentOrElse(p -> {
            if (p.getMethod() == PaymentMethod.COD && p.getStatus() == PaymentStatus.PENDING) {
                p.setAmount(fare);
                p.setStatus(PaymentStatus.PAID);
                p.setPaidAt(LocalDateTime.now());
                payments.save(p);
            }
        }, () -> {
            Payment p = new Payment();
            p.setRideId(ride.getRideId());
            p.setMethod(PaymentMethod.COD);
            p.setAmount(fare);
            p.setStatus(PaymentStatus.PAID);
            p.setPaidAt(LocalDateTime.now());
            payments.save(p);
        });
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static BigDecimal round2(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}