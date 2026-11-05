export type RideStatus =
  | "requested"
  | "accepted"
  | "arrived_pickup"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type RideType = {
  rideTypeId: number;
  name: string;
  vehicleType: string;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
  surgeMultiplier: number;
};

export type AddressInfo = {
  addressId: number;
  label: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type RiderInfo = {
  riderId: number;
  fullName: string;
  phone: string | null;
  profileImage: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  ratingAvg: number | null;
};

export type CustomerInfo = {
  userId: number;
  fullName: string;
  phone: string | null;
  profileImage: string | null;
};

export type Ride = {
  rideId: number;
  status: RideStatus;
  rideType: RideType | null;
  pickup: AddressInfo | null;
  dropoff: AddressInfo | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedDistanceKm: number | null;
  estimatedDurationMin: number | null;
  actualDistanceKm: number | null;
  fareAmount: number | null;
  customer: CustomerInfo | null;
  rider: RiderInfo | null;
  requestedAt: string;
  acceptedAt: string | null;
  pickupAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
};

export type FareEstimate = {
  rideTypeId: number;
  rideTypeName: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedFare: number;
};

export type RideStatusHistoryEntry = {
  status: RideStatus;
  changedBy: number | null;
  notes: string | null;
  createdAt: string;
};

/** STOMP broadcast payloads (matches backend TrackingDtos) */
export type RideLocationBroadcast = {
  rideId: number | null;
  deliveryId: number | null;
  riderId: number;
  lat: number;
  lng: number;
  timestamp: string;
};

export type RideStatusBroadcast = {
  rideId: number | null;
  deliveryId: number | null;
  status: RideStatus;
  notes: string | null;
  timestamp: string;
};

/** Compact ride shape for the rider job board (backend: AvailableRideResponse).
 *  Hides the customer's exact dropoff address — only the city is exposed. */
export type AvailableRide = {
  rideId: number;
  status: RideStatus;
  rideType: RideType | null;
  pickup: AddressInfo | null;
  dropoffCity: string | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedDistanceKm: number | null;
  estimatedDurationMin: number | null;
  estimatedFare: number | null;
  requestedAt: string;
};
