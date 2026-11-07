import { useEffect, useRef, useState } from "react";
import { subscribeToRide } from "@/services/trackingService";
import type {
  RideLocationBroadcast,
  RidePaymentBroadcast,
  RideStatus,
  RideStatusBroadcast,
} from "@/types/ride";

export type RideTrackingState = {
  riderPosition: { latitude: number; longitude: number } | null;
  liveStatus: RideStatus | null;
  statusNotes: string | null;
  /** NEW — "paid" once the PayMongo webhook confirms the ride's QR payment. */
  livePaymentStatus: "paid" | "failed" | null;
  connected: boolean;
  error: string;
};

export function useRideTracking(rideId: number | null): RideTrackingState {
  const [riderPosition, setRiderPosition] =
    useState<RideTrackingState["riderPosition"]>(null);
  const [liveStatus, setLiveStatus] = useState<RideStatus | null>(null);
  const [statusNotes, setStatusNotes] = useState<string | null>(null);
  const [livePaymentStatus, setLivePaymentStatus] =
    useState<RideTrackingState["livePaymentStatus"]>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const handleRef = useRef<{ disconnect: () => void } | null>(null);

  useEffect(() => {
    if (rideId == null) return;

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;
      setError("");
      setConnected(false);
      setLivePaymentStatus(null);
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
      // NEW
      onPayment: (data: RidePaymentBroadcast) => {
        if (!active) return;
        if (data.rideId !== rideId) return;
        setLivePaymentStatus(data.status);
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
      setConnected(false);
    };
  }, [rideId]);

  return {
    riderPosition,
    liveStatus,
    statusNotes,
    livePaymentStatus,
    connected,
    error,
  };
}
