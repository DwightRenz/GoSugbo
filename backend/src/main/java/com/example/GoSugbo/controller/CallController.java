package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.CallDtos.CallSession;
import com.example.GoSugbo.dto.CallDtos.CallSignal;
import com.example.GoSugbo.dto.CallDtos.RelayRequest;
import com.example.GoSugbo.services.CallService;
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

@RestController
@RequestMapping("/api/rides/{rideId}/call")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Ride Voice Call", description = "WebRTC signaling between customer and rider")
public class CallController {

    private final CallService callService;

    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Start a voice call for a ride",
            description = "Customer or assigned rider. Returns the call session; both sides receive "
                    + "a `ringing` signal on /topic/rides/{rideId}/call.")
    public CallSession start(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer rideId) {
        return callService.start(AddressController.currentUserId(jwt), rideId);
    }

    @PostMapping("/relay")
    @Operation(summary = "Relay an SDP / ICE / hangup signal",
            description = "Both parties post here. The server broadcasts to /topic/rides/{rideId}/call. "
                    + "Signal types: offer, answer, ice, hangup, reject.")
    public CallSignal relay(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer rideId,
            @Valid @RequestBody RelayRequest req) {
        return callService.relay(AddressController.currentUserId(jwt), rideId, req);
    }
}