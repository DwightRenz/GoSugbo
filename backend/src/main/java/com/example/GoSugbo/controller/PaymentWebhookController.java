package com.example.GoSugbo.controller;

import com.example.GoSugbo.services.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentWebhookController {

    private final OrderService orderService;

    @Value("${paymongo.webhook-secret:}")
    private String webhookSecret;

    private static final String HMAC_SHA256 = "HmacSHA256";

    @PostMapping("/webhook")
    public ResponseEntity<String> handlePayMongoWebhook(
            @RequestHeader(value = "Paymongo-Signature", required = false) String signatureHeader,
            @RequestBody String rawBody) {

        // 1. Verify signature if a secret is configured.
        //    In local dev with no secret, we log a warning and skip (still allows testing).
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (signatureHeader == null || signatureHeader.isBlank()) {
                log.warn("PayMongo webhook rejected: missing Paymongo-Signature header");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing signature");
            }
            if (!isValidSignature(rawBody, signatureHeader, webhookSecret)) {
                log.warn("PayMongo webhook rejected: invalid signature");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
            }
        } else {
            log.warn("PAYMONGO_WEBHOOK_SECRET not set — skipping signature verification (dev only)");
        }

        // 2. Parse & handle event.
        try {
            Map<?, ?> payload = parseJson(rawBody);
            if (payload == null) {
                return ResponseEntity.badRequest().body("Invalid JSON");
            }
            Map<?, ?> data = (Map<?, ?>) payload.get("data");
            if (data == null) return ResponseEntity.ok("No data");

            Map<?, ?> attributes = (Map<?, ?>) data.get("attributes");
            if (attributes == null) return ResponseEntity.ok("No attributes");

            String eventType = (String) attributes.get("type");
            log.info("PayMongo webhook received: {}", eventType);

            if ("payment.paid".equals(eventType) || "checkout_session.payment.paid".equals(eventType)) {
                Map<?, ?> resource = (Map<?, ?>) attributes.get("data");
                if (resource == null) return ResponseEntity.ok("No resource");

                Map<?, ?> resourceAttrs = (Map<?, ?>) resource.get("attributes");
                if (resourceAttrs == null) return ResponseEntity.ok("No resource attributes");

                // Try to extract the reference_number first (we set it to the order code).
                String referenceNo = (String) resourceAttrs.get("reference_number");

                // Fallback: pull "ORD-..." out of the description field.
                if (referenceNo == null) {
                    Object desc = resourceAttrs.get("description");
                    if (desc instanceof String s && s.contains("ORD-")) {
                        referenceNo = s.substring(s.indexOf("ORD-")).trim();
                    }
                }

                log.info("PayMongo payment reference: {}", referenceNo);

                if (referenceNo != null) {
                    orderService.markPaymentPaidByReference(referenceNo);
                }
            }
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("PayMongo webhook processing failed", e);
            // Return 200 so PayMongo doesn't retry endlessly on a malformed event.
            return ResponseEntity.ok("Processed with errors");
        }
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Verifies the PayMongo signature header.
     * Format: t=<timestamp>,te=<test_mode_sig>,li=<live_mode_sig>
     * We compute HMAC-SHA256 over "<timestamp>.<rawBody>" using the webhook secret.
     */
    private boolean isValidSignature(String rawBody, String header, String secret) {
        try {
            String timestamp = null;
            String testSig = null;
            String liveSig = null;

            for (String part : header.split(",")) {
                String[] kv = part.split("=", 2);
                if (kv.length != 2) continue;
                switch (kv[0].trim()) {
                    case "t"  -> timestamp = kv[1].trim();
                    case "te" -> testSig   = kv[1].trim();
                    case "li" -> liveSig   = kv[1].trim();
                }
            }

            if (timestamp == null) {
                log.warn("Signature header missing 't' component");
                return false;
            }
            // Reject events older than 5 minutes to prevent replay attacks.
            try {
                long ts = Long.parseLong(timestamp);
                long now = System.currentTimeMillis() / 1000L;
                if (Math.abs(now - ts) > 300) {
                    log.warn("Signature timestamp too far from now: {} vs {}", ts, now);
                    return false;
                }
            } catch (NumberFormatException e) {
                log.warn("Signature header 't' is not a number: {}", timestamp);
                return false;
            }

            String signedPayload = timestamp + "." + rawBody;
            String expected = hmacSha256Hex(signedPayload, secret);

            // Compare with either te= (test mode) or li= (live mode).
            return constantTimeEquals(expected, testSig)
                    || constantTimeEquals(expected, liveSig);
        } catch (Exception e) {
            log.error("Signature verification error", e);
            return false;
        }
    }

    private static String hmacSha256Hex(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance(HMAC_SHA256);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }

    private static Map<?, ?> parseJson(String body) {
        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(body, Map.class);
        } catch (Exception e) {
            return null;
        }
    }
}