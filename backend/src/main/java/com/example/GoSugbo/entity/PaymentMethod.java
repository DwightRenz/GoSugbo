package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum PaymentMethod {
    COD("cod"),
    CASH("cash"),
    CARD("card"),
    GCASH("gcash"),
    MAYA("maya"),
    BANK_TRANSFER("bank_transfer");

    private final String value;

    PaymentMethod(String value) { this.value = value; }

    public String getValue() { return value; }

    public static PaymentMethod fromValue(String value) {
        for (PaymentMethod m : values()) {
            if (m.value.equalsIgnoreCase(value)) return m;
        }
        throw new IllegalArgumentException("Unknown payment method: " + value);
    }

    @Converter(autoApply = false)
    public static class DbConverter implements AttributeConverter<PaymentMethod, String> {
        @Override
        public String convertToDatabaseColumn(PaymentMethod attribute) {
            return attribute == null ? null : attribute.value;
        }
        @Override
        public PaymentMethod convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}