package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class RideDtos {

    private RideDtos() {}

    // ------------------------------------------------------------ requests

    public record FareEstimateRequest(
            Integer rideTypeId,
            BigDecimal pickupLat, BigDecimal pickupLng,
            BigDecimal dropoffLat, BigDecimal dropoffLng
    ) {}

    /**
     * Book a ride. The customer's payment choice is captured here:
     *   paymentMethod = "cod" | "cash"  → cash on delivery
     *   paymentMethod = "online"        → QR Ph after the ride
     * Omitting it defaults to COD for backward compatibility.
     */
    public record CreateRideRequest(
            Integer rideTypeId,
            Integer pickupAddressId,
            Integer dropoffAddressId,
            String notes,
            String paymentMethod
    ) {}

    public record UpdateRideStatusRequest(
            String status,
            String notes,
            BigDecimal actualDistanceKm
    ) {}

    public record CancelRideRequest(String reason) {}

    // ----------------------------------------------------------- responses

    public record RideTypeResponse(
            Integer rideTypeId,
            String name,
            String vehicleType,
            BigDecimal baseFare,
            BigDecimal perKmRate,
            BigDecimal perMinRate,
            BigDecimal minFare,
            BigDecimal surgeMultiplier
    ) {
        public static RideTypeResponse from(RideType t) {
            return new RideTypeResponse(
                    t.getRideTypeId(), t.getName(),
                    t.getVehicleType().getValue(),
                    t.getBaseFare(), t.getPerKmRate(), t.getPerMinRate(),
                    t.getMinFare(), t.getSurgeMultiplier());
        }
    }

    public record FareEstimateResponse(
            Integer rideTypeId,
            String rideTypeName,
            BigDecimal estimatedDistanceKm,
            Integer estimatedDurationMin,
            BigDecimal estimatedFare
    ) {}

    public record CustomerInfo(Integer userId, String fullName, String phone, String profileImage) {
        public static CustomerInfo from(User u) {
            if (u == null) return null;
            return new CustomerInfo(u.getId(), u.getFullName(), u.getPhone(), u.getProfileImage());
        }
    }

    public record RiderInfo(Integer riderId, String fullName, String phone, String profileImage,
                            String vehicleType, String plateNumber, BigDecimal ratingAvg) {
        public static RiderInfo from(User u, RiderProfile p) {
            if (u == null) return null;
            return new RiderInfo(
                    u.getId(), u.getFullName(), u.getPhone(), u.getProfileImage(),
                    p == null || p.getVehicleType() == null ? null : p.getVehicleType().getValue(),
                    p == null ? null : p.getPlateNumber(),
                    p == null ? null : p.getRatingAvg());
        }
    }

    public record AddressInfo(Integer addressId, String label, String line1, String line2,
                              String city, String province, BigDecimal latitude, BigDecimal longitude) {
        public static AddressInfo from(Address a) {
            if (a == null) return null;
            return new AddressInfo(a.getAddressId(), a.getLabel(), a.getLine1(), a.getLine2(),
                    a.getCity(), a.getProvince(), a.getLatitude(), a.getLongitude());
        }
    }

    public record RideResponse(
            Integer rideId,
            String status,
            RideTypeResponse rideType,
            AddressInfo pickup,
            AddressInfo dropoff,
            BigDecimal pickupLat, BigDecimal pickupLng,
            BigDecimal dropoffLat, BigDecimal dropoffLng,
            BigDecimal estimatedDistanceKm,
            Integer estimatedDurationMin,
            BigDecimal actualDistanceKm,
            BigDecimal fareAmount,
            CustomerInfo customer,
            RiderInfo rider,
            LocalDateTime requestedAt,
            LocalDateTime acceptedAt,
            LocalDateTime pickupAt,
            LocalDateTime completedAt,
            LocalDateTime cancelledAt,
            String cancellationReason,
            String notes,
            String paymentStatus,
            String paymentMethod
    ) {
        public static RideResponse from(Ride r, RideType type,
                                        Address pickup, Address dropoff,
                                        User customer, User riderUser, RiderProfile riderProfile) {
            return from(r, type, pickup, dropoff, customer, riderUser, riderProfile, null);
        }

        public static RideResponse from(Ride r, RideType type,
                                        Address pickup, Address dropoff,
                                        User customer, User riderUser, RiderProfile riderProfile,
                                        Payment payment) {
            return new RideResponse(
                    r.getRideId(),
                    r.getStatus().getValue(),
                    type == null ? null : RideTypeResponse.from(type),
                    AddressInfo.from(pickup),
                    AddressInfo.from(dropoff),
                    r.getPickupLat(), r.getPickupLng(),
                    r.getDropoffLat(), r.getDropoffLng(),
                    r.getEstimatedDistanceKm(), r.getEstimatedDurationMin(),
                    r.getActualDistanceKm(), r.getFareAmount(),
                    CustomerInfo.from(customer),
                    RiderInfo.from(riderUser, riderProfile),
                    r.getRequestedAt(), r.getAcceptedAt(), r.getPickupAt(),
                    r.getCompletedAt(), r.getCancelledAt(),
                    r.getCancellationReason(), r.getNotes(),
                    payment == null ? null : payment.getStatus().getValue(),
                    payment == null ? null : payment.getMethod().getValue());
        }
    }

    public record AvailableRideResponse(
            Integer rideId,
            String status,
            RideTypeResponse rideType,
            AddressInfo pickup,
            String dropoffCity,
            BigDecimal pickupLat, BigDecimal pickupLng,
            BigDecimal dropoffLat, BigDecimal dropoffLng,
            BigDecimal estimatedDistanceKm,
            Integer estimatedDurationMin,
            BigDecimal estimatedFare,
            LocalDateTime requestedAt
    ) {
        public static AvailableRideResponse from(Ride r, RideType type,
                                                 Address pickup, Address dropoff) {
            return new AvailableRideResponse(
                    r.getRideId(), r.getStatus().getValue(),
                    type == null ? null : RideTypeResponse.from(type),
                    AddressInfo.from(pickup),
                    dropoff == null ? null : dropoff.getCity(),
                    r.getPickupLat(), r.getPickupLng(),
                    r.getDropoffLat(), r.getDropoffLng(),
                    r.getEstimatedDistanceKm(), r.getEstimatedDurationMin(),
                    r.getFareAmount(), r.getRequestedAt());
        }
    }

    public record NearbyRiderResponse(
            Integer riderId,
            String fullName,
            String vehicleType,
            String plateNumber,
            BigDecimal ratingAvg,
            BigDecimal currentLat,
            BigDecimal currentLng,
            double distanceKm
    ) {}

    public record RideStatusHistoryResponse(
            String status, Integer changedBy, String notes, LocalDateTime createdAt
    ) {
        public static RideStatusHistoryResponse from(RideStatusHistory h) {
            return new RideStatusHistoryResponse(
                    h.getStatus().getValue(), h.getChangedBy(),
                    h.getNotes(), h.getCreatedAt());
        }
    }
}