package com.example.GoSugbo.controller;

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

    // ---------------------------------------------------------- public-ish

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

    // ---------------------------------------------------------- customer

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Book a ride")
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

    // ------------------------------------------------- customer + rider + admin

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
}