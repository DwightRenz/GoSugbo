package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.AuthDtos.*;
import com.example.GoSugbo.dto.ErrorResponse;
import com.example.GoSugbo.services.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Registration, login, OTP verification, password reset, logout and current-user endpoints")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/customer")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a customer",
            description = "Public. Creates a customer account and emails a 6-digit verification code. "
                    + "Call POST /api/auth/verify-email, then POST /api/auth/login.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Account created",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Email already registered",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public UserResponse registerCustomer(@Valid @RequestBody RegisterCustomerRequest request) {
        return authService.registerCustomer(request);
    }

    @PostMapping("/register/rider")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a rider",
            description = "Public. Creates a rider account plus rider profile (vehicle details) and emails a verification code. "
                    + "Status is 'active' or 'pending' depending on app.auth.rider-auto-approve; "
                    + "a pending rider cannot log in until an admin activates the account.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Account created",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Email already registered",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public UserResponse registerRider(@Valid @RequestBody RegisterRiderRequest request) {
        return authService.registerRider(request);
    }

    @PostMapping("/register/admin")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Create an admin account",
            description = "Admin only. Admins cannot self-register; an existing admin creates new ones. "
                    + "The first admin is seeded at startup from app.bootstrap-admin.* when no admin exists.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Admin created",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing, invalid, expired or revoked token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller is not an admin",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Email already registered",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public UserResponse registerAdmin(@Valid @RequestBody RegisterAdminRequest request) {
        return authService.registerAdmin(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Log in (customer, rider or admin)",
            description = "Public. Returns a JWT access token. Send it on later requests as "
                    + "'Authorization: Bearer <accessToken>'. The user.role field tells the frontend which area to show. "
                    + "If the email is unverified the response is 403 starting with 'EMAIL_NOT_VERIFIED'. "
                    + "If the account has been inactive for 30+ days the response is 428 starting with 'OTP_REQUIRED' "
                    + "and a code is emailed; repeat the request with the 'otp' field filled in.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful",
                    content = @Content(schema = @Schema(implementation = AuthResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid OTP",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid email or password",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Email not verified, or account is pending/inactive/suspended",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "428", description = "OTP required (inactive 30+ days)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Verify email with OTP",
            description = "Public. Confirms the 6-digit code emailed at registration. After this the user can log in.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email verified",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid or expired code",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public MessageResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return authService.verifyEmail(request);
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend the email verification code",
            description = "Public. Always returns the same message so registered emails cannot be discovered.")
    public MessageResponse resendVerification(@Valid @RequestBody EmailRequest request) {
        return authService.resendVerification(request);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset code",
            description = "Public. Emails a 6-digit code if the account exists. Always returns the same message.")
    public MessageResponse forgotPassword(@Valid @RequestBody EmailRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with OTP",
            description = "Public. Sets a new password using the code from /forgot-password.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password updated",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid or expired code, or passwords do not match",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }

    @PostMapping("/google")
    @Operation(summary = "Sign in with Google (Firebase)",
            description = "Public. Accepts a Firebase ID token obtained after the user completes Google sign-in on the client. "
                    + "If the email matches an existing account and the Google email is verified, the accounts are linked automatically. "
                    + "Otherwise a new customer account is created. Returns the same JWT shape as /login.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful",
                    content = @Content(schema = @Schema(implementation = AuthResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or Google account has no email",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid Firebase ID token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Account pending/inactive/suspended, or unsafe email link",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Email linked to a different Google identity",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "503", description = "Google sign-in not configured on this server",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public AuthResponse loginWithGoogle(@Valid @RequestBody GoogleAuthRequest request) {
        return authService.loginWithGoogle(request);
    }

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Log out",
            description = "Revokes the token used for this request. It is rejected on every later request, "
                    + "even before its expiry time. The frontend should also discard its stored copy.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token revoked",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing, invalid, expired or already revoked token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public MessageResponse logout(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        authService.logout(jwt);
        return new MessageResponse("Logged out successfully");
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get the logged-in user",
            description = "Returns the account that owns the supplied token. Useful for restoring a session on page reload.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Current user",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing, invalid, expired or revoked token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public UserResponse me(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return authService.me(jwt);
    }
}