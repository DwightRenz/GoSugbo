import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { request } from "@/lib/api";

const isExpoGo = () =>
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type RegisterTokenPayload = {
  token: string;
  platform: "android" | "ios" | "web";
  deviceInfo?: string;
};

export type NotificationResult = {
  successCount: number;
  failureCount: number;
  message?: string | null;
};

/** Register the FCM token with the backend for the current user. */
export function registerDeviceToken(payload: RegisterTokenPayload) {
  return request<void>("/api/notifications/tokens", {
    method: "POST",
    auth: true,
    body: payload,
  });
}

/** Remove the token (call on logout). */
export function unregisterDeviceToken(token: string) {
  return request<{ message: string }>("/api/notifications/tokens", {
    method: "DELETE",
    auth: true,
    body: { token },
  });
}

/**
 * Request permission, fetch the native FCM token, and return it.
 * Returns null if permission denied or the environment cannot push
 * (web, Expo Go, emulator without Play Services).
 */
export async function getFcmToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  // expo-notifications remote push is NOT supported in Expo Go on Android.
  if (isExpoGo()) {
    console.warn(
      "[notifications] Expo Go does not support remote push. Use a dev build.",
    );
    return null;
  }

  if (!Device.isDevice) {
    console.warn("[notifications] Push requires a physical device.");
    return null;
  }

  // Android 13+ runtime permission
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("gosugbo_default", {
      name: "GoSugbo notifications",
      importance: AndroidImportance.HIGH, // <--- Changed here
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4C1C24",
      sound: "default",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    status = req.status;
  }
  if (status !== "granted") return null;

  try {
    // The EAS projectId is required for expo-notifications to resolve FCM.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn(
        "[notifications] Missing EAS projectId in app.json extra.eas.projectId",
      );
      return null;
    }
    const token = await Notifications.getDevicePushTokenAsync();
    // On Android, getDevicePushTokenAsync returns the FCM registration token.
    return typeof token.data === "string" ? token.data : null;
  } catch (e: any) {
    console.warn(
      "[notifications] getDevicePushTokenAsync failed:",
      e?.message ?? e,
    );
    return null;
  }
}

/** Convenience: fetch token + POST to backend in one go. */
export async function syncPushTokenWithBackend(): Promise<void> {
  const token = await getFcmToken();
  if (!token) return;
  const platform: RegisterTokenPayload["platform"] =
    Platform.OS === "ios" ? "ios"
    : Platform.OS === "android" ? "android"
    : "web";
  const deviceInfo =
    [Device.modelName, Device.osName, Device.osVersion]
      .filter(Boolean)
      .join(" / ") || undefined;
  await registerDeviceToken({ token, platform, deviceInfo }).catch((e) => {
    // Non-fatal — user still gets the rest of the app
    console.warn(
      "[notifications] registerDeviceToken failed:",
      e?.message ?? e,
    );
  });
}
