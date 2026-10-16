package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.ErrorResponse;
import com.example.GoSugbo.dto.ProductDtos.*;
import com.example.GoSugbo.services.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Product browsing and store-owner management")
public class ProductController {

    private final ProductService productService;

    // --------------------------------------------------------------- public

    @GetMapping("/stores/{storeId}/products")
    @Operation(summary = "Browse a store's active products",
            description = "Public. Returns only products with is_active=true. "
                    + "Use ?page=0&size=20&sort=name,asc on the query string.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of products",
                    content = @Content(schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public Page<ProductResponse> browseByStore(@PathVariable Integer storeId, Pageable pageable) {
        return productService.browseByStore(storeId, pageable);
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Get a product by id",
            description = "Public. Returns 404 if the product is inactive, so it can't be linked to "
                    + "by customers who guessed an id.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Product found",
                    content = @Content(schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "404", description = "Product not found or inactive",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ProductResponse get(@PathVariable Integer id) {
        return productService.get(id);
    }

    // --------------------------------------------------------- store owner

    @GetMapping("/stores/{storeId}/products/mine")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "List my store's products (including inactive)",
            description = "Store owner only. Returns every product of the store, active or not.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of products",
                    content = @Content(schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public Page<ProductResponse> mine(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                      @PathVariable Integer storeId,
                                      Pageable pageable) {
        return productService.listMine(AddressController.currentUserId(jwt), storeId, pageable);
    }

    @PostMapping("/stores/{storeId}/products")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Add a product to a store",
            description = "Only the store owner can add products. Defaults: stock=0, is_active=true.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Product created",
                    content = @Content(schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "A product with that name already exists",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ProductResponse create(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                  @PathVariable Integer storeId,
                                  @Valid @RequestBody CreateProductRequest request) {
        return productService.create(AddressController.currentUserId(jwt), storeId, request);
    }

    @PutMapping("/products/{id}")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Update a product",
            description = "Only the store owner can update. Null fields are left unchanged.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Product updated",
                    content = @Content(schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Product not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "A product with that name already exists",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ProductResponse update(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                  @PathVariable Integer id,
                                  @Valid @RequestBody UpdateProductRequest request) {
        return productService.update(AddressController.currentUserId(jwt), id, request);
    }

    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Delete a product",
            description = "Only the store owner can delete. Consider PATCHing is_active=false "
                    + "instead, to keep historical order_items intact.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Product deleted"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Product not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public void delete(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                       @PathVariable Integer id) {
        productService.delete(AddressController.currentUserId(jwt), id);
    }
}