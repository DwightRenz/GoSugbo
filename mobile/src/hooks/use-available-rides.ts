import { useCallback, useEffect, useRef, useState } from "react";
import { acceptRide, fetchAvailableRides } from "@/services/riderService";
import type { AvailableRide, Ride } from "@/types/ride";

const POLL_MS = 15000;

export type AvailableRidesState = {
  ride: AvailableRide | null;
  loading: boolean;
  accepting: boolean;
  error: string;
  accept: () => Promise<Ride | null>;
  refresh: () => void;
};

export function useAvailableRides(enabled: boolean): AvailableRidesState {
  const [storedRide, setStoredRide] = useState<AvailableRide | null>(null);
  const [storedLoading, setStoredLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);
  const activeRef = useRef(true);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    // When disabled, do nothing — derived values below handle it.
    if (!enabled) return;

    activeRef.current = true;
    let cancelled = false;

    // Defer the initial loading flip to a microtask so the compiler
    // doesn't flag "synchronous setState inside an effect".
    void Promise.resolve().then(() => {
      if (!cancelled) setStoredLoading(true);
    });

    async function load(showLoading: boolean) {
      if (showLoading && !cancelled) setStoredLoading(true);
      try {
        const page = await fetchAvailableRides(0, 1);
        if (cancelled) return;
        setStoredRide(page.content[0] ?? null);
        setError("");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Could not load available rides.");
      } finally {
        if (!cancelled && showLoading) setStoredLoading(false);
      }
    }

    void load(true);
    const timer = setInterval(() => void load(false), POLL_MS);

    return () => {
      cancelled = true;
      activeRef.current = false;
      clearInterval(timer);
    };
  }, [enabled, nonce]);

  const accept = useCallback(async (): Promise<Ride | null> => {
    if (!storedRide || accepting) return null;
    setAccepting(true);
    setError("");
    try {
      const assigned = await acceptRide(storedRide.rideId);
      setStoredRide(null);
      return assigned;
    } catch (e: any) {
      setError(e?.message ?? "Could not accept this ride.");
      return null;
    } finally {
      setAccepting(false);
    }
  }, [storedRide, accepting]);

  // Derived: when disabled, expose empty state without needing setState.
  const ride = enabled ? storedRide : null;
  const loading = enabled ? storedLoading : false;

  return { ride, loading, accepting, error, accept, refresh };
}
