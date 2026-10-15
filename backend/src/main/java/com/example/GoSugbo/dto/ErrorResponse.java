package com.example.GoSugbo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

@Schema(description = "Standard error body returned by every endpoint")
public record ErrorResponse(
        @Schema(example = "2026-10-15T08:30:00Z") Instant timestamp,
        @Schema(example = "400") int status,
        @Schema(example = "Bad Request") String error,
        @Schema(example = "Validation failed") String message,
        @Schema(description = "Per-field validation messages (empty when not a validation error)",
                example = "{\"email\":\"must be a well-formed email address\"}")
        Map<String, String> fieldErrors) {

    public static ErrorResponse of(HttpStatus status, String message, Map<String, String> fieldErrors) {
        return new ErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), message, fieldErrors);
    }
}