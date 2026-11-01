package com.example.GoSugbo.services;

import com.example.GoSugbo.entity.OtpPurpose;
import com.example.GoSugbo.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final WebClient client;
    private final String apiKey;
    private final String from;
    private final long timeoutMs;

    public EmailService(@Value("${resend.base-url:https://api.resend.com}") String baseUrl,
                        @Value("${resend.api-key:}") String apiKey,
                        @Value("${resend.from-email:GoSugbo <onboarding@resend.dev>}") String from,
                        @Value("${resend.timeout-ms:5000}") long timeoutMs) {
        // Own client on purpose: avoids clashing with the WebClient bean from PayMongoConfig.
        this.client = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.USER_AGENT, "GoSugbo-Backend/1.0") // Resend rejects requests without one
                .build();
        this.apiKey = apiKey;
        this.from = from;
        this.timeoutMs = timeoutMs;
    }

    public void sendOtp(String to, String name, String code, OtpPurpose purpose, int expiryMinutes) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[DEV] Resend API key not set. OTP for {} ({}): {}", to, purpose, code);
            return;
        }

        String subject;
        String intro;
        switch (purpose) {
            case VERIFY_EMAIL -> {
                subject = "Verify your GoSugbo email";
                intro = "Use this code to verify your email address.";
            }
            case RESET_PASSWORD -> {
                subject = "Reset your GoSugbo password";
                intro = "Use this code to reset your password.";
            }
            default -> {
                subject = "Your GoSugbo security code";
                intro = "We noticed you haven't signed in for a while. Use this code to confirm it's you.";
            }
        }

        String html = """
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
                  <h2 style="margin:0 0 12px">Hi %s,</h2>
                  <p>%s</p>
                  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0">%s</p>
                  <p>This code expires in %d minutes. If you didn't request it, you can ignore this email.</p>
                  <p style="color:#888;font-size:12px">Never share this code with anyone.</p>
                </div>
                """.formatted(escape(name), intro, code, expiryMinutes);

        try {
            client.post()
                    .uri("/emails")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of(
                            "from", from,
                            "to", List.of(to),
                            "subject", subject,
                            "html", html))
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofMillis(timeoutMs));
        } catch (WebClientResponseException e) {
            // Resend's JSON body explains exactly why it refused (e.g. sandbox recipient restriction)
            log.error("Resend rejected email to {}: {} {}",
                    to, e.getStatusCode(), e.getResponseBodyAsString());
            throw ApiException.serviceUnavailable("Could not send the email right now. Please try again shortly.");
        } catch (Exception e) {
            log.error("Resend email failed for {}: {}", to, e.getMessage());
            throw ApiException.serviceUnavailable("Could not send the email right now. Please try again shortly.");
        }
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}