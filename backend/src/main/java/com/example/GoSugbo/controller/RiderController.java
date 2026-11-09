package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.DeliveryDtos.*;
import com.example.GoSugbo.entity.User;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.UserRepository;
import com.example.GoSugbo.services.CloudinaryService;
import com.example.GoSugbo.services.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/riders/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Rider", description = "Rider availability and location")
public class RiderController {

    private final DeliveryService deliveryService;
    private final CloudinaryService cloudinaryService;
    private final UserRepository users;

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

    /**
     * Upload or replace the rider's profile picture. Multipart form field name: "file".
     * Returns the full refreshed rider profile, so the mobile app can update state in one shot.
     */
    @PostMapping(value = "/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload / replace my profile picture")
    @Transactional
    public RiderProfileResponse uploadProfilePicture(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestPart("file") MultipartFile file) {

        int riderId = AddressController.currentUserId(jwt);
        User user = users.findById(riderId)
                .orElseThrow(() -> ApiException.notFound("User not found"));

        String previousUrl = user.getProfileImage();
        String previousPublicId = CloudinaryService.publicIdFromUrl(previousUrl);

        CloudinaryService.UploadResult uploaded =
                cloudinaryService.uploadProfilePicture(riderId, file);

        RiderProfileResponse updated = deliveryService.updateProfilePicture(riderId, uploaded.url());

        // Safe cleanup: only after the DB save, and only when the old asset was ours.
        if (previousPublicId != null && previousPublicId.contains("profile-pictures/")) {
            cloudinaryService.deleteByPublicId(previousPublicId);
        }

        return updated;
    }
}