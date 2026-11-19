package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.AuthDtos.MessageResponse;
import com.example.GoSugbo.dto.ErrorResponse;
import com.example.GoSugbo.dto.NotificationDtos.*;
import com.example.GoSugbo.services.NotificationService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Device token registration and push notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notifications;

    @PostMapping("/tokens")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Register a device FCM token",
            description = "Call after login and whenever the FCM token is refreshed.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Token registered"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing/invalid token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public void register(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                         @Valid @RequestBody RegisterTokenRequest req) {
        int userId = Integer.parseInt(jwt.getSubject());
        notifications.registerToken(userId, req.token(), req.platform(), req.deviceInfo());
    }

    @DeleteMapping("/tokens")
    @Operation(summary = "Unregister a device FCM token",
            description = "Call on logout so this device stops receiving pushes.")
    public MessageResponse unregister(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody UnregisterTokenRequest req) {
        int userId = Integer.parseInt(jwt.getSubject());
        notifications.unregisterToken(userId, req.token());
        return new MessageResponse("Token removed");
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Send a test push (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Send result",
                    content = @Content(schema = @Schema(implementation = NotificationResult.class))),
            @ApiResponse(responseCode = "403", description = "Caller is not an admin",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public NotificationResult test(@Valid @RequestBody TestNotificationRequest req) {
        return notifications.sendToUserOrThrow(req.userId(), req.title(), req.body(), req.data());
    }
}