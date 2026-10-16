package com.example.GoSugbo.controller;

import com.example.GoSugbo.dto.AddressDtos.*;
import com.example.GoSugbo.dto.ErrorResponse;
import com.example.GoSugbo.services.AddressService;
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
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Addresses", description = "Address book for the logged-in user (any role)")
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    @Operation(summary = "List my addresses",
            description = "Returns all addresses belonging to the logged-in user, default first.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of addresses",
                    content = @Content(schema = @Schema(implementation = AddressResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing, invalid, expired or revoked token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public List<AddressResponse> list(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return addressService.listForUser(currentUserId(jwt));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one of my addresses")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Address found",
                    content = @Content(schema = @Schema(implementation = AddressResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Address not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public AddressResponse get(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                               @PathVariable Integer id) {
        return addressService.getForUser(currentUserId(jwt), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an address",
            description = "Creates a new address for the logged-in user. "
                    + "If isDefault=true, all other addresses of this user are unset as default. "
                    + "The first address created by a user is automatically the default.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Address created",
                    content = @Content(schema = @Schema(implementation = AddressResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public AddressResponse create(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                  @Valid @RequestBody AddressRequest request) {
        return addressService.create(currentUserId(jwt), request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an address",
            description = "Full update of an address owned by the caller.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Address updated",
                    content = @Content(schema = @Schema(implementation = AddressResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Address not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public AddressResponse update(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                  @PathVariable Integer id,
                                  @Valid @RequestBody AddressRequest request) {
        return addressService.update(currentUserId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an address",
            description = "Deletes an address owned by the caller. If it was the default, "
                    + "the next most recent address is promoted to default automatically.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Address deleted"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Address not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public void delete(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                       @PathVariable Integer id) {
        addressService.delete(currentUserId(jwt), id);
    }

    // ----------------------------------------------------------------- helpers

    static int currentUserId(Jwt jwt) {
        return Integer.parseInt(jwt.getSubject());
    }
}