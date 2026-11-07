package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.OrderDtos.CheckoutResponse;
import com.example.GoSugbo.dto.RideDtos.*;
import com.example.GoSugbo.services.RideService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Rides", description = "Ride-hailing: fare estimate, booking, tracking")
public class RideController {

    private final RideService rideService;

    @GetMapping("/types")
    @Operation(summary = "List available ride types and their pricing")
    public List<RideTypeResponse> types() {
        return rideService.listRideTypes();
    }

    @PostMapping("/estimate")
    @Operation(summary = "Estimate fare for a trip",
            description = "Returns distance, ETA and estimated fare for a given ride type.")
    public FareEstimateResponse estimate(@Valid @RequestBody FareEstimateRequest req) {
        return rideService.estimate(req);
    }

    @GetMapping("/nearby-riders")
    @Operation(summary = "Find available riders near a point",
            description = "Used by the customer app to show cars on the map.")
    public List<NearbyRiderResponse> nearby(
            @RequestParam BigDecimal lat,
            @RequestParam BigDecimal lng,
            @RequestParam(defaultValue = "motorcycle") String vehicleType,
            @RequestParam(defaultValue = "3.0") double radiusKm) {
        return rideService.nearbyRiders(lat, lng, vehicleType, radiusKm);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Book a ride",
            description = "paymentMethod: 'cod' (default) for cash, 'online' for hosted checkout after the ride.")
    public RideResponse book(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                             @Valid @RequestBody CreateRideRequest req) {
        return rideService.book(AddressController.currentUserId(jwt), req);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "My ride history (as customer)")
    public Page<RideResponse> mine(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                   Pageable pageable) {
        return rideService.listMineAsCustomer(AddressController.currentUserId(jwt), pageable);
    }

    @GetMapping("/mine/active")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "My active ride (as customer)")
    public RideResponse active(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return rideService.getActiveAsCustomer(AddressController.currentUserId(jwt));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Update a ride's status (customer)",
            description = "Customers may only cancel their own ride. "
                    + "Allowed while status is requested or accepted; "
                    + "an in-progress ride cannot be cancelled.")
    public RideResponse updateStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer id,
            @Valid @RequestBody UpdateRideStatusRequest req) {
        return rideService.updateStatus(
                AddressController.currentUserId(jwt), false, id, req);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a ride by id",
            description = "Visible to the customer, the assigned rider, and admins.")
    public RideResponse get(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                            @PathVariable Integer id) {
        int callerId = AddressController.currentUserId(jwt);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(jwt.getClaimAsString("role"));
        return rideService.get(callerId, isAdmin, id);
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Status transition history of a ride")
    public List<RideStatusHistoryResponse> history(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer id) {
        int callerId = AddressController.currentUserId(jwt);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(jwt.getClaimAsString("role"));
        return rideService.history(callerId, isAdmin, id);
    }

    // ------------------------------------------------- NEW: hosted checkout

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Create a PayMongo hosted-checkout session for a completed ride",
            description = "Returns { checkoutUrl, orderCode }. The customer's app opens checkoutUrl "
                    + "in the browser; PayMongo handles the UI. Confirmation is delivered by webhook "
                    + "or by polling the /pay/verify endpoint.")
    public CheckoutResponse pay(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                @PathVariable Integer id) {
        return rideService.initiateCheckout(AddressController.currentUserId(jwt), id);
    }

    @PostMapping("/{id}/pay/verify")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Verify payment status against PayMongo",
            description = "Called by the app poll. Queries the checkout session, and if the "
                    + "payment intent succeeded, marks the payment paid and returns the "
                    + "updated ride with paymentStatus='paid'.")
    public RideResponse verifyPay(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                  @PathVariable Integer id) {
        return rideService.verifyCheckout(AddressController.currentUserId(jwt), id);
    }
}