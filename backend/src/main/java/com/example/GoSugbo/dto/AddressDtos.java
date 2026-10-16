package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.Address;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class AddressDtos {

    private AddressDtos() {}

    // ---------------------------------------------------------------- requests

    @Schema(description = "Create or replace an address for the logged-in user")
    public record AddressRequest(
            @Schema(example = "Home", nullable = true) @Size(max = 50) String label,

            @Schema(example = "123 Rizal Street") @NotBlank @Size(max = 255) String line1,

            @Schema(example = "Unit 4B, Green Building", nullable = true) @Size(max = 255) String line2,

            @Schema(example = "Cebu City") @NotBlank @Size(max = 100) String city,

            @Schema(example = "Cebu", nullable = true) @Size(max = 100) String province,

            @Schema(example = "6000", nullable = true) @Size(max = 20) String postalCode,

            @Schema(example = "Philippines", nullable = true) @Size(max = 80) String country,

            @Schema(example = "10.3156992", nullable = true)
            @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") BigDecimal latitude,

            @Schema(example = "123.8854377", nullable = true)
            @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") BigDecimal longitude,

            @Schema(example = "false", description = "If true, all other addresses of this user are unset as default")
            Boolean isDefault) {}

    // --------------------------------------------------------------- responses

    @Schema(description = "Public view of an address")
    public record AddressResponse(
            Integer id,
            String label,
            String line1,
            String line2,
            String city,
            String province,
            String postalCode,
            String country,
            BigDecimal latitude,
            BigDecimal longitude,
            boolean isDefault,
            LocalDateTime createdAt) {

        public static AddressResponse from(Address a) {
            return new AddressResponse(
                    a.getAddressId(), a.getLabel(), a.getLine1(), a.getLine2(),
                    a.getCity(), a.getProvince(), a.getPostalCode(), a.getCountry(),
                    a.getLatitude(), a.getLongitude(), a.isDefaultAddress(), a.getCreatedAt());
        }
    }
}