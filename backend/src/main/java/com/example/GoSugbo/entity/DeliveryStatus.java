package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum DeliveryStatus {
    ASSIGNED("assigned"),
    ACCEPTED("accepted"),
    ARRIVED_STORE("arrived_store"),
    PICKED_UP("picked_up"),
    IN_TRANSIT("in_transit"),
    ARRIVED_CUSTOMER("arrived_customer"),
    COMPLETED("completed"),
    FAILED("failed"),
    CANCELLED("cancelled");

    private final String value;

    DeliveryStatus(String value) { this.value = value; }

    public String getValue() { return value; }

    public static DeliveryStatus fromValue(String value) {
        for (DeliveryStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown delivery status: " + value);
    }

    @Converter(autoApply = false)
    public static class DbConverter implements AttributeConverter<DeliveryStatus, String> {
        @Override
        public String convertToDatabaseColumn(DeliveryStatus attribute) {
            return attribute == null ? null : attribute.value;
        }
        @Override
        public DeliveryStatus convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}