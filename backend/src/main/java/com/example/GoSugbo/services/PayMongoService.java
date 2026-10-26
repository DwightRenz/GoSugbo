package com.example.GoSugbo.services;

import com.example.GoSugbo.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PayMongoService {

    private final WebClient payMongoWebClient;
    @Value("${paymongo.secret-key}")
    private String secretKey;

    public String createCheckoutSession(String orderCode, long amountInCentavos, String successUrl, String cancelUrl) {
        String auth = Base64.getEncoder().encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));

        Map<String, Object> body = Map.of(
                "data", Map.of(
                        "attributes", Map.of(
                                "line_items", List.of(Map.of(
                                        "currency", "PHP",
                                        "amount", amountInCentavos,
                                        "name", "Order " + orderCode,
                                        "quantity", 1
                                )),
                                "payment_method_types", List.of("card", "gcash", "paymaya", "grab_pay"),
                                "success_url", successUrl,
                                "cancel_url", cancelUrl,
                                "description", "Payment for " + orderCode,
                                "send_email_receipt", false,
                                "show_description", true,
                                "show_line_items", true
                        )
                )
        );

        try {
            Map response = payMongoWebClient.post()
                    .uri("/checkout_sessions")
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + auth)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            clientResponse -> clientResponse.bodyToMono(String.class)
                                    .flatMap(err -> Mono.error(ApiException.badRequest("PayMongo error: " + err))))
                    .bodyToMono(Map.class)
                    .block();

            if (response == null || response.get("data") == null) {
                throw ApiException.conflict("Empty response from PayMongo");
            }
            Map data = (Map) response.get("data");
            Map attributes = (Map) data.get("attributes");
            return (String) attributes.get("checkout_url");

        } catch (Exception e) {
            throw ApiException.conflict("Failed to create PayMongo checkout: " + e.getMessage());
        }
    }
}