import { router } from "expo-router";
import type { Notification } from "expo-notifications";

/**
 * Route a tapped notification to the right screen based on `data.type`.
 * Types come from the backend `NotificationBroadcaster`.
 */
export function routeNotification(n: Notification): void {
  const data = (n.request.content.data ?? {}) as Record<string, unknown>;
  const type = typeof data.type === "string" ? data.type : undefined;

  switch (type) {
    case "ride_status": {
      const rideId = Number(data.rideId);
      if (Number.isFinite(rideId) && rideId > 0) {
        router.push(`/ride-tracking?rideId=${rideId}`);
      } else {
        router.push("/my-rides");
      }
      return;
    }
    case "order_status":
    case "delivery_assigned": {
      // No dedicated order screen yet — drop the user on Home.
      router.push("/home");
      return;
    }
    case "chat_message": {
      const rideId = Number(data.rideId);
      if (Number.isFinite(rideId) && rideId > 0) {
        router.push(`/chat?rideId=${rideId}`);
      } else {
        router.push("/home");
      }
      return;
    }
    default:
      router.push("/home");
  }
}
