import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { syncPushTokenWithBackend } from "@/services/notificationService";
import { routeNotification } from "@/lib/notification-routing";

// Show a heads-up banner while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Mount once inside <AuthProvider> (root layout). Handles:
 *   - registering the FCM token on login / on token refresh
 *   - foreground tap routing
 */
export function usePushNotifications(): void {
  const { isAuthenticated } = useAuth();
  const registeredFor = useRef<boolean>(false);

  // 1) Sync token whenever the user becomes authenticated.
  useEffect(() => {
    if (!isAuthenticated) {
      registeredFor.current = false;
      return;
    }
    if (registeredFor.current) return;
    registeredFor.current = true;
    void syncPushTokenWithBackend();
  }, [isAuthenticated]);

  // 2) Token refresh (FCM may rotate the registration token).
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addPushTokenListener(() => {
      if (isAuthenticated) void syncPushTokenWithBackend();
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  // 3) Handle taps (foreground + background when user taps the notification).
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener(
      (resp) => {
        routeNotification(resp.notification);
      },
    );
    return () => sub.remove();
  }, []);
}
