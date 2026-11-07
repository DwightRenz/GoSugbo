package com.example.GoSugbo.controller;

import com.example.GoSugbo.entity.Payment;
import com.example.GoSugbo.entity.PaymentStatus;
import com.example.GoSugbo.repository.PaymentRepository;
import com.example.GoSugbo.services.TrackingBroadcaster;
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
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentWebhookController {

    private final PaymentRepository payments;
    private final TrackingBroadcaster broadcaster;

    @Value("${paymongo.webhook-secret:}")
    private String webhookSecret;

    private static final String HMAC_SHA256 = "HmacSHA256";

    @PostMapping("/webhook")
    public ResponseEntity<String> handlePayMongoWebhook(
            @RequestHeader(value = "Paymongo-Signature", required = false) String signatureHeader,
            @RequestBody String rawBody) {

        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (signatureHeader == null || signatureHeader.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing signature");
            }
            if (!isValidSignature(rawBody, signatureHeader, webhookSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
            }
        }

        try {
            Map<?, ?> payload = parseJson(rawBody);
            if (payload == null) return ResponseEntity.badRequest().body("Invalid JSON");

            Map<?, ?> data = (Map<?, ?>) payload.get("data");
            if (data == null) return ResponseEntity.ok("No data");
            Map<?, ?> attributes = (Map<?, ?>) data.get("attributes");
            if (attributes == null) return ResponseEntity.ok("No attributes");

            String eventType = (String) attributes.get("type");
            log.info("PayMongo webhook received: {}", eventType);

            if ("payment.paid".equals(eventType)
                    || "checkout_session.payment.paid".equals(eventType)
                    || "payment_intent.succeeded".equals(eventType)) {

                Map<?, ?> resource = (Map<?, ?>) attributes.get("data");
                if (resource == null) return ResponseEntity.ok("No resource");
                Map<?, ?> attrs = (Map<?, ?>) resource.get("attributes");
                if (attrs == null) return ResponseEntity.ok("No attributes");

                String reference = extractReference(attrs);
                log.info("PayMongo payment reference: {}", reference);

                if (reference != null) {
                    markPaid(reference);
                }
            }
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("PayMongo webhook processing failed", e);
            return ResponseEntity.ok("Processed with errors");
        }
    }

    private void markPaid(String reference) {
        payments.findByReferenceNo(reference).ifPresent(p -> {
            if (p.getStatus() == PaymentStatus.PAID) return;
            p.setStatus(PaymentStatus.PAID);
            p.setPaidAt(LocalDateTime.now());
            payments.save(p);
            if (p.getRideId() != null) {
                broadcaster.paymentPaid(p.getRideId(), null, "paid");
            } else if (p.getOrderId() != null) {
                broadcaster.paymentPaid(null, p.getOrderId(), "paid");
            }
            log.info("Payment {} marked PAID for reference {}", p.getPaymentId(), reference);
        });
    }

    private static String extractReference(Map<?, ?> attrs) {
        Object meta = attrs.get("metadata");
        if (meta instanceof Map<?, ?> m && m.get("reference") instanceof String s && !s.isBlank()) {
            return s;
        }
        if (attrs.get("reference_number") instanceof String s && !s.isBlank()) {
            return s;
        }
        if (attrs.get("description") instanceof String s) {
            int i = s.indexOf("ORD-");
            if (i >= 0) return s.substring(i).trim();
            i = s.indexOf("RIDE-");
            if (i >= 0) return s.substring(i).trim();
        }
        return null;
    }

    private boolean isValidSignature(String rawBody, String header, String secret) {
        try {
            String timestamp = null, testSig = null, liveSig = null;
            for (String part : header.split(",")) {
                String[] kv = part.split("=", 2);
                if (kv.length != 2) continue;
                switch (kv[0].trim()) {
                    case "t"  -> timestamp = kv[1].trim();
                    case "te" -> testSig   = kv[1].trim();
                    case "li" -> liveSig   = kv[1].trim();
                }
            }
            if (timestamp == null) return false;
            String signed = timestamp + "." + rawBody;
            String expected = hmacSha256Hex(signed, secret);
            return constantTimeEquals(expected, testSig) || constantTimeEquals(expected, liveSig);
        } catch (Exception e) {
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
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
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