package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum OrderStatus {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    PREPARING("preparing"),
    READY_FOR_PICKUP("ready_for_pickup"),
    PICKED_UP("picked_up"),
    IN_TRANSIT("in_transit"),
    DELIVERED("delivered"),
    CANCELLED("cancelled"),
    REFUNDED("refunded");

    private final String value;

    OrderStatus(String value) { this.value = value; }

    public String getValue() { return value; }

    public static OrderStatus fromValue(String value) {
        for (OrderStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown order status: " + value);
    }

    @Converter(autoApply = false)
    public static class DbConverter implements AttributeConverter<OrderStatus, String> {
        @Override
        public String convertToDatabaseColumn(OrderStatus attribute) {
            return attribute == null ? null : attribute.value;
        }
        @Override
        public OrderStatus convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}