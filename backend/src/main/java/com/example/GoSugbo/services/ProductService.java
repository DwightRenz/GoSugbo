package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.ProductDtos.*;
import com.example.GoSugbo.entity.Product;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository products;
    private final StoreService storeService;

    // ------------------------------------------------------------------ reads

    /** Public browse: only active products of a store. */
    @Transactional(readOnly = true)
    public Page<ProductResponse> browseByStore(int storeId, Pageable pageable) {
        storeService.require(storeId); // 404 if store doesn't exist
        return products.findByStoreIdAndActiveTrue(storeId, pageable).map(ProductResponse::from);
    }

    /** Owner view: includes inactive products. */
    @Transactional(readOnly = true)
    public Page<ProductResponse> listMine(int ownerId, int storeId, Pageable pageable) {
        storeService.requireOwned(ownerId, storeId);
        return products.findByStoreId(storeId, pageable).map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(int productId) {
        Product p = require(productId);
        if (!p.isActive()) {
            throw ApiException.notFound("Product not found");
        }
        return ProductResponse.from(p);
    }

    // ----------------------------------------------------------------- writes

    @Transactional
    public ProductResponse create(int ownerId, int storeId, CreateProductRequest req) {
        storeService.requireOwned(ownerId, storeId);

        String name = req.name().trim();
        if (products.existsByStoreIdAndNameIgnoreCase(storeId, name)) {
            throw ApiException.conflict("A product with that name already exists in this store");
        }

        Product p = new Product();
        p.setStoreId(storeId);
        p.setName(name);
        p.setDescription(blankToNull(req.description()));
        p.setPrice(req.price());
        p.setStock(req.stock());
        p.setImage(blankToNull(req.image()));
        p.setCategory(blankToNull(req.category()));
        p.setActive(req.isActive() == null || req.isActive());

        return ProductResponse.from(products.save(p));
    }

    @Transactional
    public ProductResponse update(int ownerId, int productId, UpdateProductRequest req) {
        Product p = require(productId);
        storeService.requireOwned(ownerId, p.getStoreId());

        if (req.name() != null) {
            String name = req.name().trim();
            if (!name.equalsIgnoreCase(p.getName())
                    && products.existsByStoreIdAndNameIgnoreCase(p.getStoreId(), name)) {
                throw ApiException.conflict("A product with that name already exists in this store");
            }
            p.setName(name);
        }
        if (req.description() != null) p.setDescription(blankToNull(req.description()));
        if (req.price() != null)       p.setPrice(req.price());
        if (req.stock() != null)       p.setStock(req.stock());
        if (req.image() != null)       p.setImage(blankToNull(req.image()));
        if (req.category() != null)    p.setCategory(blankToNull(req.category()));
        if (req.isActive() != null)    p.setActive(req.isActive());

        return ProductResponse.from(products.save(p));
    }

    @Transactional
    public void delete(int ownerId, int productId) {
        Product p = require(productId);
        storeService.requireOwned(ownerId, p.getStoreId());
        products.delete(p);
    }

    // ---------------------------------------------------------------- helpers

    @Transactional(readOnly = true)
    public Product require(int productId) {
        return products.findById(productId)
                .orElseThrow(() -> ApiException.notFound("Product not found"));
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}