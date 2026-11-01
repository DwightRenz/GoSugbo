package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.AuthDtos.*;
import com.example.GoSugbo.entity.*;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.*;
import com.example.GoSugbo.security.JwtService;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String INVALID_CODE = "Invalid or expired code";

    private final UserRepository users;
    private final CustomerProfileRepository customers;
    private final RiderProfileRepository riders;
    private final AdminProfileRepository admins;
    private final RevokedTokenRepository revokedTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final boolean riderAutoApprove;
    private final int inactivityDays;
    private final FirebaseAuth firebaseAuth;

    /** Burns the same CPU time when an email is unknown, so timing doesn't reveal which emails exist. */
    private final String dummyHash;

    public AuthService(UserRepository users,
                       CustomerProfileRepository customers,
                       RiderProfileRepository riders,
                       AdminProfileRepository admins,
                       RevokedTokenRepository revokedTokens,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       OtpService otpService,
                       @Value("${app.auth.rider-auto-approve:true}") boolean riderAutoApprove,
                       @Value("${app.otp.inactivity-days:30}") int inactivityDays,
                       @org.springframework.beans.factory.annotation.Autowired(required = false) FirebaseAuth firebaseAuth) {
        this.users = users;
        this.customers = customers;
        this.riders = riders;
        this.admins = admins;
        this.revokedTokens = revokedTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.riderAutoApprove = riderAutoApprove;
        this.inactivityDays = inactivityDays;
        this.firebaseAuth = firebaseAuth;
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    // ------------------------------------------------------------ registration

    @Transactional
    public UserResponse registerCustomer(RegisterCustomerRequest req) {
        User user = createUser(req.firstName(), req.lastName(), req.email(),
                req.password(), req.confirmPassword(), Role.CUSTOMER, UserStatus.ACTIVE, false);
        CustomerProfile profile = new CustomerProfile();
        profile.setCustomerId(user.getId());
        customers.save(profile);
        issueQuietly(user, OtpPurpose.VERIFY_EMAIL);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse registerRider(RegisterRiderRequest req) {
        UserStatus status = riderAutoApprove ? UserStatus.ACTIVE : UserStatus.PENDING;
        User user = createUser(req.firstName(), req.lastName(), req.email(),
                req.password(), req.confirmPassword(), Role.RIDER, status, false);
        RiderProfile profile = new RiderProfile();
        profile.setRiderId(user.getId());
        profile.setVehicleType(VehicleType.fromValue(req.vehicleType()));
        profile.setPlateNumber(blankToNull(req.plateNumber()));
        profile.setLicenseNo(blankToNull(req.licenseNo()));
        riders.save(profile);
        issueQuietly(user, OtpPurpose.VERIFY_EMAIL);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse registerAdmin(RegisterAdminRequest req) {
        // Admins are created by another admin, so no email OTP is required.
        User user = createUser(req.firstName(), req.lastName(), req.email(),
                req.password(), req.confirmPassword(), Role.ADMIN, UserStatus.ACTIVE, true);
        AdminProfile profile = new AdminProfile();
        profile.setAdminId(user.getId());
        admins.save(profile);
        return UserResponse.from(user);
    }

    private User createUser(String firstName, String lastName, String email,
                            String rawPassword, String confirmPassword,
                            Role role, UserStatus status, boolean emailVerified) {
        if (rawPassword == null || !rawPassword.equals(confirmPassword)) {
            throw ApiException.badRequest("Password and confirmation do not match");
        }
        String normalized = normalizeEmail(email);
        if (users.existsByEmailIgnoreCase(normalized)) {
            throw ApiException.conflict("Email is already registered");
        }
        User user = new User();
        user.setEmail(normalized);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        user.setRole(role);
        user.setStatus(status);
        user.setEmailVerified(emailVerified);
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
        if (user.getPasswordHash() == null) {
            // Firebase-only account trying to log in with a password
            passwordEncoder.matches(req.password(), dummyHash);
            throw ApiException.unauthorized("This account uses Google sign-in. Use 'Continue with Google'.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        assertActive(user);

        // Password is correct from here on. Admins are exempt from OTP rules.
        if (user.getRole() != Role.ADMIN) {
            // 1) Email must be verified
            if (!user.isEmailVerified()) {
                issueQuietly(user, OtpPurpose.VERIFY_EMAIL);
                throw ApiException.forbidden(
                        "EMAIL_NOT_VERIFIED: Please verify your email. We sent a code to " + user.getEmail());
            }
            // 2) Inactive for N days -> security OTP
            if (isDormant(user)) {
                String otp = req.otp();
                if (otp == null || otp.isBlank()) {
                    issueQuietly(user, OtpPurpose.LOGIN);
                    throw ApiException.otpRequired(
                            "OTP_REQUIRED: You haven't logged in for a while. We sent a code to " + user.getEmail());
                }
                otpService.verify(user.getEmail(), OtpPurpose.LOGIN, otp);
            }
        }

        LocalDateTime now = LocalDateTime.now();
        user.setLastLoginAt(now);
        users.save(user);
        if (user.getRole() == Role.ADMIN) {
            admins.findById(user.getId()).ifPresent(a -> a.setLastLogin(now));
        }
        JwtService.IssuedToken token = jwtService.issue(user);
        return new AuthResponse(token.value(), "Bearer", token.expiresInSeconds(), UserResponse.from(user));
    }

    private boolean isDormant(User user) {
        LocalDateTime last = user.getLastLoginAt();
        // Legacy accounts with no recorded login are not challenged; their first login stamps the date.
        return last != null && last.isBefore(LocalDateTime.now().minusDays(inactivityDays));
    }

    // ------------------------------------------------------------- google login

    @Transactional
    public AuthResponse loginWithGoogle(GoogleAuthRequest req) {
        if (firebaseAuth == null) {
            throw ApiException.serviceUnavailable(
                    "Google sign-in is not configured on this server (Firebase credentials missing)");
        }
        FirebaseToken decoded;
        try {
            decoded = firebaseAuth.verifyIdToken(req.idToken());
        } catch (FirebaseAuthException e) {
            throw ApiException.unauthorized("Invalid Google sign-in token");
        }

        String uid = decoded.getUid();
        String email = decoded.getEmail();
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("Google account has no email; cannot continue");
        }
        boolean emailVerified = Boolean.TRUE.equals(decoded.isEmailVerified());
        String normalized = normalizeEmail(email);

        // 1) Prefer lookup by Firebase UID
        User user = users.findByFirebaseUid(uid).orElse(null);

        // 2) Fall back to email lookup — auto-link if safe
        if (user == null) {
            User byEmail = users.findByEmailIgnoreCase(normalized).orElse(null);
            if (byEmail != null) {
                if (!emailVerified) {
                    throw ApiException.forbidden(
                            "An account with this email already exists. Verify your Google email or log in with your password.");
                }
                if (byEmail.getFirebaseUid() != null && !byEmail.getFirebaseUid().equals(uid)) {
                    throw ApiException.conflict("This account is already linked to a different Google identity.");
                }
                byEmail.setFirebaseUid(uid);
                user = users.save(byEmail);
            }
        }

        // 3) Create a fresh account
        if (user == null) {
            user = new User();
            user.setEmail(normalized);
            user.setPasswordHash(null);
            user.setFirebaseUid(uid);
            applyGoogleName(user, decoded.getName(), normalized);
            user.setRole(Role.CUSTOMER);
            user.setStatus(UserStatus.ACTIVE);
            user.setEmailVerified(emailVerified);
            user = users.save(user);

            CustomerProfile profile = new CustomerProfile();
            profile.setCustomerId(user.getId());
            customers.save(profile);
        } else {
            // Google has verified this email, so we can trust it
            if (emailVerified && !user.isEmailVerified()) {
                user.setEmailVerified(true);
            }
            // Keep avatar fresh if Google provides one
            if (decoded.getPicture() != null && !decoded.getPicture().isBlank()) {
                user.setProfileImage(decoded.getPicture());
            }
            users.save(user);
        }

        assertActive(user);
        user.setLastLoginAt(LocalDateTime.now());
        users.save(user);
        JwtService.IssuedToken token = jwtService.issue(user);
        return new AuthResponse(token.value(), "Bearer", token.expiresInSeconds(), UserResponse.from(user));
    }

    private void applyGoogleName(User user, String fullName, String emailFallback) {
        String fn = "User";
        String ln = "Account";
        if (fullName != null && !fullName.isBlank()) {
            String[] parts = fullName.trim().split("\\s+", 2);
            fn = parts[0];
            ln = parts.length > 1 ? parts[1] : "";
        } else {
            // Fall back to email local-part
            String local = emailFallback.split("@")[0];
            fn = local;
            ln = "";
        }
        user.setFirstName(clamp(fn, 60));
        user.setLastName(clamp(ln.isBlank() ? "-" : ln, 60));
    }

    // ------------------------------------------------------- email verification

    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest req) {
        String email = normalizeEmail(req.email());
        otpService.verify(email, OtpPurpose.VERIFY_EMAIL, req.otp());
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.badRequest(INVALID_CODE));
        user.setEmailVerified(true);
        users.save(user);
        return new MessageResponse("Email verified. You can now log in.");
    }

    @Transactional
    public MessageResponse resendVerification(EmailRequest req) {
        users.findByEmailIgnoreCase(normalizeEmail(req.email()))
                .filter(u -> !u.isEmailVerified())
                .ifPresent(u -> issueQuietly(u, OtpPurpose.VERIFY_EMAIL));
        // Same answer whether or not the account exists, so emails can't be enumerated.
        return new MessageResponse("If the account exists and is unverified, a new code has been sent.");
    }

    // ---------------------------------------------------------- forgot password

    @Transactional
    public MessageResponse forgotPassword(EmailRequest req) {
        users.findByEmailIgnoreCase(normalizeEmail(req.email()))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .ifPresent(u -> issueQuietly(u, OtpPurpose.RESET_PASSWORD));
        return new MessageResponse("If an account exists for that email, a reset code has been sent.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest req) {
        if (!req.newPassword().equals(req.confirmPassword())) {
            throw ApiException.badRequest("Password and confirmation do not match");
        }
        String email = normalizeEmail(req.email());
        otpService.verify(email, OtpPurpose.RESET_PASSWORD, req.otp());
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.badRequest(INVALID_CODE));
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setEmailVerified(true); // they proved they own the inbox
        users.save(user);
        return new MessageResponse("Password updated. You can now log in.");
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

    /** Sends an OTP but never fails the caller (cooldown / Resend outage just get logged). */
    private void issueQuietly(User user, OtpPurpose purpose) {
        try {
            otpService.issue(user.getEmail(), user.getFirstName(), purpose);
        } catch (ApiException e) {
            log.warn("OTP ({}) not sent to user {}: {}", purpose, user.getId(), e.getMessage());
        }
    }

    private static void assertActive(User user) {
        switch (user.getStatus()) {
            case PENDING   -> throw ApiException.forbidden("Your account is pending approval");
            case SUSPENDED -> throw ApiException.forbidden("Your account has been suspended");
            case INACTIVE  -> throw ApiException.forbidden("Your account is inactive");
            case ACTIVE    -> { }
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String clamp(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}