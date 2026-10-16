package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.Order;
import com.example.GoSugbo.entity.OrderItem;
import com.example.GoSugbo.entity.Payment;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {}

    // ---------------------------------------------------------------- requests

    @Schema(description = "One line item in a CreateOrderRequest")
    public record OrderItemRequest(
            @Schema(example = "42") @NotNull Integer productId,

            @Schema(example = "2") @NotNull @Min(1) @Max(999) Integer quantity) {}

    @Schema(description = "Place a new order. Customer only.")
    public record CreateOrderRequest(
            @Schema(example = "7",
                    description = "Address id owned by the caller. Must exist.")
            @NotNull Integer addressId,

            @Schema(description = "Items to order. All products must belong to the same store.")
            @NotNull @Size(min = 1, max = 50) @Valid List<OrderItemRequest> items,

            @Schema(example = "50.00", nullable = true,
                    description = "Optional delivery fee. Defaults to 0.00.")
            @DecimalMin(value = "0.00", inclusive = true)
            @Digits(integer = 8, fraction = 2) BigDecimal deliveryFee,

            @Schema(example = "20.00", nullable = true,
                    description = "Optional discount. Defaults to 0.00.")
            @DecimalMin(value = "0.00", inclusive = true)
            @Digits(integer = 8, fraction = 2) BigDecimal discount,

            @Schema(example = "cod", allowableValues = {"cod","cash","card","gcash","maya","bank_transfer"},
                    nullable = true, description = "Payment method. Defaults to cod.")
            @Pattern(regexp = "cod|cash|card|gcash|maya|bank_transfer",
                    message = "method must be one of: cod, cash, card, gcash, maya, bank_transfer")
            String paymentMethod,

            @Schema(example = "Please include extra napkins.", nullable = true)
            @Size(max = 500) String notes) {}

    @Schema(description = "Update an order's status (store owner only)")
    public record UpdateOrderStatusRequest(
            @Schema(example = "confirmed",
                    allowableValues = {"pending","confirmed","preparing","ready_for_pickup",
                            "picked_up","in_transit","delivered","cancelled","refunded"})
            @NotBlank String status) {}

    @Schema(description = "Cancel an order (customer on own order, or store owner)")
    public record CancelOrderRequest(
            @Schema(example = "Changed my mind.", nullable = true)
            @Size(max = 500) String reason) {}

    // --------------------------------------------------------------- responses

    @Schema(description = "One line item of an order")
    public record OrderItemResponse(
            Integer id,
            Integer productId,
            String productName,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal) {

        public static OrderItemResponse from(OrderItem i) {
            return new OrderItemResponse(
                    i.getItemId(), i.getProductId(), i.getProductName(),
                    i.getQuantity(), i.getUnitPrice(), i.getLineTotal());
        }
    }

    @Schema(description = "Payment summary attached to an order")
    public record PaymentSummary(
            Integer id,
            @Schema(allowableValues = {"cod","cash","card","gcash","maya","bank_transfer"}) String method,
            BigDecimal amount,
            @Schema(allowableValues = {"pending","paid","failed","refunded"}) String status,
            String referenceNo,
            LocalDateTime paidAt) {

        public static PaymentSummary from(Payment p) {
            return new PaymentSummary(
                    p.getPaymentId(), p.getMethod().getValue(), p.getAmount(),
                    p.getStatus().getValue(), p.getReferenceNo(), p.getPaidAt());
        }
    }

    @Schema(description = "Order summary without line items")
    public record OrderSummaryResponse(
            Integer id,
            String orderCode,
            Integer customerId,
            Integer storeId,
            Integer addressId,
            Integer riderId,
            @Schema(allowableValues = {"pending","confirmed","preparing","ready_for_pickup",
                    "picked_up","in_transit","delivered","cancelled","refunded"}) String status,
            BigDecimal subtotal,
            BigDecimal deliveryFee,
            BigDecimal discount,
            BigDecimal totalAmount,
            String notes,
            LocalDateTime placedAt,
            LocalDateTime updatedAt) {

        public static OrderSummaryResponse from(Order o) {
            return new OrderSummaryResponse(
                    o.getOrderId(), o.getOrderCode(), o.getCustomerId(), o.getStoreId(),
                    o.getAddressId(), o.getRiderId(), o.getStatus().getValue(),
                    o.getSubtotal(), o.getDeliveryFee(), o.getDiscount(), o.getTotalAmount(),
                    o.getNotes(), o.getPlacedAt(), o.getUpdatedAt());
        }
    }

    @Schema(description = "Full order detail including line items and payment")
    public record OrderResponse(
            Integer id,
            String orderCode,
            Integer customerId,
            Integer storeId,
            Integer addressId,
            Integer riderId,
            @Schema(allowableValues = {"pending","confirmed","preparing","ready_for_pickup",
                    "picked_up","in_transit","delivered","cancelled","refunded"}) String status,
            BigDecimal subtotal,
            BigDecimal deliveryFee,
            BigDecimal discount,
            BigDecimal totalAmount,
            String notes,
            List<OrderItemResponse> items,
            PaymentSummary payment,
            LocalDateTime placedAt,
            LocalDateTime updatedAt) {

        public static OrderResponse from(Order o, List<OrderItem> items, Payment payment) {
            return new OrderResponse(
                    o.getOrderId(), o.getOrderCode(), o.getCustomerId(), o.getStoreId(),
                    o.getAddressId(), o.getRiderId(), o.getStatus().getValue(),
                    o.getSubtotal(), o.getDeliveryFee(), o.getDiscount(), o.getTotalAmount(),
                    o.getNotes(),
                    items == null ? List.of() : items.stream().map(OrderItemResponse::from).toList(),
                    payment == null ? null : PaymentSummary.from(payment),
                    o.getPlacedAt(), o.getUpdatedAt());
        }
    }
}