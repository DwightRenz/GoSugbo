package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.StoreHour;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.util.List;

public final class StoreHourDtos {

    private StoreHourDtos() {}

    @Schema(description = "One opening-hours window. dayOfWeek: 0=Sunday .. 6=Saturday")
    public record StoreHourItem(
            @Schema(example = "1", description = "0=Sunday, 1=Monday, ... 6=Saturday")
            @NotNull @Min(0) @Max(6) Byte dayOfWeek,

            @Schema(example = "08:00:00") @NotNull LocalTime openTime,

            @Schema(example = "22:00:00") @NotNull LocalTime closeTime) {}

    @Schema(description = "Replace the full weekly schedule of a store")
    public record StoreHoursRequest(
            @Schema(description = "Full weekly schedule; replaces any existing rows")
            @NotNull List<StoreHourItem> hours) {}

    @Schema(description = "Public view of one opening-hours row")
    public record StoreHourResponse(
            Integer id,
            Byte dayOfWeek,
            LocalTime openTime,
            LocalTime closeTime) {

        public static StoreHourResponse from(StoreHour h) {
            return new StoreHourResponse(
                    h.getStoreHourId(), h.getDayOfWeek(), h.getOpenTime(), h.getCloseTime());
        }
    }
}