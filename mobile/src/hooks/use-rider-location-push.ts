import { useEffect } from "react";
import * as Location from "expo-location";
import { updateRiderLocation } from "@/services/riderService";
import type { RideStatus } from "@/types/ride";

const ACTIVE: RideStatus[] = ["accepted", "arrived_pickup", "in_progress"];
const TIME_INTERVAL_MS = 7000;
const DISTANCE_INTERVAL_M = 10;

/**
 * While `rideId` has an active status, streams the device's GPS to the backend
 * so the customer's tracking screen can follow the rider.
 *
 * No-ops when:
 *  - ride is null / terminal
 *  - permission is denied
 *  - rider is on web (expo-location GPS is native-only)
 */
export function useRiderLocationPush(
  rideId: number | null,
  status: RideStatus | null,
): void {
  useEffect(() => {
    if (rideId == null || status == null) return;
    if (!ACTIVE.includes(status)) return;

    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status: perm } =
          await Location.requestForegroundPermissionsAsync();
        if (perm !== "granted") return;
        if (cancelled) return;

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: TIME_INTERVAL_MS,
            distanceInterval: DISTANCE_INTERVAL_M,
          },
          ({ coords }) => {
            updateRiderLocation(
              rideId,
              coords.latitude,
              coords.longitude,
            ).catch(() => {
              /* silent — broadcast must never break the ride UI */
            });
          },
        );
      } catch {
        /* permission/API unavailable — ignore */
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [rideId, status]);
}
