package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.AuthDtos.RegisterAdminRequest;
import com.example.GoSugbo.entity.Role;
import com.example.GoSugbo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository users;
    private final AuthService authService;

    @Value("${app.bootstrap-admin.email:}")
    private String email;

    @Value("${app.bootstrap-admin.password:}")
    private String password;

    @Value("${app.bootstrap-admin.full-name:System Admin}")
    private String fullName;

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank() || users.existsByRole(Role.ADMIN)) {
            return;
        }
        authService.registerAdmin(new RegisterAdminRequest(email, password, fullName, null));
        log.warn("Bootstrap admin '{}' created. Change its password and remove app.bootstrap-admin.* from config.", email);
    }
}