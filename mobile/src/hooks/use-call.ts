import { useEffect } from "react";
import { useCallContext } from "@/context/CallContext";

export type { CallPhase, CallState } from "@/context/CallContext";

/**
 * Keep the call socket subscribed to this ride so an incoming call can ring
 * on this screen. Use it on any screen that shows an active ride
 * (ride tracking for customers, rider home for riders).
 */
export function useWatchCallRide(rideId: number | null) {
  const { watchRide } = useCallContext();
  useEffect(() => {
    if (rideId == null) return;
    return watchRide(rideId);
  }, [rideId, watchRide]);
}

/** Call state and actions. Also watches the ride, so it is safe on its own. */
export function useCall(rideId: number | null) {
  useWatchCallRide(rideId);
  return useCallContext();
}
