import { request } from "@/lib/api";
import type { Ride } from "@/types/ride";

export type CheckoutResponse = {
  checkoutUrl: string;
  orderCode: string;
};

export function initiateRideCheckout(rideId: number) {
  return request<CheckoutResponse>(`/api/rides/${rideId}/pay`, {
    method: "POST",
    auth: true,
  });
}

export function verifyRideCheckout(rideId: number) {
  return request<Ride>(`/api/rides/${rideId}/pay/verify`, {
    method: "POST",
    auth: true,
  });
}
