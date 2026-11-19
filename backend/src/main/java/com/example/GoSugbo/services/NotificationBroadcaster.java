package com.example.GoSugbo.services;

import com.example.GoSugbo.entity.Order;
import com.example.GoSugbo.entity.OrderStatus;
import com.example.GoSugbo.entity.Ride;
import com.example.GoSugbo.entity.RideStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Convenience facade so domain services don't build payloads inline. */
@Component
@RequiredArgsConstructor
public class NotificationBroadcaster {

    private final NotificationService notifications;

    public void orderStatusChanged(Order order, OrderStatus status) {
        Integer customer = order.getCustomerId();
        Integer rider = order.getRiderId();
        String title = "Order " + order.getOrderCode();
        String body = "Status: " + status.getValue().replace('_', ' ');
        Map<String, String> data = Map.of(
                "type", "order_status",
                "orderId", String.valueOf(order.getOrderId()),
                "status", status.getValue());

        notifications.sendToUser(customer, title, body, data);
        if (rider != null) {
            notifications.sendToUser(rider, title, body, data);
        }
    }

    public void newDeliveryOffer(Order order) {
        // Called by DeliveryService.assign — pushes the rider a job offer.
        if (order.getRiderId() == null) return;
        notifications.sendToUser(order.getRiderId(),
                "New delivery assigned",
                "Order " + order.getOrderCode() + " is ready for pickup",
                Map.of("type", "delivery_assigned",
                        "orderId", String.valueOf(order.getOrderId())));
    }

    public void rideStatusChanged(Ride ride, RideStatus status) {
        String title = "Ride #" + ride.getRideId();
        String body = "Status: " + status.getValue().replace('_', ' ');
        Map<String, String> data = Map.of(
                "type", "ride_status",
                "rideId", String.valueOf(ride.getRideId()),
                "status", status.getValue());

        notifications.sendToUser(ride.getCustomerId(), title, body, data);
        if (ride.getRiderId() != null) {
            notifications.sendToUser(ride.getRiderId(), title, body, data);
        }
    }

    public void chatMessage(Integer recipientId, Integer rideId, String body) {
        notifications.sendToUser(recipientId,
                "New chat message",
                body,
                Map.of("type", "chat_message",
                        "rideId", String.valueOf(rideId)));
    }
}