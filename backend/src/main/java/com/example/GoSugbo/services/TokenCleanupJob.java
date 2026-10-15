package com.example.GoSugbo.services;

import com.example.GoSugbo.repository.RevokedTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Slf4j
@Component
@RequiredArgsConstructor
public class TokenCleanupJob {

    private final RevokedTokenRepository revokedTokens;

    @Scheduled(cron = "0 0 * * * *")
    public void purgeExpired() {
        int removed = revokedTokens.deleteExpired(LocalDateTime.now(ZoneOffset.UTC));
        if (removed > 0) log.info("Purged {} expired revoked tokens", removed);
    }
}