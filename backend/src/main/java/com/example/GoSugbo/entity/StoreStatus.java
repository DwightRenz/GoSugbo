package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum StoreStatus {
    ACTIVE("active"),
    INACTIVE("inactive"),
    CLOSED("closed");

    private final String value;

    StoreStatus(String value) { this.value = value; }

    public String getValue() { return value; }

    public static StoreStatus fromValue(String value) {
        for (StoreStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown store status: " + value);
    }

    @Converter(autoApply = false)
    public static class DbConverter implements AttributeConverter<StoreStatus, String> {
        @Override
        public String convertToDatabaseColumn(StoreStatus attribute) {
            return attribute == null ? null : attribute.value;
        }
        @Override
        public StoreStatus convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}