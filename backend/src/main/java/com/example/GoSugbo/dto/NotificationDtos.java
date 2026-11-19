package com.example.GoSugbo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Map;

public final class NotificationDtos {

    private NotificationDtos() {}

    @Schema(description = "Register (or refresh) a device FCM token for the logged-in user")
    public record RegisterTokenRequest(
            @Schema(description = "FCM registration token from the client SDK")
            @NotBlank @Size(max = 500) String token,
            @Schema(example = "android", allowableValues = {"android", "ios", "web"})
            @Pattern(regexp = "android|ios|web", message = "platform must be android, ios or web")
            String platform,
            @Schema(example = "Pixel 7 / Android 14", nullable = true)
            @Size(max = 255) String deviceInfo) {}

    @Schema(description = "Remove a device FCM token (call on logout)")
    public record UnregisterTokenRequest(
            @Schema(description = "FCM registration token to remove")
            @NotBlank @Size(max = 500) String token) {}

    @Schema(description = "Admin-only test push")
    public record TestNotificationRequest(
            @Schema(example = "3") Integer userId,
            @Schema(example = "Hello from GoSugbo") @NotBlank @Size(max = 200) String title,
            @Schema(example = "This is a test push") @NotBlank @Size(max = 1000) String body,
            @Schema(nullable = true, description = "Optional key/value data payload")
            Map<String, String> data) {}

    @Schema(description = "Result of a notification send")
    public record NotificationResult(
            @Schema(example = "1") int successCount,
            @Schema(example = "0") int failureCount,
            @Schema(nullable = true) String message) {}
}