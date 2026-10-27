package com.example.GoSugbo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.ws.endpoint:/ws}")
    private String endpoint;

    @Value("${app.ws.allowed-origin-patterns:*}")
    private String[] allowedOriginPatterns;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(endpoint)
                .setAllowedOriginPatterns(allowedOriginPatterns);
        // .withSockJS(); // uncomment if your frontend needs SockJS fallback
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker; topics the server publishes to
        registry.enableSimpleBroker("/topic");
        // Prefix for client→server destinations (not used in design A, but kept for future)
        registry.setApplicationDestinationPrefixes("/app");
    }
}