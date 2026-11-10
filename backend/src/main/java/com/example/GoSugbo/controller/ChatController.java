package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.ChatDtos.ChatMessageResponse;
import com.example.GoSugbo.dto.ChatDtos.SendMessageRequest;
import com.example.GoSugbo.services.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rides/{rideId}/chat")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Ride Chat", description = "In-ride chat between customer and rider")
public class ChatController {

    private final ChatService chatService;

    @GetMapping
    @Operation(summary = "Fetch chat history for a ride",
            description = "Visible to the ride's customer, assigned rider, and admins.")
    public List<ChatMessageResponse> history(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer rideId) {
        int callerId = AddressController.currentUserId(jwt);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(jwt.getClaimAsString("role"));
        return chatService.history(callerId, isAdmin, rideId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send a chat message",
            description = "Customer or assigned rider only. Rejected once the ride reaches a terminal state.")
    public ChatMessageResponse send(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer rideId,
            @Valid @RequestBody SendMessageRequest req) {
        return chatService.send(AddressController.currentUserId(jwt), rideId, req);
    }
}