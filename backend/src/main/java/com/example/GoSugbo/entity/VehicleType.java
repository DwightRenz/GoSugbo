package com.example.GoSugbo.entity;

import jakarta.persistence.AttributeConverter;

public enum VehicleType {
    MOTORCYCLE("motorcycle"),
    BICYCLE("bicycle"),
    CAR("car"),
    VAN("van"),
    TRUCK("truck");

    private final String value;

    VehicleType(String value) { this.value = value; }

    public String getValue() { return value; }

    public static VehicleType fromValue(String value) {
        for (VehicleType e : values()) {
            if (e.value.equalsIgnoreCase(value)) return e;
        }
        throw new IllegalArgumentException("Unknown VehicleType: " + value);
    }

    @jakarta.persistence.Converter
    public static class DbConverter implements AttributeConverter<VehicleType, String> {
        @Override
        public String convertToDatabaseColumn(VehicleType attribute) {
            return attribute == null ? null : attribute.value;
        }

        @Override
        public VehicleType convertToEntityAttribute(String dbData) {
            return dbData == null ? null : fromValue(dbData);
        }
    }
}