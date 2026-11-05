import { request } from "@/lib/api";
import { formatPlace } from "@/lib/format";
import type { AvailableRide, Ride } from "@/types/ride";

export type RiderProfile = {
  riderId: number;
  available: boolean;
  vehicleType: string | null;
  plateNumber: string | null;
  currentLat: number | null;
  currentLng: number | null;
  ratingAvg: number | null;
  totalDeliveries: number;
};

type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export function fetchMyRidesAsRider(page = 0, size = 100) {
  return request<Page<Ride>>(
    `/api/rides/driver/mine?page=${page}&size=${size}`,
    { auth: true },
  );
}

export function fetchMyRiderProfile() {
  return request<RiderProfile>("/api/riders/me", { auth: true });
}

export function setAvailability(available: boolean) {
  return request<RiderProfile>("/api/riders/me/availability", {
    method: "PATCH",
    auth: true,
    body: { available },
  });
}

export function fetchAvailableRides(page = 0, size = 20) {
  return request<Page<AvailableRide>>(
    `/api/rides/driver/available?page=${page}&size=${size}`,
    { auth: true },
  );
}

export function acceptRide(rideId: number) {
  return request<Ride>(`/api/rides/driver/${rideId}/accept`, {
    method: "POST",
    auth: true,
  });
}

export function fetchActiveRideAsRider() {
  return request<Ride>("/api/rides/driver/mine/active", { auth: true });
}

export function updateRideStatus(
  rideId: number,
  status:
    | "arrived_pickup"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show",
  opts?: { notes?: string; actualDistanceKm?: number },
) {
  return request<Ride>(`/api/rides/driver/${rideId}/status`, {
    method: "PATCH",
    auth: true,
    body: { status, ...opts },
  });
}

export function updateRiderLocation(rideId: number, lat: number, lng: number) {
  return request<void>(`/api/rides/driver/${rideId}/location`, {
    method: "PATCH",
    auth: true,
    body: { lat, lng },
  });
}

export type RiderStats = {
  todayTrips: number;
  todayEarnings: number;
  ratingAvg: number | null;
  totalCompleted: number;
};

function isSameLocalDay(iso: string | null, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function computeRiderStats(
  rides: Ride[],
  profile: RiderProfile | null,
): RiderStats {
  const now = new Date();
  let todayTrips = 0;
  let todayEarnings = 0;
  let totalCompleted = 0;

  for (const r of rides) {
    if (r.status !== "completed") continue;
    totalCompleted += 1;
    if (isSameLocalDay(r.completedAt, now)) {
      todayTrips += 1;
      todayEarnings += r.fareAmount ?? 0;
    }
  }

  return {
    todayTrips,
    todayEarnings,
    ratingAvg: profile?.ratingAvg ?? null,
    totalCompleted,
  };
}

// ---------------------------------------------------------------- earnings

export type EarningsTrip = {
  rideId: number;
  route: string;
  completedAt: string;
  fare: number;
};

/** Map a completed Ride to the shape the earnings screen needs. */
export function toEarningsTrip(r: Ride): EarningsTrip {
  const from = formatPlace(r.pickup, "Pickup");
  const to = formatPlace(r.dropoff, "Destination");
  return {
    rideId: r.rideId,
    route: `${from} → ${to}`,
    completedAt: r.completedAt ?? r.requestedAt,
    fare: r.fareAmount ?? 0,
  };
}

/** Returns only completed rides, newest first. */
export function selectCompletedTrips(rides: Ride[]): EarningsTrip[] {
  return rides
    .filter((r) => r.status === "completed")
    .map(toEarningsTrip)
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
}
