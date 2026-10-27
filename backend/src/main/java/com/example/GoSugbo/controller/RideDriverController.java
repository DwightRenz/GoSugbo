package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.DeliveryDtos.UpdateLocationRequest;
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

@RestController
@RequestMapping("/api/rides/driver")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Ride Driver", description = "Rider-side ride operations")
public class RideDriverController {

    private final RideService rideService;

    @GetMapping("/available")
    @Operation(summary = "Open ride requests on the job board")
    public Page<AvailableRideResponse> available(Pageable pageable) {
        return rideService.listAvailable(pageable);
    }

    @PostMapping("/{id}/accept")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Accept an open ride request")
    public RideResponse accept(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                               @PathVariable Integer id) {
        return rideService.accept(AddressController.currentUserId(jwt), id);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update ride status",
            description = "Allowed transitions:\n"
                    + "accepted → arrived_pickup|cancelled\n"
                    + "arrived_pickup → in_progress|cancelled|no_show\n"
                    + "in_progress → completed|cancelled\n"
                    + "Completing recalculates the final fare from actual_distance_km (or estimated).")
    public RideResponse updateStatus(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                     @PathVariable Integer id,
                                     @Valid @RequestBody UpdateRideStatusRequest req) {
        return rideService.updateStatus(AddressController.currentUserId(jwt), false, id, req);
    }

    // NEW — push GPS for an active ride; broadcasts on /topic/rides/{id}/location
    @PatchMapping("/{id}/location")
    @Operation(summary = "Push current GPS for an active ride",
            description = "Rider-only. Broadcasts to /topic/rides/{id}/location for the customer.")
    public void pushLocation(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                             @PathVariable Integer id,
                             @Valid @RequestBody UpdateLocationRequest req) {
        rideService.updateRiderLocationForRide(
                AddressController.currentUserId(jwt), id, req.lat(), req.lng());
    }

    @GetMapping("/mine")
    @Operation(summary = "My ride history (as driver)")
    public Page<RideResponse> mine(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                   Pageable pageable) {
        return rideService.listMineAsRider(AddressController.currentUserId(jwt), pageable);
    }

    @GetMapping("/mine/active")
    @Operation(summary = "My active ride (as driver)")
    public RideResponse active(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return rideService.getActiveAsRider(AddressController.currentUserId(jwt));
    }
}