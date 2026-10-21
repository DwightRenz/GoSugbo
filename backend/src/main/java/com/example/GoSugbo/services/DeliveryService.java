package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.DeliveryDtos.*;
import com.example.GoSugbo.entity.*;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeliveryService {

    private static final Set<DeliveryStatus> ACTIVE = EnumSet.of(
            DeliveryStatus.ASSIGNED, DeliveryStatus.ACCEPTED, DeliveryStatus.ARRIVED_STORE,
            DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT, DeliveryStatus.ARRIVED_CUSTOMER);

    private static final Set<RideStatus> ACTIVE_RIDES = EnumSet.of(
            RideStatus.ACCEPTED, RideStatus.ARRIVED_PICKUP, RideStatus.IN_PROGRESS);

    private static final Map<DeliveryStatus, Set<DeliveryStatus>> TRANSITIONS = Map.of(
            DeliveryStatus.ASSIGNED,         Set.of(DeliveryStatus.ACCEPTED, DeliveryStatus.CANCELLED),
            DeliveryStatus.ACCEPTED,         Set.of(DeliveryStatus.ARRIVED_STORE, DeliveryStatus.CANCELLED),
            DeliveryStatus.ARRIVED_STORE,    Set.of(DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED),
            DeliveryStatus.PICKED_UP,        Set.of(DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED),
            DeliveryStatus.IN_TRANSIT,       Set.of(DeliveryStatus.ARRIVED_CUSTOMER, DeliveryStatus.FAILED),
            DeliveryStatus.ARRIVED_CUSTOMER, Set.of(DeliveryStatus.COMPLETED, DeliveryStatus.FAILED),
            DeliveryStatus.COMPLETED,        Set.of(),
            DeliveryStatus.FAILED,           Set.of(),
            DeliveryStatus.CANCELLED,        Set.of()
    );

    private final DeliveryRepository deliveries;
    private final OrderRepository orders;
    private final RiderProfileRepository riders;
    private final UserRepository users;
    private final PaymentRepository payments;
    private final StoreRepository stores;
    private final AddressRepository addresses;
    private final StoreService storeService;
    private final RideRepository rides;   // NEW - for mutual exclusion with rides

    // ------------------------------------------------------- available orders

    @Transactional(readOnly = true)
    public Page<AvailableOrderResponse> listAvailable(Pageable pageable) {
        Page<Order> page = orders.findByStatusAndRiderIdIsNullOrderByPlacedAtAsc(
                OrderStatus.READY_FOR_PICKUP, pageable);
        List<Order> list = page.getContent();
        if (list.isEmpty()) return page.map(o -> null);

        Map<Integer, Store> storeById = stores
                .findAllById(list.stream().map(Order::getStoreId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Store::getStoreId, Function.identity()));

        Set<Integer> addressIds = new HashSet<>();
        for (Order o : list) {
            addressIds.add(o.getAddressId());
            Store s = storeById.get(o.getStoreId());
            if (s != null && s.getAddressId() != null) addressIds.add(s.getAddressId());
        }
        Map<Integer, Address> addressById = addresses.findAllById(addressIds)
                .stream().collect(Collectors.toMap(Address::getAddressId, Function.identity()));

        List<AvailableOrderResponse> out = list.stream().map(o -> {
            Store s = storeById.get(o.getStoreId());
            Address storeAddr = s == null || s.getAddressId() == null ? null : addressById.get(s.getAddressId());
            return AvailableOrderResponse.from(o, PickupInfo.from(s, storeAddr), addressById.get(o.getAddressId()));
        }).toList();
        return new PageImpl<>(out, pageable, page.getTotalElements());
    }

    // ------------------------------------------------------------ rider accept

    @Transactional
    public DeliveryResponse accept(int riderId, int orderId) {
        RiderProfile profile = riders.findById(riderId)
                .orElseThrow(() -> ApiException.notFound("Rider profile not found"));
        if (!profile.isAvailable()) {
            throw ApiException.conflict("Go online before accepting orders");
        }
        if (deliveries.existsByRiderIdAndStatusIn(riderId, ACTIVE)) {
            throw ApiException.conflict("You already have an active delivery");
        }
        // NEW: a rider cannot take a delivery while on an active ride
        if (rides.existsByRiderIdAndStatusIn(riderId, ACTIVE_RIDES)) {
            throw ApiException.conflict("You have an active ride; finish it before accepting deliveries");
        }

        Order order = lockOrder(orderId);
        if (order.getStatus() != OrderStatus.READY_FOR_PICKUP || order.getRiderId() != null) {
            throw ApiException.conflict("Order is no longer available");
        }

        Delivery d = createOrReuse(order.getOrderId(), riderId, DeliveryStatus.ACCEPTED);
        order.setRiderId(riderId);
        orders.save(order);
        return build(d);
    }

    // ------------------------------------------------------------ admin assign

    @Transactional
    public DeliveryResponse assign(int orderId, int riderId) {
        User rider = users.findById(riderId)
                .orElseThrow(() -> ApiException.badRequest("Rider not found"));
        if (rider.getRole() != Role.RIDER) {
            throw ApiException.badRequest("User is not a rider");
        }
        if (deliveries.existsByRiderIdAndStatusIn(riderId, ACTIVE)) {
            throw ApiException.conflict("Rider already has an active delivery");
        }
        // NEW: same guard on admin assignment
        if (rides.existsByRiderIdAndStatusIn(riderId, ACTIVE_RIDES)) {
            throw ApiException.conflict("Rider has an active ride; cannot assign a delivery");
        }

        Order order = lockOrder(orderId);
        if (order.getRiderId() != null) {
            throw ApiException.conflict("Order already has a rider");
        }
        if (order.getStatus() != OrderStatus.PREPARING
                && order.getStatus() != OrderStatus.READY_FOR_PICKUP) {
            throw ApiException.conflict(
                    "A rider can only be assigned while the order is preparing or ready_for_pickup");
        }

        Delivery d = createOrReuse(order.getOrderId(), riderId, DeliveryStatus.ASSIGNED);
        order.setRiderId(riderId);
        orders.save(order);
        return build(d);
    }

    // ----------------------------------------------------------- status moves

    @Transactional
    public DeliveryResponse updateStatus(int riderId, int deliveryId, UpdateDeliveryStatusRequest req) {
        Delivery d = deliveries.findById(deliveryId)
                .orElseThrow(() -> ApiException.notFound("Delivery not found"));
        if (!d.getRiderId().equals(riderId)) {
            throw ApiException.forbidden("This delivery is not assigned to you");
        }

        DeliveryStatus next;
        try {
            next = DeliveryStatus.fromValue(req.status());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown delivery status: " + req.status());
        }

        Order order = lockOrder(d.getOrderId());
        if (next == d.getStatus()) {
            return build(d);
        }
        Set<DeliveryStatus> allowed = TRANSITIONS.getOrDefault(d.getStatus(), Set.of());
        if (!allowed.contains(next)) {
            throw ApiException.conflict("Cannot change delivery status from "
                    + d.getStatus().getValue() + " to " + next.getValue());
        }

        switch (next) {
            case PICKED_UP -> {
                if (order.getStatus() != OrderStatus.READY_FOR_PICKUP) {
                    throw ApiException.conflict("The store has not marked this order ready for pickup yet");
                }
                order.setStatus(OrderStatus.PICKED_UP);
                d.setPickupAt(LocalDateTime.now());
            }
            case IN_TRANSIT -> order.setStatus(OrderStatus.IN_TRANSIT);
            case COMPLETED -> {
                order.setStatus(OrderStatus.DELIVERED);
                d.setDeliveredAt(LocalDateTime.now());
                riders.findById(d.getRiderId()).ifPresent(p -> {
                    p.setTotalDeliveries(p.getTotalDeliveries() + 1);
                    riders.save(p);
                });
                markCodPaid(order.getOrderId());
            }
            case CANCELLED -> order.setRiderId(null); // order goes back to the pool
            case FAILED -> {
                order.setStatus(OrderStatus.CANCELLED);
                String note = "Delivery failed" + (isBlank(req.notes()) ? "" : ": " + req.notes().trim());
                order.setNotes(order.getNotes() == null ? note : order.getNotes() + "\n" + note);
            }
            default -> { /* ACCEPTED, ARRIVED_STORE, ARRIVED_CUSTOMER: delivery only */ }
        }

        d.setStatus(next);
        if (!isBlank(req.notes())) d.setNotes(req.notes().trim());
        if (req.distanceKm() != null) d.setDistanceKm(req.distanceKm());
        if (!isBlank(req.proofImage())) d.setProofImage(req.proofImage().trim());

        orders.save(order);
        Delivery saved = deliveries.save(d);
        return build(saved);
    }

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public Page<DeliveryResponse> listMine(int riderId, Pageable pageable) {
        Page<Delivery> page = deliveries.findByRiderIdOrderByCreatedAtDesc(riderId, pageable);
        return new PageImpl<>(buildAll(page.getContent()), pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DeliveryResponse getActive(int riderId) {
        Delivery d = deliveries.findFirstByRiderIdAndStatusInOrderByCreatedAtDesc(riderId, ACTIVE)
                .orElseThrow(() -> ApiException.notFound("You have no active delivery"));
        return build(d);
    }

    @Transactional(readOnly = true)
    public DeliveryResponse getForOrder(int callerId, boolean callerIsAdmin, int orderId) {
        Order order = orders.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        Delivery d = deliveries.findByOrderId(orderId)
                .orElseThrow(() -> ApiException.notFound("No delivery for this order yet"));

        boolean allowed = callerIsAdmin
                || order.getCustomerId().equals(callerId)
                || d.getRiderId().equals(callerId)
                || isStoreOwnerOf(callerId, order.getStoreId());
        if (!allowed) {
            throw ApiException.forbidden("You do not have access to this delivery");
        }
        return build(d);
    }

    // ------------------------------------------------------- rider profile ops

    @Transactional
    public RiderProfileResponse setAvailability(int riderId, boolean available) {
        RiderProfile p = riders.findById(riderId)
                .orElseThrow(() -> ApiException.notFound("Rider profile not found"));
        if (!available && deliveries.existsByRiderIdAndStatusIn(riderId, ACTIVE)) {
            throw ApiException.conflict("Finish your active delivery before going offline");
        }
        // NEW: also block going offline while on an active ride
        if (!available && rides.existsByRiderIdAndStatusIn(riderId, ACTIVE_RIDES)) {
            throw ApiException.conflict("Finish your active ride before going offline");
        }
        p.setAvailable(available);
        return RiderProfileResponse.from(riders.save(p));
    }

    @Transactional
    public RiderProfileResponse updateLocation(int riderId, UpdateLocationRequest req) {
        RiderProfile p = riders.findById(riderId)
                .orElseThrow(() -> ApiException.notFound("Rider profile not found"));
        p.setCurrentLat(req.lat());
        p.setCurrentLng(req.lng());
        return RiderProfileResponse.from(riders.save(p));
    }

    @Transactional(readOnly = true)
    public RiderProfileResponse getProfile(int riderId) {
        return riders.findById(riderId)
                .map(RiderProfileResponse::from)
                .orElseThrow(() -> ApiException.notFound("Rider profile not found"));
    }

    // ---------------------------------------------------------------- helpers

    private DeliveryResponse build(Delivery d) {
        return buildAll(List.of(d)).get(0);
    }

    /** Builds responses for many deliveries using batch lookups (no N+1 queries). */
    private List<DeliveryResponse> buildAll(List<Delivery> list) {
        if (list.isEmpty()) return List.of();

        Map<Integer, Order> orderById = orders
                .findAllById(list.stream().map(Delivery::getOrderId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Order::getOrderId, Function.identity()));

        Set<Integer> storeIds = new HashSet<>();
        Set<Integer> customerIds = new HashSet<>();
        for (Order o : orderById.values()) {
            storeIds.add(o.getStoreId());
            customerIds.add(o.getCustomerId());
        }

        Map<Integer, Store> storeById = stores.findAllById(storeIds)
                .stream().collect(Collectors.toMap(Store::getStoreId, Function.identity()));
        Map<Integer, User> userById = users.findAllById(customerIds)
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        Set<Integer> addressIds = new HashSet<>();
        for (Order o : orderById.values()) addressIds.add(o.getAddressId());
        for (Store s : storeById.values()) {
            if (s.getAddressId() != null) addressIds.add(s.getAddressId());
        }
        Map<Integer, Address> addressById = addresses.findAllById(addressIds)
                .stream().collect(Collectors.toMap(Address::getAddressId, Function.identity()));

        return list.stream().map(d -> {
            Order o = orderById.get(d.getOrderId());
            PickupInfo pickup = null;
            DropoffInfo dropoff = null;
            if (o != null) {
                Store s = storeById.get(o.getStoreId());
                Address storeAddr = (s == null || s.getAddressId() == null)
                        ? null : addressById.get(s.getAddressId());
                pickup = PickupInfo.from(s, storeAddr);
                dropoff = DropoffInfo.from(userById.get(o.getCustomerId()),
                        addressById.get(o.getAddressId()));
            }
            return DeliveryResponse.from(d, o, pickup, dropoff);
        }).toList();
    }

    private Order lockOrder(int orderId) {
        return orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
    }

    /** deliveries.order_id is UNIQUE, so a cancelled delivery row is reused for the next rider. */
    private Delivery createOrReuse(int orderId, int riderId, DeliveryStatus status) {
        Delivery d = deliveries.findByOrderId(orderId).map(existing -> {
            if (existing.getStatus() != DeliveryStatus.CANCELLED) {
                throw ApiException.conflict("Order already has an active delivery");
            }
            existing.setPickupAt(null);
            existing.setDeliveredAt(null);
            existing.setNotes(null);
            return existing;
        }).orElseGet(Delivery::new);

        d.setOrderId(orderId);
        d.setRiderId(riderId);
        d.setStatus(status);
        return deliveries.save(d);
    }

    private void markCodPaid(int orderId) {
        payments.findByOrderId(orderId).ifPresent(p -> {
            if (p.getMethod() == PaymentMethod.COD && p.getStatus() == PaymentStatus.PENDING) {
                p.setStatus(PaymentStatus.PAID);
                p.setPaidAt(LocalDateTime.now());
                payments.save(p);
            }
        });
    }

    private boolean isStoreOwnerOf(int userId, int storeId) {
        try {
            storeService.requireOwned(userId, storeId);
            return true;
        } catch (ApiException e) {
            return false;
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}