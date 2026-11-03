import { request } from "@/lib/api";
import type {
  FareEstimate,
  Ride,
  RideStatusHistoryEntry,
  RideType,
} from "@/types/ride";

export function fetchRideTypes() {
  return request<RideType[]>("/api/rides/types");
}

export function estimateFare(input: {
  rideTypeId: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
}) {
  return request<FareEstimate>("/api/rides/estimate", {
    method: "POST",
    body: input,
  });
}

export function bookRide(input: {
  rideTypeId: number;
  pickupAddressId: number;
  dropoffAddressId: number;
  notes?: string;
}) {
  return request<Ride>("/api/rides", {
    method: "POST",
    auth: true,
    body: input,
  });
}

export function fetchActiveRide() {
  return request<Ride>("/api/rides/mine/active", { auth: true });
}

export function fetchRide(rideId: number) {
  return request<Ride>(`/api/rides/${rideId}`, { auth: true });
}

export function fetchRideHistory(rideId: number) {
  return request<RideStatusHistoryEntry[]>(`/api/rides/${rideId}/history`, {
    auth: true,
  });
}

export function cancelRide(rideId: number, reason?: string) {
  return request<Ride>(`/api/rides/${rideId}/status`, {
    method: "PATCH",
    auth: true,
    body: { status: "cancelled", notes: reason ?? "" },
  });
}

// ---------- Address creation (rides need address IDs, not coords) ----------

export type CreateAddressInput = {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

export type AddressResponse = {
  id: number;
  label: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
};

export function createAddress(input: CreateAddressInput) {
  return request<AddressResponse>("/api/addresses", {
    method: "POST",
    auth: true,
    body: {
      label: input.label,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      country: input.country ?? "Philippines",
      latitude: input.latitude,
      longitude: input.longitude,
      isDefault: input.isDefault ?? false,
    },
  });
}
