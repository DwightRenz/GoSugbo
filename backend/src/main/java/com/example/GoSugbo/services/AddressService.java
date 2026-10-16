package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.AddressDtos.*;
import com.example.GoSugbo.entity.Address;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.AddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addresses;

    @Transactional(readOnly = true)
    public List<AddressResponse> listForUser(int userId) {
        return addresses.findByUserIdOrderByDefaultAddressDescCreatedAtDesc(userId)
                .stream().map(AddressResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AddressResponse getForUser(int userId, int addressId) {
        return addresses.findByAddressIdAndUserId(addressId, userId)
                .map(AddressResponse::from)
                .orElseThrow(() -> ApiException.notFound("Address not found"));
    }

    @Transactional
    public AddressResponse create(int userId, AddressRequest req) {
        Address a = new Address();
        a.setUserId(userId);
        apply(a, req);

        if (Boolean.TRUE.equals(req.isDefault())) {
            addresses.clearDefaultForUser(userId);
            a.setDefaultAddress(true);
        }

        // First address is automatically the default
        if (addresses.findByUserIdOrderByDefaultAddressDescCreatedAtDesc(userId).isEmpty()) {
            a.setDefaultAddress(true);
        }

        return AddressResponse.from(addresses.save(a));
    }

    @Transactional
    public AddressResponse update(int userId, int addressId, AddressRequest req) {
        Address a = addresses.findByAddressIdAndUserId(addressId, userId)
                .orElseThrow(() -> ApiException.notFound("Address not found"));
        apply(a, req);

        if (Boolean.TRUE.equals(req.isDefault())) {
            addresses.clearDefaultForUser(userId);
            a.setDefaultAddress(true);
        }
        return AddressResponse.from(addresses.save(a));
    }

    @Transactional
    public void delete(int userId, int addressId) {
        Address a = addresses.findByAddressIdAndUserId(addressId, userId)
                .orElseThrow(() -> ApiException.notFound("Address not found"));

        boolean wasDefault = a.isDefaultAddress();
        addresses.delete(a);

        // Promote the most recent remaining address to default
        if (wasDefault) {
            addresses.findByUserIdOrderByDefaultAddressDescCreatedAtDesc(userId)
                    .stream().findFirst()
                    .ifPresent(next -> { next.setDefaultAddress(true); addresses.save(next); });
        }
    }

    /** Ownership check used by StoreService when linking an address to a store. */
    @Transactional(readOnly = true)
    public Address requireOwned(int userId, int addressId) {
        return addresses.findByAddressIdAndUserId(addressId, userId)
                .orElseThrow(() -> ApiException.badRequest("Address does not belong to you"));
    }

    // ----------------------------------------------------------------- helpers

    private static void apply(Address a, AddressRequest r) {
        if (r.label() != null)      a.setLabel(blankToNull(r.label(), "Home"));
        if (r.line1() != null)      a.setLine1(r.line1().trim());
        if (r.line2() != null)      a.setLine2(blankToNull(r.line2(), null));
        if (r.city() != null)       a.setCity(r.city().trim());
        if (r.province() != null)   a.setProvince(blankToNull(r.province(), null));
        if (r.postalCode() != null) a.setPostalCode(blankToNull(r.postalCode(), null));
        if (r.country() != null)    a.setCountry(blankToNull(r.country(), "Philippines"));
        if (r.latitude() != null)   a.setLatitude(r.latitude());
        if (r.longitude() != null)  a.setLongitude(r.longitude());
    }

    private static String blankToNull(String s, String fallback) {
        if (s == null) return fallback;
        String t = s.trim();
        return t.isEmpty() ? fallback : t;
    }
}