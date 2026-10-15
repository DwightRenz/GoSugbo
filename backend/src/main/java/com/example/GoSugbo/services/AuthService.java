package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.AuthDtos.*;
import com.example.GoSugbo.entity.*;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.*;
import com.example.GoSugbo.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final CustomerProfileRepository customers;
    private final RiderProfileRepository riders;
    private final AdminProfileRepository admins;
    private final RevokedTokenRepository revokedTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final boolean riderAutoApprove;

    /** Burns the same CPU time when an email is unknown, so timing doesn't reveal which emails exist. */
    private final String dummyHash;

    public AuthService(UserRepository users,
                       CustomerProfileRepository customers,
                       RiderProfileRepository riders,
                       AdminProfileRepository admins,
                       RevokedTokenRepository revokedTokens,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Value("${app.auth.rider-auto-approve:true}") boolean riderAutoApprove) {
        this.users = users;
        this.customers = customers;
        this.riders = riders;
        this.admins = admins;
        this.revokedTokens = revokedTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.riderAutoApprove = riderAutoApprove;
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    // ------------------------------------------------------------ registration

    @Transactional
    public UserResponse registerCustomer(RegisterCustomerRequest req) {
        User user = createUser(req.email(), req.password(), req.fullName(), req.phone(),
                Role.CUSTOMER, UserStatus.ACTIVE);
        CustomerProfile profile = new CustomerProfile();
        profile.setCustomerId(user.getId());
        customers.save(profile);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse registerRider(RegisterRiderRequest req) {
        UserStatus status = riderAutoApprove ? UserStatus.ACTIVE : UserStatus.PENDING;
        User user = createUser(req.email(), req.password(), req.fullName(), req.phone(), Role.RIDER, status);
        RiderProfile profile = new RiderProfile();
        profile.setRiderId(user.getId());
        profile.setVehicleType(VehicleType.fromValue(req.vehicleType()));
        profile.setPlateNumber(blankToNull(req.plateNumber()));
        profile.setLicenseNo(blankToNull(req.licenseNo()));
        riders.save(profile);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse registerAdmin(RegisterAdminRequest req) {
        User user = createUser(req.email(), req.password(), req.fullName(), req.phone(),
                Role.ADMIN, UserStatus.ACTIVE);
        AdminProfile profile = new AdminProfile();
        profile.setAdminId(user.getId());
        admins.save(profile);
        return UserResponse.from(user);
    }

    private User createUser(String email, String rawPassword, String fullName, String phone,
                            Role role, UserStatus status) {
        String normalized = normalizeEmail(email);
        if (users.existsByEmailIgnoreCase(normalized)) {
            throw ApiException.conflict("Email is already registered");
        }
        User user = new User();
        user.setEmail(normalized);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName(fullName.trim());
        user.setPhone(blankToNull(phone));
        user.setRole(role);
        user.setStatus(status);
        return users.save(user);
    }

    // ------------------------------------------------------------------- login

    @Transactional
    public AuthResponse login(LoginRequest req) {
        var found = users.findByEmailIgnoreCase(normalizeEmail(req.email()));
        if (found.isEmpty()) {
            passwordEncoder.matches(req.password(), dummyHash);
            throw ApiException.unauthorized("Invalid email or password");
        }
        User user = found.get();
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }

        // Only reveal account state after the password was proven correct
        switch (user.getStatus()) {
            case PENDING   -> throw ApiException.forbidden("Your account is pending approval");
            case SUSPENDED -> throw ApiException.forbidden("Your account has been suspended");
            case INACTIVE  -> throw ApiException.forbidden("Your account is inactive");
            case ACTIVE    -> { }
        }

        if (user.getRole() == Role.ADMIN) {
            admins.findById(user.getId()).ifPresent(a -> a.setLastLogin(LocalDateTime.now()));
        }

        JwtService.IssuedToken token = jwtService.issue(user);
        return new AuthResponse(token.value(), "Bearer", token.expiresInSeconds(), UserResponse.from(user));
    }

    // ------------------------------------------------------------------ logout

    @Transactional
    public void logout(Jwt jwt) {
        String jti = jwt.getId();
        if (jti != null && !revokedTokens.existsById(jti)) {
            LocalDateTime expiresAt = LocalDateTime.ofInstant(jwt.getExpiresAt(), ZoneOffset.UTC);
            revokedTokens.save(new RevokedToken(jti, expiresAt));
        }
    }

    // ---------------------------------------------------------------------- me

    @Transactional(readOnly = true)
    public UserResponse me(Jwt jwt) {
        int userId = Integer.parseInt(jwt.getSubject());
        return users.findById(userId)
                .map(UserResponse::from)
                .orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
    }

    // ----------------------------------------------------------------- helpers

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}