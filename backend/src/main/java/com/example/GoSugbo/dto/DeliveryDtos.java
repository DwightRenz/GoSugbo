package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.Address;
import com.example.GoSugbo.entity.Delivery;
import com.example.GoSugbo.entity.Order;
import com.example.GoSugbo.entity.RiderProfile;
import com.example.GoSugbo.entity.Store;
import com.example.GoSugbo.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class DeliveryDtos {

    private DeliveryDtos() {}

    // ---------------------------------------------------------------- requests

    @Schema(description = "Admin assigns a rider to an order")
    public record AssignRiderRequest(
            @Schema(example = "5") @NotNull Integer riderId) {}

    @Schema(description = "Rider updates the delivery status")
    public record UpdateDeliveryStatusRequest(
            @Schema(example = "picked_up",
                    allowableValues = {"accepted", "arrived_store", "picked_up", "in_transit",
                            "arrived_customer", "completed", "failed", "cancelled"})
            @NotBlank String status,

            @Schema(example = "Customer not answering the phone.", nullable = true)
            @Size(max = 500) String notes,

            @Schema(example = "3.40", nullable = true)
            @DecimalMin("0.00") @Digits(integer = 4, fraction = 2) BigDecimal distanceKm,

            @Schema(example = "https://example.com/proof.jpg", nullable = true)
            @Size(max = 255) String proofImage) {}

    @Schema(description = "Rider goes online or offline")
    public record UpdateAvailabilityRequest(
            @Schema(example = "true") @NotNull Boolean available) {}

    @Schema(description = "Rider's current GPS position")
    public record UpdateLocationRequest(
            @Schema(example = "7.0731000")
            @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal lat,

            @Schema(example = "125.6128000")
            @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal lng) {}

    // --------------------------------------------------------------- responses

    @Schema(description = "Where the rider collects the order (the store)")
    public record PickupInfo(
            Integer storeId,
            String storeName,
            String storePhone,
            String line1,
            String line2,
            String city,
            BigDecimal latitude,
            BigDecimal longitude) {

        public static PickupInfo from(Store s, Address a) {
            if (s == null) return null;
            BigDecimal lat = s.getLatitude() != null ? s.getLatitude() : (a == null ? null : a.getLatitude());
            BigDecimal lng = s.getLongitude() != null ? s.getLongitude() : (a == null ? null : a.getLongitude());
            return new PickupInfo(
                    s.getStoreId(), s.getName(), s.getPhone(),
                    a == null ? null : a.getLine1(),
                    a == null ? null : a.getLine2(),
                    a == null ? null : a.getCity(),
                    lat, lng);
        }
    }

    @Schema(description = "Where the rider delivers (the customer)")
    public record DropoffInfo(
            Integer customerId,
            String customerName,
            String customerPhone,
            String label,
            String line1,
            String line2,
            String city,
            String province,
            String postalCode,
            BigDecimal latitude,
            BigDecimal longitude) {

        public static DropoffInfo from(User u, Address a) {
            if (u == null && a == null) return null;
            return new DropoffInfo(
                    u == null ? null : u.getId(),
                    u == null ? null : u.getFullName(),
                    u == null ? null : u.getPhone(),
                    a == null ? null : a.getLabel(),
                    a == null ? null : a.getLine1(),
                    a == null ? null : a.getLine2(),
                    a == null ? null : a.getCity(),
                    a == null ? null : a.getProvince(),
                    a == null ? null : a.getPostalCode(),
                    a == null ? null : a.getLatitude(),
                    a == null ? null : a.getLongitude());
        }
    }

    @Schema(description = "An order waiting for a rider. Customer details stay hidden until accepted.")
    public record AvailableOrderResponse(
            Integer id,
            String orderCode,
            java.math.BigDecimal totalAmount,
            java.math.BigDecimal deliveryFee,
            LocalDateTime placedAt,
            PickupInfo pickup,
            @Schema(description = "City only; full address is shown after accepting") String dropoffCity) {

        public static AvailableOrderResponse from(Order o, PickupInfo pickup, Address dropoff) {
            return new AvailableOrderResponse(
                    o.getOrderId(), o.getOrderCode(), o.getTotalAmount(), o.getDeliveryFee(),
                    o.getPlacedAt(), pickup, dropoff == null ? null : dropoff.getCity());
        }
    }

    @Schema(description = "A delivery with key order info, pickup and dropoff")
    public record DeliveryResponse(
            Integer id,
            Integer orderId,
            String orderCode,
            String orderStatus,
            Integer riderId,
            @Schema(allowableValues = {"assigned", "accepted", "arrived_store", "picked_up",
                    "in_transit", "arrived_customer", "completed", "failed", "cancelled"}) String status,
            BigDecimal orderTotal,
            PickupInfo pickup,
            DropoffInfo dropoff,
            LocalDateTime pickupAt,
            LocalDateTime deliveredAt,
            BigDecimal distanceKm,
            String proofImage,
            String notes,
            LocalDateTime createdAt) {

        public static DeliveryResponse from(Delivery d, Order o, PickupInfo pickup, DropoffInfo dropoff) {
            return new DeliveryResponse(
                    d.getDeliveryId(), d.getOrderId(),
                    o == null ? null : o.getOrderCode(),
                    o == null ? null : o.getStatus().getValue(),
                    d.getRiderId(), d.getStatus().getValue(),
                    o == null ? null : o.getTotalAmount(),
                    pickup, dropoff,
                    d.getPickupAt(), d.getDeliveredAt(), d.getDistanceKm(),
                    d.getProofImage(), d.getNotes(), d.getCreatedAt());
        }
    }

    @Schema(description = "Rider's own profile / status")
    public record RiderProfileResponse(
            Integer riderId,
            boolean available,
            String vehicleType,
            String plateNumber,
            BigDecimal currentLat,
            BigDecimal currentLng,
            BigDecimal ratingAvg,
            int totalDeliveries) {

        public static RiderProfileResponse from(RiderProfile p) {
            return new RiderProfileResponse(
                    p.getRiderId(), p.isAvailable(),
                    p.getVehicleType() == null ? null : p.getVehicleType().getValue(),
                    p.getPlateNumber(), p.getCurrentLat(), p.getCurrentLng(),
                    p.getRatingAvg(), p.getTotalDeliveries());
        }
    }
}