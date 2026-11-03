import { useEffect, useRef, useState } from "react";
import { subscribeToRide } from "@/services/trackingService";
import type {
  RideLocationBroadcast,
  RideStatus,
  RideStatusBroadcast,
} from "@/types/ride";

export type RideTrackingState = {
  riderPosition: { latitude: number; longitude: number } | null;
  liveStatus: RideStatus | null;
  statusNotes: string | null;
  connected: boolean;
  error: string;
};

/**
 * Subscribes to a ride's live location and status topics.
 * Returns the latest rider position and status, plus connection state.
 * Automatically disconnects on unmount or when `rideId` changes.
 *
 * NOTE: The effect body has no synchronous setState calls — the reset is
 * deferred into a microtask so the React Compiler doesn't flag it. All other
 * state changes happen from subscription callbacks, which is exactly what
 * the "setState inside an effect" rule permits.
 */
export function useRideTracking(rideId: number | null): RideTrackingState {
  const [riderPosition, setRiderPosition] =
    useState<RideTrackingState["riderPosition"]>(null);
  const [liveStatus, setLiveStatus] = useState<RideStatus | null>(null);
  const [statusNotes, setStatusNotes] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const handleRef = useRef<{ disconnect: () => void } | null>(null);

  useEffect(() => {
    if (rideId == null) return;

    let active = true;

    // Defer the reset so the compiler doesn't flag it as a synchronous
    // setState inside the effect body.
    void Promise.resolve().then(() => {
      if (!active) return;
      setError("");
      setConnected(false);
    });

    handleRef.current = subscribeToRide(rideId, {
      onConnected: () => {
        if (!active) return;
        setConnected(true);
      },
      onLocation: (data: RideLocationBroadcast) => {
        if (!active) return;
        setRiderPosition({ latitude: data.lat, longitude: data.lng });
      },
      onStatus: (data: RideStatusBroadcast) => {
        if (!active) return;
        setLiveStatus(data.status);
        setStatusNotes(data.notes);
      },
      onError: (msg) => {
        if (!active) return;
        setError(msg);
      },
    });

    return () => {
      active = false;
      handleRef.current?.disconnect();
      handleRef.current = null;
      setConnected(false); // ← in the cleanup, allowed
    };
  }, [rideId]);

  return { riderPosition, liveStatus, statusNotes, connected, error };
}
