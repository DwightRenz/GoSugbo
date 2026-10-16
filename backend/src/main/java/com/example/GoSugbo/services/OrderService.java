package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.OrderDtos.*;
import com.example.GoSugbo.entity.*;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final int CODE_SUFFIX_LEN = 4;
    private static final int CODE_MAX_ATTEMPTS = 5;

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
            OrderStatus.PENDING,          Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED,        Set.of(OrderStatus.PREPARING, OrderStatus.CANCELLED),
            OrderStatus.PREPARING,        Set.of(OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED),
            OrderStatus.READY_FOR_PICKUP, Set.of(OrderStatus.PICKED_UP, OrderStatus.CANCELLED),
            OrderStatus.PICKED_UP,        Set.of(OrderStatus.IN_TRANSIT),
            OrderStatus.IN_TRANSIT,       Set.of(OrderStatus.DELIVERED),
            OrderStatus.DELIVERED,        Set.of(OrderStatus.REFUNDED),
            OrderStatus.CANCELLED,        Set.of(),
            OrderStatus.REFUNDED,         Set.of()
    );

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final PaymentRepository payments;
    private final ProductRepository products;
    private final AddressRepository addresses;
    private final StoreService storeService;

    // ------------------------------------------------------------------ create

    @Transactional
    public OrderResponse create(int customerId, CreateOrderRequest req) {
        addresses.findByAddressIdAndUserId(req.addressId(), customerId)
                .orElseThrow(() -> ApiException.badRequest("Delivery address does not belong to you"));

        List<OrderItemRequest> lines = req.items();
        Map<Integer, Product> productById = new LinkedHashMap<>();
        Integer storeId = null;

        for (OrderItemRequest line : lines) {
            Product p = products.findById(line.productId())
                    .orElseThrow(() -> ApiException.badRequest(
                            "Product not found: " + line.productId()));
            if (!p.isActive()) {
                throw ApiException.badRequest("Product is inactive: " + p.getName());
            }
            if (storeId == null) {
                storeId = p.getStoreId();
            } else if (!storeId.equals(p.getStoreId())) {
                throw ApiException.badRequest("All items must come from the same store");
            }
            productById.putIfAbsent(p.getProductId(), p);
        }

        Store store = storeService.require(storeId);
        if (store.getStatus() != StoreStatus.ACTIVE) {
            throw ApiException.badRequest("Store is not accepting orders right now");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> itemEntities = new ArrayList<>(lines.size());

        for (OrderItemRequest line : lines) {
            Product p = productById.get(line.productId());
            int qty = line.quantity();

            int updated = products.decrementStock(p.getProductId(), qty);
            if (updated == 0) {
                throw ApiException.conflict("Insufficient stock for product: " + p.getName());
            }

            BigDecimal unitPrice = p.getPrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
            subtotal = subtotal.add(lineTotal);

            OrderItem item = new OrderItem();
            item.setProductId(p.getProductId());
            item.setProductName(p.getName());
            item.setQuantity(qty);
            item.setUnitPrice(unitPrice);
            item.setLineTotal(lineTotal);
            itemEntities.add(item);
        }

        BigDecimal deliveryFee = nonNegative(req.deliveryFee());
        BigDecimal discount    = nonNegative(req.discount());
        BigDecimal totalAmount = subtotal.add(deliveryFee).subtract(discount);
        if (totalAmount.signum() < 0) {
            throw ApiException.badRequest("Discount cannot exceed subtotal + delivery fee");
        }

        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setCustomerId(customerId);
        order.setStoreId(storeId);
        order.setAddressId(req.addressId());
        order.setStatus(OrderStatus.PENDING);
        order.setSubtotal(subtotal);
        order.setDeliveryFee(deliveryFee);
        order.setDiscount(discount);
        order.setTotalAmount(totalAmount);
        order.setNotes(blankToNull(req.notes()));
        Order saved = orders.save(order);

        for (OrderItem item : itemEntities) {
            item.setOrderId(saved.getOrderId());
        }
        orderItems.saveAll(itemEntities);

        PaymentMethod method = req.paymentMethod() == null
                ? PaymentMethod.COD
                : PaymentMethod.fromValue(req.paymentMethod());
        Payment payment = new Payment();
        payment.setOrderId(saved.getOrderId());
        payment.setMethod(method);
        payment.setAmount(totalAmount);
        payment.setStatus(PaymentStatus.PENDING);
        Payment savedPayment = payments.save(payment);

        return OrderResponse.from(saved, itemEntities, savedPayment);
    }

    // ------------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> listMine(int customerId, Pageable pageable) {
        return orders.findByCustomerIdOrderByPlacedAtDesc(customerId, pageable)
                .map(OrderSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse getDetail(int callerId, boolean callerIsAdmin, int orderId) {
        Order order = require(orderId);
        if (!callerIsAdmin && !order.getCustomerId().equals(callerId)) {
            throw ApiException.forbidden("You do not have access to this order");
        }
        List<OrderItem> items = orderItems.findByOrderIdOrderByItemIdAsc(orderId);
        Payment payment = payments.findByOrderId(orderId).orElse(null);
        return OrderResponse.from(order, items, payment);
    }

    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> listForStore(
            int ownerId, int storeId, OrderStatus status, Pageable pageable) {
        storeService.requireOwned(ownerId, storeId);
        Page<Order> page = (status == null)
                ? orders.findByStoreIdOrderByPlacedAtDesc(storeId, pageable)
                : orders.findByStoreIdAndStatusOrderByPlacedAtDesc(storeId, status, pageable);
        return page.map(OrderSummaryResponse::from);
    }

    // ------------------------------------------------------------- state moves

    @Transactional
    public OrderSummaryResponse updateStatus(int ownerId, int orderId, String newStatusValue) {
        Order order = require(orderId);
        storeService.requireOwned(ownerId, order.getStoreId());

        OrderStatus next = OrderStatus.fromValue(newStatusValue);
        validateTransition(order.getStatus(), next);

        order.setStatus(next);
        Order saved = orders.save(order);
        return OrderSummaryResponse.from(saved);
    }

    // ------------------------------------------------------------------ cancel

    @Transactional
    public OrderSummaryResponse cancel(int callerId, int orderId, CancelOrderRequest req) {
        Order order = require(orderId);

        boolean isCustomer = order.getCustomerId().equals(callerId);
        boolean isStoreOwner = isStoreOwnerOf(callerId, order.getStoreId());
        if (!isCustomer && !isStoreOwner) {
            throw ApiException.forbidden("You do not have access to this order");
        }

        if (order.getStatus() != OrderStatus.PENDING
                && order.getStatus() != OrderStatus.CONFIRMED) {
            throw ApiException.conflict(
                    "Order cannot be cancelled once it is " + order.getStatus().getValue());
        }

        List<OrderItem> items = orderItems.findByOrderIdOrderByItemIdAsc(orderId);
        for (OrderItem item : items) {
            products.incrementStock(item.getProductId(), item.getQuantity());
        }

        String reason = blankToNull(req.reason());
        if (reason != null) {
            String prefix = "Cancelled: " + reason;
            order.setNotes(order.getNotes() == null ? prefix : order.getNotes() + "\n" + prefix);
        }

        order.setStatus(OrderStatus.CANCELLED);
        return OrderSummaryResponse.from(orders.save(order));
    }

    // ---------------------------------------------------------------- helpers

    @Transactional(readOnly = true)
    public Order require(int orderId) {
        return orders.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
    }

    private boolean isStoreOwnerOf(int userId, int storeId) {
        try {
            storeService.requireOwned(userId, storeId);
            return true;
        } catch (ApiException e) {
            return false;
        }
    }

    private static void validateTransition(OrderStatus from, OrderStatus to) {
        if (from == to) return;
        Set<OrderStatus> allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw ApiException.conflict(
                    "Cannot change order status from " + from.getValue() + " to " + to.getValue());
        }
    }

    private String generateOrderCode() {
        String datePart = LocalDate.now().format(CODE_DATE);
        for (int attempt = 0; attempt < CODE_MAX_ATTEMPTS; attempt++) {
            String suffix = randomSuffix(CODE_SUFFIX_LEN);
            String code = "ORD-" + datePart + "-" + suffix;
            if (!orders.existsByOrderCode(code)) {
                return code;
            }
        }
        throw ApiException.conflict("Could not generate a unique order code, please retry");
    }

    private static String randomSuffix(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private static BigDecimal nonNegative(BigDecimal v) {
        if (v == null) return BigDecimal.ZERO;
        if (v.signum() < 0) throw ApiException.badRequest("Amount cannot be negative");
        return v.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}