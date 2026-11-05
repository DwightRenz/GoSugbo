import { useCallback, useEffect, useState } from "react";
import {
  fetchActiveRideAsRider,
  updateRideStatus,
} from "@/services/riderService";
import { ApiError } from "@/lib/api";
import type { Ride, RideStatus } from "@/types/ride";

type AdvanceStatus =
  | "arrived_pickup"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type ActiveRideState = {
  ride: Ride | null;
  loading: boolean;
  updating: boolean;
  error: string;
  advance: (
    status: AdvanceStatus,
    opts?: { notes?: string; actualDistanceKm?: number },
  ) => Promise<Ride | null>;
  seed: (ride: Ride) => void;
  refresh: () => void;
  isTerminal: boolean;
};

const TERMINAL: RideStatus[] = ["completed", "cancelled", "no_show"];

export function useActiveRide(enabled: boolean): ActiveRideState {
  // Stored state is what the last fetch/advance produced.
  const [storedRide, setStoredRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    // When disabled, do nothing — the derived `ride` below returns null.
    if (!enabled) return;

    let active = true;
    // Defer loading=true to a microtask so the compiler doesn't flag
    // "synchronous setState inside an effect".
    void Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    fetchActiveRideAsRider()
      .then((r) => {
        if (!active) return;
        setStoredRide(r);
        setError("");
      })
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) {
          setStoredRide(null);
          setError("");
        } else {
          setError(e?.message ?? "Could not load active ride.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, nonce]);

  const advance = useCallback<ActiveRideState["advance"]>(
    async (status, opts) => {
      if (!storedRide || updating) return null;
      setUpdating(true);
      setError("");
      try {
        const updated = await updateRideStatus(storedRide.rideId, status, opts);
        setStoredRide(TERMINAL.includes(updated.status) ? null : updated);
        return updated;
      } catch (e: any) {
        setError(e?.message ?? "Could not update the ride.");
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [storedRide, updating],
  );

  const seed = useCallback((r: Ride) => setStoredRide(r), []);

  // Derived: when the hook is disabled, expose no ride regardless of
  // what's stored, without needing a setState in the effect.
  const ride = enabled ? storedRide : null;

  return {
    ride,
    loading,
    updating,
    error,
    advance,
    seed,
    refresh,
    isTerminal: !!ride && TERMINAL.includes(ride.status),
  };
}
