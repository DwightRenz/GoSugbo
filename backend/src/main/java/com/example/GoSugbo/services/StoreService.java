package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.StoreDtos.*;
import com.example.GoSugbo.dto.StoreHourDtos.StoreHoursRequest;
import com.example.GoSugbo.dto.StoreHourDtos.StoreHourResponse;
import com.example.GoSugbo.entity.Store;
import com.example.GoSugbo.entity.StoreStatus;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final StoreRepository stores;
    private final AddressService addressService;
    private final StoreHourService storeHourService;

    // ------------------------------------------------------------------ reads

    /** Public browse: only active stores. */
    @Transactional(readOnly = true)
    public Page<StoreResponse> browseActive(Pageable pageable) {
        return stores.findByStatus(StoreStatus.ACTIVE, pageable).map(StoreResponse::from);
    }

    @Transactional(readOnly = true)
    public StoreResponse get(int storeId) {
        return StoreResponse.from(require(storeId));
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> listMine(int ownerId) {
        return stores.findByOwnerId(ownerId).stream().map(StoreResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<StoreHourResponse> getHours(int storeId) {
        require(storeId); // ensure store exists
        return storeHourService.list(storeId);
    }

    // ----------------------------------------------------------------- writes

    @Transactional
    public StoreResponse create(int ownerId, CreateStoreRequest req) {
        String name = req.name().trim();
        if (stores.existsByOwnerIdAndNameIgnoreCase(ownerId, name)) {
            throw ApiException.conflict("You already own a store with that name");
        }

        Store s = new Store();
        s.setOwnerId(ownerId);
        s.setName(name);
        s.setDescription(blankToNull(req.description()));
        s.setPhone(blankToNull(req.phone()));
        s.setLogoImage(blankToNull(req.logoImage()));
        s.setLatitude(req.latitude());
        s.setLongitude(req.longitude());
        s.setStatus(req.status() == null ? StoreStatus.ACTIVE : StoreStatus.fromValue(req.status()));

        if (req.addressId() != null) {
            addressService.requireOwned(ownerId, req.addressId()); // 400 if not theirs
            s.setAddressId(req.addressId());
        }

        return StoreResponse.from(stores.save(s));
    }

    @Transactional
    public StoreResponse update(int ownerId, int storeId, UpdateStoreRequest req) {
        Store s = requireOwned(ownerId, storeId);

        if (req.name() != null) {
            String name = req.name().trim();
            if (!name.equalsIgnoreCase(s.getName())
                    && stores.existsByOwnerIdAndNameIgnoreCase(ownerId, name)) {
                throw ApiException.conflict("You already own a store with that name");
            }
            s.setName(name);
        }
        if (req.description() != null) s.setDescription(blankToNull(req.description()));
        if (req.phone() != null)       s.setPhone(blankToNull(req.phone()));
        if (req.logoImage() != null)   s.setLogoImage(blankToNull(req.logoImage()));
        if (req.addressId() != null) {
            addressService.requireOwned(ownerId, req.addressId());
            s.setAddressId(req.addressId());
        }
        if (req.latitude() != null)    s.setLatitude(req.latitude());
        if (req.longitude() != null)   s.setLongitude(req.longitude());
        if (req.status() != null)      s.setStatus(StoreStatus.fromValue(req.status()));

        return StoreResponse.from(stores.save(s));
    }

    @Transactional
    public void delete(int ownerId, int storeId) {
        stores.delete(requireOwned(ownerId, storeId));
    }

    @Transactional
    public List<StoreHourResponse> replaceHours(int ownerId, int storeId, StoreHoursRequest req) {
        requireOwned(ownerId, storeId);
        return storeHourService.replace(storeId, req);
    }

    /** Admin-only hard status change (activate/suspend a store). */
    @Transactional
    public StoreResponse setStatus(int storeId, String status) {
        Store s = require(storeId);
        s.setStatus(StoreStatus.fromValue(status));
        return StoreResponse.from(stores.save(s));
    }

    // ---------------------------------------------------------------- helpers

    /** Used by ProductService to confirm store ownership before product writes. */
    @Transactional(readOnly = true)
    public Store requireOwned(int ownerId, int storeId) {
        Store s = require(storeId);
        if (!s.getOwnerId().equals(ownerId)) {
            throw ApiException.forbidden("You do not own this store");
        }
        return s;
    }

    @Transactional(readOnly = true)
    public Store require(int storeId) {
        return stores.findById(storeId)
                .orElseThrow(() -> ApiException.notFound("Store not found"));
    }

    /**
     * NEW: non-throwing ownership check.
     * Safe to call inside another @Transactional method — a false result does
     * NOT mark the surrounding transaction as rollback-only.
     */
    @Transactional(readOnly = true)
    public boolean isOwner(int userId, int storeId) {
        return stores.existsByStoreIdAndOwnerId(storeId, userId);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}