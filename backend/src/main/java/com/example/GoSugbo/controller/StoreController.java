package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.ErrorResponse;
import com.example.GoSugbo.dto.StoreDtos.*;
import com.example.GoSugbo.dto.StoreHourDtos.StoreHourResponse;
import com.example.GoSugbo.dto.StoreHourDtos.StoreHoursRequest;
import com.example.GoSugbo.services.StoreService;
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

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
@Tag(name = "Stores", description = "Store browsing and store-owner management")
public class StoreController {

    private final StoreService storeService;

    // --------------------------------------------------------------- public

    @GetMapping
    @Operation(summary = "Browse active stores",
            description = "Public. Returns a paginated list of stores with status='active'. "
                    + "Use ?page=0&size=20&sort=name,asc on the query string.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of stores",
                    content = @Content(schema = @Schema(implementation = StoreResponse.class)))
    })
    public Page<StoreResponse> browse(Pageable pageable) {
        return storeService.browseActive(pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a store by id",
            description = "Public. Returns the store regardless of status, so the frontend can "
                    + "render a 'closed' page rather than a 404.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Store found",
                    content = @Content(schema = @Schema(implementation = StoreResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public StoreResponse get(@PathVariable Integer id) {
        return storeService.get(id);
    }

    @GetMapping("/{id}/hours")
    @Operation(summary = "Get a store's weekly hours",
            description = "Public. Returns all opening-hours rows for the store, ordered by dayOfWeek.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of opening-hours rows",
                    content = @Content(schema = @Schema(implementation = StoreHourResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public List<StoreHourResponse> getHours(@PathVariable Integer id) {
        return storeService.getHours(id);
    }

    // --------------------------------------------------------- store owner

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Create a store",
            description = "Admin or store-owner only. The logged-in user becomes the owner. "
                    + "If addressId is provided, it must be an address owned by the same user.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Store created",
                    content = @Content(schema = @Schema(implementation = StoreResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or address not owned",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller is not an admin or store owner",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "You already own a store with that name",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public StoreResponse create(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                @Valid @RequestBody CreateStoreRequest request) {
        return storeService.create(AddressController.currentUserId(jwt), request);
    }

    @GetMapping("/mine")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "List my stores",
            description = "Returns every store owned by the logged-in user, regardless of status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of stores",
                    content = @Content(schema = @Schema(implementation = StoreResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller is not an admin or store owner",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public List<StoreResponse> mine(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return storeService.listMine(AddressController.currentUserId(jwt));
    }

    @PutMapping("/{id}")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Update a store",
            description = "Only the store owner (or an admin acting on their own store) can update. "
                    + "Null fields are left unchanged.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Store updated",
                    content = @Content(schema = @Schema(implementation = StoreResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or address not owned",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "You already own a store with that name",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public StoreResponse update(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                @PathVariable Integer id,
                                @Valid @RequestBody UpdateStoreRequest request) {
        return storeService.update(AddressController.currentUserId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Delete a store",
            description = "Only the store owner can delete. Products and store hours are removed "
                    + "via ON DELETE CASCADE.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Store deleted"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public void delete(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                       @PathVariable Integer id) {
        storeService.delete(AddressController.currentUserId(jwt), id);
    }

    @PutMapping("/{id}/hours")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_OWNER')")
    @Operation(summary = "Replace a store's weekly hours",
            description = "Full replace: the old schedule is wiped and the new one is saved in a "
                    + "single transaction. Each entry must have open_time < close_time.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Hours replaced",
                    content = @Content(schema = @Schema(implementation = StoreHourResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed (e.g. open >= close)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not own this store",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Store not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public List<StoreHourResponse> replaceHours(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                                @PathVariable Integer id,
                                                @Valid @RequestBody StoreHoursRequest request) {
        return storeService.replaceHours(AddressController.currentUserId(jwt), id, request);
    }
}