package com.example.GoSugbo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds google.maps.* properties from application.properties.
 * Register via @EnableConfigurationProperties(GoogleMapsProperties.class) on a @Configuration class
 * (GoogleMapsService already does this through @Service + @ConfigurationPropertiesScan alternative —
 * see note below).
 */
@ConfigurationProperties(prefix = "google.maps")
public record GoogleMapsProperties(
        String apiKey,
        String routesUrl,
        long timeoutMs
) {
    public GoogleMapsProperties {
        if (routesUrl == null || routesUrl.isBlank()) {
            routesUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";
        }
        if (timeoutMs <= 0) {
            timeoutMs = 3000L;
        }
    }

    public boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }
}