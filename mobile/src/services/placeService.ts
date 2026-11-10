import { request } from "@/lib/api";

export type PlaceSuggestion = {
  placeId: string;
  title: string;
  subtitle: string;
};

export function fetchPlaceSuggestions(input: string) {
  return request<PlaceSuggestion[]>(
    `/api/places/suggestions?input=${encodeURIComponent(input)}`,
    { auth: true },
  );
}

export function fetchPlaceCoordinates(placeId: string) {
  return request<{ latitude: number; longitude: number }>(
    `/api/places/${encodeURIComponent(placeId)}`,
    { auth: true },
  );
}
