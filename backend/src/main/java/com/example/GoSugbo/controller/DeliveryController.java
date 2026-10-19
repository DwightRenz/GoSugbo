package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.DeliveryDtos.*;
import com.example.GoSugbo.dto.OrderDtos.OrderSummaryResponse;
import com.example.GoSugbo.services.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/deliveries")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Deliveries", description = "Rider job board, assignment and delivery tracking")
public class DeliveryController {

    private final DeliveryService deliveryService;

    // ---------------------------------------------------------------- rider

    @GetMapping("/available")
    @PreAuthorize("hasRole('RIDER')")
    @Operation(summary = "List orders waiting for a rider",
            description = "Rider only. Orders in 'ready_for_pickup' with no rider yet, oldest first. "
                    + "Shows pickup (store) details and the customer's city only.")
    public Page<AvailableOrderResponse> available(Pageable pageable) {
        return deliveryService.listAvailable(pageable);
    }

    @PostMapping("/orders/{orderId}/accept")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RIDER')")
    @Operation(summary = "Accept an available order",
            description = "Rider only. Rider must be online and have no other active delivery. "
                    + "Returns 409 if another rider took the order first.")
    public DeliveryResponse accept(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                   @PathVariable Integer orderId) {
        return deliveryService.accept(AddressController.currentUserId(jwt), orderId);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('RIDER')")
    @Operation(summary = "Update delivery status",
            description = "Assigned rider only. Allowed transitions:\n"
                    + "assigned → accepted|cancelled\n"
                    + "accepted → arrived_store|cancelled\n"
                    + "arrived_store → picked_up|cancelled\n"
                    + "picked_up → in_transit|failed\n"
                    + "in_transit → arrived_customer|failed\n"
                    + "arrived_customer → completed|failed\n"
                    + "The order status is synced automatically (picked_up, in_transit, delivered). "
                    + "Completing a COD delivery marks the payment as paid.")
    public DeliveryResponse updateStatus(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                         @PathVariable Integer id,
                                         @Valid @RequestBody UpdateDeliveryStatusRequest request) {
        return deliveryService.updateStatus(AddressController.currentUserId(jwt), id, request);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('RIDER')")
    @Operation(summary = "My delivery history", description = "Rider only. Most recent first.")
    public Page<DeliveryResponse> mine(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                       Pageable pageable) {
        return deliveryService.listMine(AddressController.currentUserId(jwt), pageable);
    }

    @GetMapping("/mine/active")
    @PreAuthorize("hasRole('RIDER')")
    @Operation(summary = "My current active delivery", description = "Rider only. 404 if none.")
    public DeliveryResponse active(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return deliveryService.getActive(AddressController.currentUserId(jwt));
    }

    // ---------------------------------------------------------------- admin

    @PostMapping("/orders/{orderId}/assign")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Assign a rider to an order",
            description = "Admin only. Order must be 'preparing' or 'ready_for_pickup' with no rider. "
                    + "The delivery starts as 'assigned' and the rider moves it to 'accepted'.")
    public DeliveryResponse assign(@PathVariable Integer orderId,
                                   @Valid @RequestBody AssignRiderRequest request) {
        return deliveryService.assign(orderId, request.riderId());
    }

    // ------------------------------------------------- customer / rider / admin

    @GetMapping("/orders/{orderId}")
    @Operation(summary = "Get the delivery for an order",
            description = "Visible to the customer, the assigned rider, the store owner and admins.")
    public DeliveryResponse forOrder(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                     @PathVariable Integer orderId) {
        int callerId = AddressController.currentUserId(jwt);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(jwt.getClaimAsString("role"));
        return deliveryService.getForOrder(callerId, isAdmin, orderId);
    }
}