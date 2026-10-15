package com.example.GoSugbo.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(
        title = "GoSugbo API",
        version = "1.0",
        description = "Delivery app backend. Log in via POST /api/auth/login, then click 'Authorize' "
                + "and paste the accessToken (without the word Bearer) to call protected endpoints."))
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT returned by POST /api/auth/login")
public class OpenApiConfig {
}