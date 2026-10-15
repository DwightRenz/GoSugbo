package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class AuthDtos {

    private AuthDtos() {}

    static final String PASSWORD_REGEX = "^(?=.*[A-Za-z])(?=.*\\d).+$";
    static final String PASSWORD_MSG = "Password must contain at least one letter and one number";
    static final String PHONE_REGEX = "^\\+?[0-9]{7,15}$";
    static final String PHONE_MSG = "Phone must be 7-15 digits, optionally starting with +";

    // ---------------------------------------------------------------- requests

    @Schema(description = "Customer registration")
    public record RegisterCustomerRequest(
            @Schema(example = "juan@example.com") @NotBlank @Email @Size(max = 150) String email,
            @Schema(example = "Passw0rdOk", description = "8-72 chars, at least one letter and one number")
            @NotBlank @Size(min = 8, max = 72) @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG) String password,
            @Schema(example = "Juan Dela Cruz") @NotBlank @Size(max = 120) String fullName,
            @Schema(example = "+639171234567", nullable = true)
            @Pattern(regexp = PHONE_REGEX, message = PHONE_MSG) String phone) {}

    @Schema(description = "Rider registration")
    public record RegisterRiderRequest(
            @Schema(example = "rider@example.com") @NotBlank @Email @Size(max = 150) String email,
            @Schema(example = "Passw0rdOk", description = "8-72 chars, at least one letter and one number")
            @NotBlank @Size(min = 8, max = 72) @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG) String password,
            @Schema(example = "Pedro Santos") @NotBlank @Size(max = 120) String fullName,
            @Schema(example = "+639171234567")
            @NotBlank @Pattern(regexp = PHONE_REGEX, message = PHONE_MSG) String phone,
            @Schema(example = "motorcycle", allowableValues = {"motorcycle", "bicycle", "car", "van", "truck"})
            @NotBlank @Pattern(regexp = "motorcycle|bicycle|car|van|truck",
                    message = "vehicleType must be one of: motorcycle, bicycle, car, van, truck") String vehicleType,
            @Schema(example = "ABC 1234", nullable = true) @Size(max = 20) String plateNumber,
            @Schema(example = "N01-23-456789", nullable = true) @Size(max = 50) String licenseNo) {}

    @Schema(description = "Admin creation (only callable by an existing admin)")
    public record RegisterAdminRequest(
            @Schema(example = "newadmin@example.com") @NotBlank @Email @Size(max = 150) String email,
            @Schema(example = "Passw0rdOk", description = "8-72 chars, at least one letter and one number")
            @NotBlank @Size(min = 8, max = 72) @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG) String password,
            @Schema(example = "Maria Reyes") @NotBlank @Size(max = 120) String fullName,
            @Schema(example = "+639171234567", nullable = true)
            @Pattern(regexp = PHONE_REGEX, message = PHONE_MSG) String phone) {}

    @Schema(description = "Login credentials (same endpoint for customer, rider and admin)")
    public record LoginRequest(
            @Schema(example = "juan@example.com") @NotBlank @Email String email,
            @Schema(example = "Passw0rdOk") @NotBlank String password) {}

    // --------------------------------------------------------------- responses

    @Schema(description = "Public view of a user account")
    public record UserResponse(
            @Schema(example = "1") Integer id,
            @Schema(example = "juan@example.com") String email,
            @Schema(example = "Juan Dela Cruz") String fullName,
            @Schema(example = "+639171234567", nullable = true) String phone,
            @Schema(example = "customer", allowableValues = {"customer", "rider", "admin", "store_owner"}) String role,
            @Schema(example = "active", allowableValues = {"active", "inactive", "suspended", "pending"}) String status,
            @Schema(nullable = true) String profileImage,
            @Schema(example = "2026-10-15T08:30:00") LocalDateTime createdAt) {

        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(),
                    u.getRole().getValue(), u.getStatus().getValue(), u.getProfileImage(), u.getCreatedAt());
        }
    }

    @Schema(description = "Successful login")
    public record AuthResponse(
            @Schema(description = "Send as 'Authorization: Bearer <accessToken>'") String accessToken,
            @Schema(example = "Bearer") String tokenType,
            @Schema(description = "Seconds until the token expires", example = "3600") long expiresIn,
            UserResponse user) {}

    @Schema(description = "Simple confirmation message")
    public record MessageResponse(@Schema(example = "Logged out successfully") String message) {}
}