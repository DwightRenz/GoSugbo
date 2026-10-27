package com.example.GoSugbo.services;

import com.example.GoSugbo.config.GoogleMapsProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleMapsService {

    private static final double AVG_SPEED_KMH = 25.0;

    /** Local mapper — we don't depend on Spring's auto-configured ObjectMapper. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final GoogleMapsProperties props;

    public record RouteResult(BigDecimal distanceKm, int durationMinutes, boolean fromFallback) {}

    public RouteResult computeRoute(double originLat, double originLng,
                                    double destLat, double destLng) {
        if (!props.hasApiKey()) {
            log.debug("GOOGLE_MAPS_API_KEY not set — using Haversine fallback");
            return fallback(originLat, originLng, destLat, destLng);
        }
        try {
            RouteResult r = callRoutesApi(originLat, originLng, destLat, destLng);
            return r != null ? r : fallback(originLat, originLng, destLat, destLng);
        } catch (Exception ex) {
            log.warn("Routes API call failed ({}). Falling back to Haversine.", ex.getMessage());
            return fallback(originLat, originLng, destLat, destLng);
        }
    }

    private RouteResult callRoutesApi(double originLat, double originLng,
                                      double destLat, double destLng) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("origin", latLng(originLat, originLng));
        body.put("destination", latLng(destLat, destLng));
        body.put("travelMode", "DRIVE");
        body.put("routingPreference", "TRAFFIC_UNAWARE");

        String payload = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(props.routesUrl()))
                .timeout(Duration.ofMillis(props.timeoutMs()))
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", props.apiKey())
                .header("X-Goog-FieldMask", "routes.distanceMeters,routes.duration")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(props.timeoutMs()))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("Routes API non-2xx status {}: {}", response.statusCode(), truncate(response.body(), 200));
            return null;
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode routes = root.path("routes");
        if (!routes.isArray() || routes.isEmpty()) return null;

        JsonNode route = routes.get(0);
        int meters = route.path("distanceMeters").asInt(0);
        String durationStr = route.path("duration").asText("");

        if (meters <= 0) return null;

        double km = meters / 1000.0;
        int minutes = parseDurationSecondsToMinutes(durationStr, km);

        return new RouteResult(round2(BigDecimal.valueOf(km)), minutes, false);
    }

    private static Map<String, Object> latLng(double lat, double lng) {
        Map<String, Object> location = new LinkedHashMap<>();
        location.put("latLng", Map.of("latitude", lat, "longitude", lng));
        return Map.of("location", location);
    }

    private static int parseDurationSecondsToMinutes(String duration, double km) {
        if (duration != null && duration.endsWith("s")) {
            try {
                double seconds = Double.parseDouble(duration.substring(0, duration.length() - 1));
                return (int) Math.max(1, Math.ceil(seconds / 60.0));
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        return (int) Math.max(1, Math.ceil(km / AVG_SPEED_KMH * 60.0));
    }

    private static RouteResult fallback(double lat1, double lng1, double lat2, double lng2) {
        double km = haversineKm(lat1, lng1, lat2, lng2);
        int minutes = (int) Math.max(1, Math.ceil(km / AVG_SPEED_KMH * 60.0));
        return new RouteResult(round2(BigDecimal.valueOf(km)), minutes, true);
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static BigDecimal round2(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}