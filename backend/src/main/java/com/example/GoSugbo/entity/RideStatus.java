package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum RideStatus {
    REQUESTED("requested"),
    ACCEPTED("accepted"),
    ARRIVED_PICKUP("arrived_pickup"),
    IN_PROGRESS("in_progress"),
    COMPLETED("completed"),
    CANCELLED("cancelled"),
    NO_SHOW("no_show");

    private final String value;

    RideStatus(String value) { this.value = value; }

    public String getValue() { return value; }

    public static RideStatus fromValue(String value) {
        for (RideStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown ride status: " + value);
    }

    @Converter(autoApply = false)
    public static class DbConverter implements AttributeConverter<RideStatus, String> {
        @Override
        public String convertToDatabaseColumn(RideStatus attribute) {
            return attribute == null ? null : attribute.value;
        }
        @Override
        public RideStatus convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}