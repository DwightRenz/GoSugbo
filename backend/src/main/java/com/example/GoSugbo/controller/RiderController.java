package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.DeliveryDtos.*;
import com.example.GoSugbo.services.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/riders/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Rider", description = "Rider availability and location")
public class RiderController {

    private final DeliveryService deliveryService;

    @GetMapping
    @Operation(summary = "Get my rider profile")
    public RiderProfileResponse me(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return deliveryService.getProfile(AddressController.currentUserId(jwt));
    }

    @PatchMapping("/availability")
    @Operation(summary = "Go online / offline",
            description = "Cannot go offline while a delivery is active.")
    public RiderProfileResponse availability(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                             @Valid @RequestBody UpdateAvailabilityRequest request) {
        return deliveryService.setAvailability(AddressController.currentUserId(jwt), request.available());
    }

    @PatchMapping("/location")
    @Operation(summary = "Update my current location")
    public RiderProfileResponse location(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                         @Valid @RequestBody UpdateLocationRequest request) {
        return deliveryService.updateLocation(AddressController.currentUserId(jwt), request);
    }
}