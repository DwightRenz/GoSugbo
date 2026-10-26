package com.example.GoSugbo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PayMongoConfig {
    @Value("${paymongo.base-url}")
    private String baseUrl;

    @Bean
    public WebClient payMongoWebClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }
}