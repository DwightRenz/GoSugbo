package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.ErrorResponse;
import com.example.GoSugbo.dto.OrderDtos.*;
import com.example.GoSugbo.entity.OrderStatus;
import com.example.GoSugbo.services.OrderService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Orders", description = "Customer order placement, tracking and store-owner management")
public class OrderController {

    private final OrderService orderService;

    // ------------------------------------------------------------ customer

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Place a new order",
            description = "Customer only. All items must belong to the same store and the store must be active. "
                    + "Stock is decremented immediately; if any line has insufficient stock the whole order fails. "
                    + "A payment row is created automatically with status='pending' and the chosen method "
                    + "(default 'cod'). The order starts in status='pending'.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Order created",
                    content = @Content(schema = @Schema(implementation = OrderResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed, bad address, mixed stores or inactive product",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing, invalid, expired or revoked token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller is not a customer",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Insufficient stock",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public OrderResponse create(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                @Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(AddressController.currentUserId(jwt), request);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "List my orders",
            description = "Customer only. Returns a page of order summaries, most recent first. "
                    + "Use ?page=0&size=20 on the query string.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of order summaries",
                    content = @Content(schema = @Schema(implementation = OrderSummaryResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller is not a customer",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public Page<OrderSummaryResponse> mine(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                           Pageable pageable) {
        return orderService.listMine(AddressController.currentUserId(jwt), pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an order by id",
            description = "Returns full detail (items + payment). Callers may view their own orders; "
                    + "admins may view any order. Store owners and riders must use their dedicated endpoints.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Order detail",
                    content = @Content(schema = @Schema(implementation = OrderResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this order",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Order not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public OrderResponse get(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                             @PathVariable Integer id) {
        int callerId = AddressController.currentUserId(jwt);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(jwt.getClaimAsString("role"));
        return orderService.getDetail(callerId, isAdmin, id);
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancel an order",
            description = "Customer (own order) or store owner. Allowed only while the order is still "
                    + "'pending' or 'confirmed'. Stock of every line item is restored. "
                    + "If a reason is provided it is appended to the order notes.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Order cancelled",
                    content = @Content(schema = @Schema(implementation = OrderSummaryResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller has no access to this order",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Order not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Order can no longer be cancelled",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public OrderSummaryResponse cancel(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                       @PathVariable Integer id,
                                       @Valid @RequestBody CancelOrderRequest request) {
        return orderService.cancel(AddressController.currentUserId(jwt), id, request);
    }

    // --------------------------------------------------------- NEW: PayMongo

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Initiate PayMongo checkout",
            description = "Creates a PayMongo Checkout Session for this order and returns the URL "
                    + "the customer should be redirected to. After paying, PayMongo will hit the "
                    + "webhook at /api/payments/webhook to mark the payment as paid.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Checkout URL created",
                    content = @Content(schema = @Schema(implementation = CheckoutResponse.class))),
            @ApiResponse(responseCode = "400", description = "PayMongo rejected the request",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this order",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Order or payment not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Order already paid or not payable",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public CheckoutResponse pay(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                @PathVariable Integer id,
                                @RequestParam String successUrl,
                                @RequestParam String cancelUrl) {
        return orderService.initiatePayMongoCheckout(
                AddressController.currentUserId(jwt), id, successUrl, cancelUrl);
    }

    // --------------------------------------------------------- store owner

    @GetMapping("/stores/{storeId}")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "List orders for a store",
            description = "Store owner only. Optionally filter by status "
                    + "(?status=pending|confirmed|preparing|ready_for_pickup|picked_up|"
                    + "in_transit|delivered|cancelled|refunded).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of order summaries",
                    content = @Content(schema = @Schema(implementation = OrderSummaryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unknown status filter",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public Page<OrderSummaryResponse> listForStore(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer storeId,
            @RequestParam(name = "status", required = false) String status,
            Pageable pageable) {

        OrderStatus filter = null;
        if (status != null && !status.isBlank()) {
            try {
                filter = OrderStatus.fromValue(status);
            } catch (IllegalArgumentException ex) {
                throw com.example.GoSugbo.exception.ApiException.badRequest(
                        "Unknown status filter: " + status);
            }
        }
        return orderService.listForStore(AddressController.currentUserId(jwt), storeId, filter, pageable);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Update an order's status",
            description = "Store owner only. Transitions are validated against a state machine:\n"
                    + "pending → confirmed|cancelled\n"
                    + "confirmed → preparing|cancelled\n"
                    + "preparing → ready_for_pickup|cancelled\n"
                    + "ready_for_pickup → picked_up|cancelled\n"
                    + "picked_up → in_transit\n"
                    + "in_transit → delivered\n"
                    + "delivered → refunded\n"
                    + "cancelled / refunded are terminal. Use PATCH /cancel for cancellations.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated",
                    content = @Content(schema = @Schema(implementation = OrderSummaryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unknown status value",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Order not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Transition not allowed from current status",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public OrderSummaryResponse updateStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        return orderService.updateStatus(AddressController.currentUserId(jwt), id, request.status());
    }
}