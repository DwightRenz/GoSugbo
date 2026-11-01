package com.example.GoSugbo.services;

import com.example.GoSugbo.entity.OtpPurpose;
import com.example.GoSugbo.entity.OtpToken;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.OtpTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class OtpService {

    private static final String INVALID = "Invalid or expired code";

    private final OtpTokenRepository otps;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final int expiryMinutes;
    private final int maxAttempts;
    private final int cooldownSeconds;
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpTokenRepository otps,
                      PasswordEncoder passwordEncoder,
                      EmailService emailService,
                      @Value("${app.otp.expiry-minutes:10}") int expiryMinutes,
                      @Value("${app.otp.max-attempts:5}") int maxAttempts,
                      @Value("${app.otp.resend-cooldown-seconds:60}") int cooldownSeconds) {
        this.otps = otps;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.expiryMinutes = expiryMinutes;
        this.maxAttempts = maxAttempts;
        this.cooldownSeconds = cooldownSeconds;
    }

    /** Creates a fresh OTP (replacing any previous one for the same email+purpose) and emails it. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void issue(String email, String firstName, OtpPurpose purpose) {
        LocalDateTime now = LocalDateTime.now();

        var previous = otps.findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, purpose);
        if (previous.isPresent() && previous.get().getCreatedAt().isAfter(now.minusSeconds(cooldownSeconds))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait a moment before requesting another code");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));

        otps.deleteAllFor(email, purpose);
        OtpToken token = new OtpToken();
        token.setEmail(email);
        token.setPurpose(purpose);
        token.setCodeHash(passwordEncoder.encode(code));
        token.setAttempts(0);
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusMinutes(expiryMinutes));
        otps.save(token);

        emailService.sendOtp(email, firstName, code, purpose, expiryMinutes);
    }

    /** Checks the code. Consumes it on success; counts the attempt on failure. */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ApiException.class)
    public void verify(String email, OtpPurpose purpose, String code) {
        if (code == null || code.isBlank()) {
            throw ApiException.badRequest(INVALID);
        }
        OtpToken token = otps.findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> ApiException.badRequest(INVALID));

        if (token.getExpiresAt().isBefore(LocalDateTime.now()) || token.getAttempts() >= maxAttempts) {
            otps.delete(token);
            throw ApiException.badRequest(INVALID);
        }
        if (!passwordEncoder.matches(code.trim(), token.getCodeHash())) {
            token.setAttempts(token.getAttempts() + 1);
            otps.save(token);
            throw ApiException.badRequest(INVALID);
        }
        otps.delete(token); // single use
    }
}