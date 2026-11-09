package com.example.GoSugbo.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.GoSugbo.config.CloudinaryProperties;
import com.example.GoSugbo.exception.ApiException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Uploads profile pictures to Cloudinary and returns a stable, CDN-backed URL.
 * Requires cloudinary.* properties to be configured; otherwise every call
 * fails with a clear 409 instead of booting down the app.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final CloudinaryProperties props;
    private Cloudinary cloudinary;

    @PostConstruct
    void init() {
        if (isBlank(props.cloudName()) || isBlank(props.apiKey()) || isBlank(props.apiSecret())) {
            log.warn("Cloudinary credentials are not configured. "
                    + "/api/riders/me/profile-picture will return 409 until they are set.");
            return;
        }
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", props.cloudName(),
                "api_key", props.apiKey(),
                "api_secret", props.apiSecret(),
                "secure", true
        ));
    }

    /** Uploads the file and returns {url, publicId}. */
    public UploadResult uploadProfilePicture(int userId, MultipartFile file) {
        validate(file);
        if (cloudinary == null) {
            throw ApiException.conflict(
                    "Image storage is not configured. Set CLOUDINARY_CLOUD_NAME, "
                            + "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
        }

        String publicId = "user_" + userId + "_" + UUID.randomUUID();
        Map<String, Object> options = new HashMap<>();
        options.put("folder", props.folder());
        options.put("public_id", publicId);
        options.put("overwrite", false);
        options.put("resource_type", "image");
        // Normalize dimensions server-side (max 512x512, crop to square, face-aware).
        options.put("transformation", "c_fill,g_face,w_512,h_512,q_auto:good,f_auto");

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader()
                    .upload(file.getBytes(), options);
            String secureUrl = (String) result.get("secure_url");
            String actualPublicId = (String) result.get("public_id");
            if (secureUrl == null || actualPublicId == null) {
                throw new IllegalStateException("Cloudinary response missing url/public_id");
            }
            return new UploadResult(secureUrl, actualPublicId);
        } catch (IOException e) {
            log.error("Failed to read uploaded profile picture for user {}", userId, e);
            throw ApiException.badRequest("Could not read the uploaded file");
        } catch (Exception e) {
            log.error("Cloudinary upload failed for user {}", userId, e);
            throw ApiException.conflict("Could not upload the picture. Please try again.");
        }
    }

    /** Best-effort deletion. Never throws, so it's safe to call after a DB save. */
    public void deleteByPublicId(String publicId) {
        if (publicId == null || publicId.isBlank() || cloudinary == null) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception e) {
            log.warn("Could not delete Cloudinary asset {}: {}", publicId, e.getMessage());
        }
    }

    /**
     * Extracts the Cloudinary public_id from a secure URL we previously stored.
     * Example: https://res.cloudinary.com/<cloud>/image/upload/v123/gosugbo/profile-pictures/user_5_abc.jpg
     * returns "gosugbo/profile-pictures/user_5_abc".
     */
    public static String publicIdFromUrl(String url) {
        if (url == null) return null;
        int idx = url.indexOf("/upload/");
        if (idx < 0) return null;
        String tail = url.substring(idx + "/upload/".length());
        if (tail.startsWith("v")) {
            int slash = tail.indexOf('/');
            if (slash > 0) tail = tail.substring(slash + 1);
        }
        int dot = tail.lastIndexOf('.');
        return dot > 0 ? tail.substring(0, dot) : tail;
    }

    private static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Please attach a picture");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("Picture must be 5 MB or smaller");
        }
        String ct = file.getContentType();
        if (ct == null || !(ct.equals("image/jpeg")
                || ct.equals("image/png")
                || ct.equals("image/webp"))) {
            throw ApiException.badRequest("Picture must be JPEG, PNG, or WebP");
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public record UploadResult(String url, String publicId) {}
}