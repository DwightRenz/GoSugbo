package com.example.GoSugbo.dto;

import com.example.GoSugbo.entity.Product;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class ProductDtos {

    private ProductDtos() {}

    // ---------------------------------------------------------------- requests

    @Schema(description = "Add a product to a store (store owner only)")
    public record CreateProductRequest(
            @Schema(example = "Lechon Belly (1kg)") @NotBlank @Size(max = 150) String name,

            @Schema(example = "Crispy roasted pork belly.", nullable = true) String description,

            @Schema(example = "850.00") @NotNull
            @DecimalMin(value = "0.00", inclusive = true)
            @Digits(integer = 8, fraction = 2) BigDecimal price,

            @Schema(example = "10") @NotNull @Min(0) Integer stock,

            @Schema(example = "https://cdn.example.com/lechon.jpg", nullable = true) @Size(max = 255) String image,

            @Schema(example = "Main Dish", nullable = true) @Size(max = 80) String category,

            @Schema(example = "true", nullable = true) Boolean isActive) {}

    @Schema(description = "Update a product; null fields are left unchanged")
    public record UpdateProductRequest(
            @Schema(nullable = true) @Size(max = 150) String name,

            @Schema(nullable = true) String description,

            @Schema(nullable = true)
            @DecimalMin(value = "0.00", inclusive = true)
            @Digits(integer = 8, fraction = 2) BigDecimal price,

            @Schema(nullable = true) @Min(0) Integer stock,

            @Schema(nullable = true) @Size(max = 255) String image,

            @Schema(nullable = true) @Size(max = 80) String category,

            @Schema(nullable = true) Boolean isActive) {}

    // --------------------------------------------------------------- responses

    @Schema(description = "Public view of a product")
    public record ProductResponse(
            Integer id,
            Integer storeId,
            String name,
            String description,
            BigDecimal price,
            Integer stock,
            String image,
            String category,
            boolean isActive,
            LocalDateTime createdAt) {

        public static ProductResponse from(Product p) {
            return new ProductResponse(
                    p.getProductId(), p.getStoreId(), p.getName(), p.getDescription(),
                    p.getPrice(), p.getStock(), p.getImage(), p.getCategory(),
                    p.isActive(), p.getCreatedAt());
        }
    }
}