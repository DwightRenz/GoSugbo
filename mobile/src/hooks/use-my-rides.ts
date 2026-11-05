import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { Ride } from "@/types/ride";

type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

const PAGE_SIZE = 20;

function fetchMyRides(page = 0, size = PAGE_SIZE) {
  return request<Page<Ride>>(`/api/rides/mine?page=${page}&size=${size}`, {
    auth: true,
  });
}

function fetchActiveCustomerRide() {
  return request<Ride>("/api/rides/mine/active", { auth: true });
}

export type MyRidesState = {
  rides: Ride[];
  activeRide: Ride | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => void;
};

export function useMyRides(): MyRidesState {
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
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

    Promise.all([
      fetchMyRides(0, PAGE_SIZE).catch(() => null),
      fetchActiveCustomerRide().catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
    ])
      .then(([page, activeR]) => {
        if (!active) return;
        setRides(page?.content ?? []);
        setActiveRide(activeR ?? null);
        setError("");
      })
      .catch((e: any) => {
        if (!active) return;
        setError(e?.message ?? "Could not load your rides.");
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

  return { rides, activeRide, loading, refreshing, error, refresh };
}
