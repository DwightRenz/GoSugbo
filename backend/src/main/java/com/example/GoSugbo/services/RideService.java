package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.OrderDtos.CheckoutResponse;
import com.example.GoSugbo.dto.RideDtos.*;
import com.example.GoSugbo.entity.*;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    private final RideRepository rides;
    private final RideTypeRepository rideTypes;
    private final RideStatusHistoryRepository history;
    private final AddressRepository addresses;
    private final UserRepository users;
    private final RiderProfileRepository riders;
    private final PaymentRepository payments;
    private final GoogleMapsService googleMapsService;
    private final TrackingBroadcaster trackingBroadcaster;
    private final PayMongoService payMongoService;

    @Value("${app.payments.success-url-base:mobile://ride/}")
    private String successUrlBase;

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

        GoogleMapsService.RouteResult route = googleMapsService.computeRoute(
                req.pickupLat().doubleValue(), req.pickupLng().doubleValue(),
                req.dropoffLat().doubleValue(), req.dropoffLng().doubleValue());

        BigDecimal fare = computeFare(type, route.distanceKm(), route.durationMinutes());

        return new FareEstimateResponse(
                type.getRideTypeId(), type.getName(),
                route.distanceKm(), route.durationMinutes(), fare);
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

        GoogleMapsService.RouteResult route = googleMapsService.computeRoute(
                pickup.getLatitude().doubleValue(), pickup.getLongitude().doubleValue(),
                dropoff.getLatitude().doubleValue(), dropoff.getLongitude().doubleValue());

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
        ride.setEstimatedDistanceKm(route.distanceKm());
        ride.setEstimatedDurationMin(route.durationMinutes());
        ride.setFareAmount(computeFare(type, route.distanceKm(), route.durationMinutes()));
        ride.setNotes(blankToNull(req.notes()));

        Ride saved = rides.save(ride);

        PaymentMethod chosen = resolvePaymentMethod(req.paymentMethod());
        Payment payment = new Payment();
        payment.setRideId(saved.getRideId());
        payment.setMethod(chosen);
        payment.setAmount(saved.getFareAmount());
        payment.setStatus(PaymentStatus.PENDING);
        if (chosen != PaymentMethod.COD) {
            payment.setReferenceNo("RIDE-" + saved.getRideId());
        }
        payments.save(payment);

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
        trackingBroadcaster.rideStatus(saved.getRideId(),
                saved.getStatus().getValue(), "Rider accepted ride");
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

                payments.findByRideId(ride.getRideId()).ifPresent(p -> {
                    p.setAmount(ride.getFareAmount());
                    payments.save(p);
                });

                markRideCodPaidIfCod(ride);
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
        trackingBroadcaster.rideStatus(saved.getRideId(), next.getValue(), req.notes());
        return build(saved);
    }

    // --------------------------------------------------- rider GPS for ride

    @Transactional
    public void updateRiderLocationForRide(int riderId, int rideId,
                                           BigDecimal lat, BigDecimal lng) {
        Ride ride = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (ride.getRiderId() == null || !ride.getRiderId().equals(riderId)) {
            throw ApiException.forbidden("This ride is not assigned to you");
        }
        if (!ACTIVE.contains(ride.getStatus())) {
            throw ApiException.conflict("Ride is not active");
        }
        riders.findById(riderId).ifPresent(p -> {
            p.setCurrentLat(lat);
            p.setCurrentLng(lng);
            riders.save(p);
        });
        trackingBroadcaster.rideLocation(rideId, riderId, lat, lng);
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

    // ------------------------------------------------- NEW: hosted checkout

    @Transactional
    public CheckoutResponse initiateCheckout(int customerId, int rideId) {
        Ride ride = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (!ride.getCustomerId().equals(customerId)) {
            throw ApiException.forbidden("You do not have access to this ride");
        }
        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw ApiException.conflict("Ride must be completed before paying");
        }
        if (ride.getFareAmount() == null) {
            throw ApiException.conflict("Ride has no fare to pay");
        }

        Payment payment = payments.findByRideId(rideId)
                .orElseThrow(() -> ApiException.conflict("No payment record for this ride"));
        if (payment.getStatus() == PaymentStatus.PAID) {
            throw ApiException.conflict("Ride is already paid");
        }
        if (payment.getMethod() == PaymentMethod.COD) {
            throw ApiException.conflict("This ride was booked as cash. Online payment is not available.");
        }
        if (payment.getReferenceNo() == null) {
            payment.setReferenceNo("RIDE-" + rideId);
            payments.save(payment);
        }

        long amountInCentavos = ride.getFareAmount()
                .multiply(BigDecimal.valueOf(100)).longValue();

        String successUrl = successUrlBase + rideId;
        String cancelUrl  = successUrlBase + rideId + "?cancelled=1";

        PayMongoService.CheckoutResult result = payMongoService.createCheckoutSession(
                payment.getReferenceNo(), amountInCentavos, successUrl, cancelUrl);

        payment.setPaymongoCheckoutId(result.sessionId());
        payments.save(payment);

        return new CheckoutResponse(result.checkoutUrl(), payment.getReferenceNo());
    }

    /**
     * Verifies the checkout session against PayMongo and marks the payment paid if it succeeded.
     * Called by the frontend poll while the "Pay Now" button is visible.
     */
    @Transactional
    public RideResponse verifyCheckout(int customerId, int rideId) {
        Ride ride = rides.findById(rideId)
                .orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (!ride.getCustomerId().equals(customerId)) {
            throw ApiException.forbidden("You do not have access to this ride");
        }

        Payment payment = payments.findByRideId(rideId).orElse(null);
        if (payment == null
                || payment.getStatus() == PaymentStatus.PAID
                || payment.getPaymongoCheckoutId() == null) {
            return build(ride);
        }

        Map<String, Object> session = payMongoService.getCheckoutSession(payment.getPaymongoCheckoutId());
        if (session == null) return build(ride);

        @SuppressWarnings("unchecked")
        Map<String, Object> attrs = (Map<String, Object>) session.get("attributes");
        if (attrs == null) return build(ride);

        // PayMongo nests status at payment_intent.attributes.status (or payments[0].attributes.status).
        String intentStatus = null;
        Object paymentsRaw = attrs.get("payments");
        if (paymentsRaw instanceof List<?> list && !list.isEmpty()
                && list.get(0) instanceof Map<?, ?> first) {
            Object firstAttrs = first.get("attributes");
            if (firstAttrs instanceof Map<?, ?> fa && fa.get("status") instanceof String s) {
                intentStatus = s;
            }
        }
        if (intentStatus == null) {
            Object intentRaw = attrs.get("payment_intent");
            if (intentRaw instanceof Map<?, ?> intentMap
                    && intentMap.get("attributes") instanceof Map<?, ?> ia
                    && ia.get("status") instanceof String s) {
                intentStatus = s;
            }
        }

        if ("succeeded".equalsIgnoreCase(intentStatus) || "paid".equalsIgnoreCase(intentStatus)) {
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payments.save(payment);
            trackingBroadcaster.paymentPaid(rideId, null, "paid");
        }

        return build(ride);
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

        Map<Integer, Payment> paymentByRideId = new HashMap<>();
        for (Ride r : list) {
            payments.findByRideId(r.getRideId())
                    .ifPresent(p -> paymentByRideId.put(r.getRideId(), p));
        }

        return list.stream().map(r -> RideResponse.from(
                r, typeById.get(r.getRideTypeId()),
                addressById.get(r.getPickupAddressId()),
                addressById.get(r.getDropoffAddressId()),
                userById.get(r.getCustomerId()),
                r.getRiderId() == null ? null : userById.get(r.getRiderId()),
                r.getRiderId() == null ? null : profileById.get(r.getRiderId()),
                paymentByRideId.get(r.getRideId())
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

    private void markRideCodPaidIfCod(Ride ride) {
        BigDecimal fare = ride.getFareAmount();
        if (fare == null) return;

        Payment p = payments.findByRideId(ride.getRideId()).orElse(null);
        if (p == null) {
            Payment fresh = new Payment();
            fresh.setRideId(ride.getRideId());
            fresh.setMethod(PaymentMethod.COD);
            fresh.setAmount(fare);
            fresh.setStatus(PaymentStatus.PAID);
            fresh.setPaidAt(LocalDateTime.now());
            payments.save(fresh);
            return;
        }

        if (PaymentMethod.COD.equals(p.getMethod())
                && p.getStatus() == PaymentStatus.PENDING) {
            p.setAmount(fare);
            p.setStatus(PaymentStatus.PAID);
            p.setPaidAt(LocalDateTime.now());
            payments.save(p);
        }
    }

    private static PaymentMethod resolvePaymentMethod(String raw) {
        if (raw == null || raw.isBlank()) return PaymentMethod.COD;
        String v = raw.trim().toLowerCase(Locale.ROOT);
        if ("online".equals(v) || "gcash".equals(v) || "maya".equals(v)) {
            return PaymentMethod.GCASH;
        }
        try {
            return PaymentMethod.fromValue(v);
        } catch (IllegalArgumentException ex) {
            return PaymentMethod.COD;
        }
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