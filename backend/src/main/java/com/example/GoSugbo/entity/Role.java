package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;

public enum Role {
    CUSTOMER("customer"),
    RIDER("rider"),
    ADMIN("admin"),
    STORE_OWNER("store_owner");

    private final String value;

    Role(String value) { this.value = value; }

    public String getValue() { return value; }

    public static Role fromValue(String value) {
        for (Role e : values()) {
            if (e.value.equalsIgnoreCase(value)) return e;
        }
        throw new IllegalArgumentException("Unknown Role: " + value);
    }

    @jakarta.persistence.Converter
    public static class DbConverter implements AttributeConverter<Role, String> {
        @Override
        public String convertToDatabaseColumn(Role attribute) {
            return attribute == null ? null : attribute.value;
        }

        @Override
        public Role convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}