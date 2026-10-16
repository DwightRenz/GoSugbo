package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum PaymentStatus {
    PENDING("pending"),
    PAID("paid"),
    FAILED("failed"),
    REFUNDED("refunded");

    private final String value;

    PaymentStatus(String value) { this.value = value; }

    public String getValue() { return value; }

    public static PaymentStatus fromValue(String value) {
        for (PaymentStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown payment status: " + value);
    }

    @Converter(autoApply = false)
    public static class DbConverter implements AttributeConverter<PaymentStatus, String> {
        @Override
        public String convertToDatabaseColumn(PaymentStatus attribute) {
            return attribute == null ? null : attribute.value;
        }
        @Override
        public PaymentStatus convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}