package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;

public enum UserStatus {
    ACTIVE("active"),
    INACTIVE("inactive"),
    SUSPENDED("suspended"),
    PENDING("pending");

    private final String value;

    UserStatus(String value) { this.value = value; }

    public String getValue() { return value; }

    public static UserStatus fromValue(String value) {
        for (UserStatus e : values()) {
            if (e.value.equalsIgnoreCase(value)) return e;
        }
        throw new IllegalArgumentException("Unknown UserStatus: " + value);
    }

    @jakarta.persistence.Converter
    public static class DbConverter implements AttributeConverter<UserStatus, String> {
        @Override
        public String convertToDatabaseColumn(UserStatus attribute) {
            return attribute == null ? null : attribute.value;
        }

        @Override
        public UserStatus convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}