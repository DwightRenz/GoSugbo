import { useCallback, useEffect, useState } from "react";
import {
  fetchMyRidesAsRider,
  selectCompletedTrips,
  type EarningsTrip,
} from "@/services/riderService";

export type EarningsPeriod = "Today" | "This Week" | "This Month";

export type RiderEarningsState = {
  trips: EarningsTrip[]; // all completed trips, newest first
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => void;
};

export function filterTripsByPeriod(
  trips: EarningsTrip[],
  period: EarningsPeriod,
): EarningsTrip[] {
  const now = new Date();
  return trips.filter((t) => {
    const d = new Date(t.completedAt);
    if (period === "Today") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (period === "This Week") {
      const diffMs = now.getTime() - d.getTime();
      return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    }
    // This Month — last 30 days
    const diffMs = now.getTime() - d.getTime();
    return diffMs >= 0 && diffMs <= 30 * 24 * 60 * 60 * 1000;
  });
}

export function useRiderEarnings(): RiderEarningsState {
  const [trips, setTrips] = useState<EarningsTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    fetchMyRidesAsRider(0, 100)
      .then((page) => {
        if (!active) return;
        setTrips(selectCompletedTrips(page.content));
        setError("");
      })
      .catch((e: any) => {
        if (!active) return;
        setError(e?.message ?? "Could not load earnings.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [nonce]);

  return { trips, loading, refreshing, error, refresh };
}
