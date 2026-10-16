package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.Store;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class StoreDtos {

    private StoreDtos() {}

    // ---------------------------------------------------------------- requests

    @Schema(description = "Create a new store (owned by the logged-in admin)")
    public record CreateStoreRequest(
            @Schema(example = "Sugbo Lechon House") @NotBlank @Size(max = 150) String name,

            @Schema(example = "Best lechon in Cebu.", nullable = true) String description,

            @Schema(example = "+639171234567", nullable = true)
            @Pattern(regexp = "^\\+?[0-9]{7,15}$",
                    message = "Phone must be 7-15 digits, optionally starting with +") String phone,

            @Schema(example = "https://cdn.example.com/logo.png", nullable = true) @Size(max = 255) String logoImage,

            @Schema(example = "12", nullable = true,
                    description = "Address id owned by the same user; must exist") Integer addressId,

            @Schema(example = "10.3156992", nullable = true)
            @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,

            @Schema(example = "123.8854377", nullable = true)
            @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,

            @Schema(example = "active", allowableValues = {"active", "inactive", "closed"}, nullable = true)
            @Pattern(regexp = "active|inactive|closed",
                    message = "status must be one of: active, inactive, closed") String status) {}

    @Schema(description = "Update an existing store; null fields are left unchanged")
    public record UpdateStoreRequest(
            @Schema(example = "Sugbo Lechon House") @Size(max = 150) String name,

            @Schema(nullable = true) String description,

            @Schema(nullable = true)
            @Pattern(regexp = "^\\+?[0-9]{7,15}$",
                    message = "Phone must be 7-15 digits, optionally starting with +") String phone,

            @Schema(nullable = true) @Size(max = 255) String logoImage,

            @Schema(nullable = true,
                    description = "Pass null to clear; pass an id to link an existing address") Integer addressId,

            @Schema(nullable = true) @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,

            @Schema(nullable = true) @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,

            @Schema(nullable = true, allowableValues = {"active", "inactive", "closed"})
            @Pattern(regexp = "active|inactive|closed",
                    message = "status must be one of: active, inactive, closed") String status) {}

    // --------------------------------------------------------------- responses

    @Schema(description = "Public view of a store")
    public record StoreResponse(
            Integer id,
            Integer ownerId,
            String name,
            String description,
            String phone,
            String logoImage,
            Integer addressId,
            BigDecimal latitude,
            BigDecimal longitude,
            @Schema(allowableValues = {"active", "inactive", "closed"}) String status,
            LocalDateTime createdAt) {

        public static StoreResponse from(Store s) {
            return new StoreResponse(
                    s.getStoreId(), s.getOwnerId(), s.getName(), s.getDescription(), s.getPhone(),
                    s.getLogoImage(), s.getAddressId(), s.getLatitude(), s.getLongitude(),
                    s.getStatus().getValue(), s.getCreatedAt());
        }
    }
}