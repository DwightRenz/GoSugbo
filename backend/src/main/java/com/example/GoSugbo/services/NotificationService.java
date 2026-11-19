package com.example.GoSugbo.services;

import com.example.GoSugbo.dto.NotificationDtos.NotificationResult;
import com.example.GoSugbo.entity.DeviceToken;
import com.example.GoSugbo.exception.ApiException;
import com.example.GoSugbo.repository.DeviceTokenRepository;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class NotificationService {

    private final DeviceTokenRepository tokens;
    private final FirebaseApp firebaseApp;

    public NotificationService(DeviceTokenRepository tokens,
                               @Autowired(required = false) FirebaseApp firebaseApp) {
        this.tokens = tokens;
        this.firebaseApp = firebaseApp;
    }

    // ------------------------------------------------------------- token CRUD

    @Transactional
    public void registerToken(Integer userId, String token, String platform, String deviceInfo) {
        // If the token exists but belongs to another user (device was re-used), move it.
        DeviceToken row = tokens.findByToken(token).orElseGet(DeviceToken::new);
        row.setUserId(userId);
        row.setToken(token);
        row.setPlatform(platform);
        row.setDeviceInfo(deviceInfo);
        tokens.save(row);
    }

    @Transactional
    public void unregisterToken(Integer userId, String token) {
        tokens.deleteByUserIdAndToken(userId, token);
    }

    // ---------------------------------------------------------- send to users

    /** Fire-and-forget push; logs and swallows Firebase errors so callers never fail. */
    public void sendToUser(Integer userId, String title, String body, Map<String, String> data) {
        try {
            sendToUserOrThrow(userId, title, body, data);
        } catch (Exception e) {
            log.warn("Push to user {} failed: {}", userId, e.getMessage());
        }
    }

    public NotificationResult sendToUserOrThrow(Integer userId, String title, String body,
                                                Map<String, String> data) {
        if (firebaseApp == null) {
            throw ApiException.serviceUnavailable("Push notifications are not configured on this server");
        }
        List<DeviceToken> rows = tokens.findByUserId(userId);
        if (rows.isEmpty()) {
            return new NotificationResult(0, 0, "User has no registered devices");
        }
        return sendMulticast(rows.stream().map(DeviceToken::getToken).toList(), title, body, data);
    }

    public NotificationResult sendToUsers(List<Integer> userIds, String title, String body,
                                          Map<String, String> data) {
        if (firebaseApp == null) {
            throw ApiException.serviceUnavailable("Push notifications are not configured on this server");
        }
        if (userIds == null || userIds.isEmpty()) {
            return new NotificationResult(0, 0, "No users provided");
        }
        List<String> targets = userIds.stream()
                .flatMap(id -> tokens.findByUserId(id).stream())
                .map(DeviceToken::getToken)
                .distinct()
                .toList();
        return sendMulticast(targets, title, body, data);
    }

    // ---------------------------------------------------------------- internals

    private NotificationResult sendMulticast(List<String> targetTokens, String title,
                                             String body, Map<String, String> data) {
        if (targetTokens.isEmpty()) {
            return new NotificationResult(0, 0, "No device tokens");
        }

        Notification notification = Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build();

        Map<String, String> payload = data == null ? new HashMap<>() : new HashMap<>(data);
        payload.putIfAbsent("click_action", "FLUTTER_NOTIFICATION_CLICK");

        MulticastMessage message = MulticastMessage.builder()
                .setNotification(notification)
                .putAllData(payload)
                .addAllTokens(targetTokens)
                .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .setNotification(AndroidNotification.builder()
                                .setChannelId("gosugbo_default")
                                .setSound("default")
                                .build())
                        .build())
                .setApnsConfig(ApnsConfig.builder()
                        .setAps(Aps.builder().setSound("default").setBadge(1).build())
                        .build())
                .build();

        try {
            BatchResponse resp = FirebaseMessaging.getInstance(firebaseApp).sendEachForMulticast(message);
            cleanupInvalidTokens(targetTokens, resp);
            return new NotificationResult(resp.getSuccessCount(), resp.getFailureCount(), null);
        } catch (FirebaseMessagingException e) {
            log.error("FCM multicast failed: {}", e.getMessage());
            throw ApiException.serviceUnavailable("Could not send push notification");
        }
    }

    private void cleanupInvalidTokens(List<String> sentTokens, BatchResponse resp) {
        List<SendResponse> responses = resp.getResponses();
        for (int i = 0; i < responses.size(); i++) {
            SendResponse r = responses.get(i);
            if (r.isSuccessful()) continue;
            MessagingErrorCode code = r.getException().getMessagingErrorCode();
            if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT) {
                String stale = sentTokens.get(i);
                log.info("Removing invalid FCM token: {}", stale);
                tokens.findByToken(stale).ifPresent(tokens::delete);
            }
        }
    }
}