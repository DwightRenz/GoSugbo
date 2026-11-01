package com.example.GoSugbo.services;

import com.example.GoSugbo.repository.OtpTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class OtpCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(OtpCleanupJob.class);
    private final OtpTokenRepository otps;

    public OtpCleanupJob(OtpTokenRepository otps) {
        this.otps = otps;
    }

    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    public void purgeExpired() {
        int removed = otps.deleteExpired(LocalDateTime.now());
        if (removed > 0) log.info("Removed {} expired OTP rows", removed);
    }
}