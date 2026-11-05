import { useCallback, useEffect, useState } from "react";
import {
  computeRiderStats,
  fetchMyRiderProfile,
  fetchMyRidesAsRider,
  type RiderProfile,
  type RiderStats,
} from "@/services/riderService";
import type { Ride } from "@/types/ride";

export type RiderStatsState = {
  stats: RiderStats | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => void;
};

export function useRiderStats(): RiderStatsState {
  const [stats, setStats] = useState<RiderStats | null>(null);
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

    (async () => {
      try {
        const [ridesPage, profile] = await Promise.all([
          fetchMyRidesAsRider(0, 100).catch(() => null),
          fetchMyRiderProfile().catch(() => null as RiderProfile | null),
        ]);
        if (!active) return;

        if (ridesPage == null && profile == null) {
          setError("Could not load rider stats.");
          setStats(null);
          return;
        }

        const rides: Ride[] = ridesPage?.content ?? [];
        setStats(computeRiderStats(rides, profile));
        setError("");
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Could not load rider stats.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [nonce]);

  return { stats, loading, refreshing, error, refresh };
}
