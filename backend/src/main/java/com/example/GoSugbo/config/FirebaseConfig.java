package com.example.GoSugbo.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Base64;

/**
 * Initializes FirebaseApp lazily so the app can boot without credentials.
 * Endpoints that require Firebase (e.g. /api/auth/google) fail with a clear
 * 503-style error until FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS_BASE64 is set.
 */
@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${firebase.credentials-base64:}")
    private String credentialsBase64;

    @Value("${firebase.project-id:}")
    private String projectId;

    @Bean
    public FirebaseApp firebaseApp() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        GoogleCredentials credentials = loadCredentials();
        if (credentials == null) {
            log.warn("Firebase credentials not configured. /api/auth/google will be unavailable "
                    + "until FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS_BASE64 is set.");
            return null;
        }

        FirebaseOptions.Builder builder = FirebaseOptions.builder().setCredentials(credentials);
        if (projectId != null && !projectId.isBlank()) {
            builder.setProjectId(projectId);
        }

        FirebaseApp app = FirebaseApp.initializeApp(builder.build());
        log.info("Firebase Admin initialized (projectId={})",
                app.getOptions().getProjectId());
        return app;
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp app) {
        return app == null ? null : FirebaseAuth.getInstance(app);
    }

    private GoogleCredentials loadCredentials() {
        try {
            if (credentialsBase64 != null && !credentialsBase64.isBlank()) {
                byte[] decoded = Base64.getDecoder().decode(credentialsBase64.trim());
                try (InputStream in = new ByteArrayInputStream(decoded)) {
                    return GoogleCredentials.fromStream(in);
                }
            }
            if (credentialsPath != null && !credentialsPath.isBlank()) {
                try (InputStream in = new FileInputStream(credentialsPath.trim())) {
                    return GoogleCredentials.fromStream(in);
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load Firebase credentials", e);
        }
        return null;
    }
}