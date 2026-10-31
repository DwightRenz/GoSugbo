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

    // ---------------------------------------------------------------- requests

    @Schema(description = "Customer registration")
    public record RegisterCustomerRequest(
            @Schema(example = "Juan") @NotBlank @Size(max = 60) String firstName,
            @Schema(example = "Dela Cruz") @NotBlank @Size(max = 60) String lastName,
            @Schema(example = "juan@example.com") @NotBlank @Email @Size(max = 150) String email,
            @Schema(example = "Passw0rdOk", description = "8-72 chars, at least one letter and one number")
            @NotBlank @Size(min = 8, max = 72) @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG) String password,
            @Schema(example = "Passw0rdOk") @NotBlank String confirmPassword) {}

    @Schema(description = "Rider registration")
    public record RegisterRiderRequest(
            @Schema(example = "Pedro") @NotBlank @Size(max = 60) String firstName,
            @Schema(example = "Santos") @NotBlank @Size(max = 60) String lastName,
            @Schema(example = "rider@example.com") @NotBlank @Email @Size(max = 150) String email,
            @Schema(example = "Passw0rdOk", description = "8-72 chars, at least one letter and one number")
            @NotBlank @Size(min = 8, max = 72) @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG) String password,
            @Schema(example = "Passw0rdOk") @NotBlank String confirmPassword,
            @Schema(example = "motorcycle", allowableValues = {"motorcycle", "bicycle", "car", "van", "truck"})
            @NotBlank @Pattern(regexp = "motorcycle|bicycle|car|van|truck",
                    message = "vehicleType must be one of: motorcycle, bicycle, car, van, truck") String vehicleType,
            @Schema(example = "ABC 1234", nullable = true) @Size(max = 20) String plateNumber,
            @Schema(example = "N01-23-456789", nullable = true) @Size(max = 50) String licenseNo) {}

    @Schema(description = "Admin creation (only callable by an existing admin)")
    public record RegisterAdminRequest(
            @Schema(example = "Maria") @NotBlank @Size(max = 60) String firstName,
            @Schema(example = "Reyes") @NotBlank @Size(max = 60) String lastName,
            @Schema(example = "newadmin@example.com") @NotBlank @Email @Size(max = 150) String email,
            @Schema(example = "Passw0rdOk", description = "8-72 chars, at least one letter and one number")
            @NotBlank @Size(min = 8, max = 72) @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG) String password,
            @Schema(example = "Passw0rdOk") @NotBlank String confirmPassword) {}

    @Schema(description = "Login credentials (same endpoint for customer, rider and admin)")
    public record LoginRequest(
            @Schema(example = "juan@example.com") @NotBlank @Email String email,
            @Schema(example = "Passw0rdOk") @NotBlank String password) {}

    @Schema(description = "Google sign-in: send the Firebase ID token obtained on the client")
    public record GoogleAuthRequest(
            @Schema(description = "Firebase ID token from signInWithPopup / getIdToken()") @NotBlank String idToken) {}

    // --------------------------------------------------------------- responses

    @Schema(description = "Public view of a user account")
    public record UserResponse(
            @Schema(example = "1") Integer id,
            @Schema(example = "Juan") String firstName,
            @Schema(example = "Dela Cruz") String lastName,
            @Schema(example = "juan@example.com") String email,
            @Schema(example = "customer", allowableValues = {"customer", "rider", "admin", "store_owner"}) String role,
            @Schema(example = "active", allowableValues = {"active", "inactive", "suspended", "pending"}) String status,
            @Schema(nullable = true) String profileImage,
            @Schema(example = "2026-10-15T08:30:00") LocalDateTime createdAt) {

        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(),
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