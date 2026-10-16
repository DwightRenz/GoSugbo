package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.StoreHourDtos.*;
import com.example.GoSugbo.entity.StoreHour;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.StoreHourRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StoreHourService {

    private final StoreHourRepository storeHours;

    @Transactional(readOnly = true)
    public List<StoreHourResponse> list(int storeId) {
        return storeHours.findByStoreIdOrderByDayOfWeekAsc(storeId)
                .stream().map(StoreHourResponse::from).toList();
    }

    /** Full replace: wipe old rows and insert the new schedule. Called by StoreService. */
    @Transactional
    public List<StoreHourResponse> replace(int storeId, StoreHoursRequest req) {
        if (req.hours().isEmpty()) {
            throw ApiException.badRequest("hours must contain at least one entry");
        }
        for (StoreHourItem item : req.hours()) {
            if (!item.openTime().isBefore(item.closeTime())) {
                throw ApiException.badRequest(
                        "open_time must be before close_time for day " + item.dayOfWeek());
            }
        }

        storeHours.deleteByStoreId(storeId);
        List<StoreHour> saved = req.hours().stream().map(item -> {
            StoreHour h = new StoreHour();
            h.setStoreId(storeId);
            h.setDayOfWeek(item.dayOfWeek());
            h.setOpenTime(item.openTime());
            h.setCloseTime(item.closeTime());
            return h;
        }).toList();

        return storeHours.saveAll(saved).stream().map(StoreHourResponse::from).toList();
    }
}