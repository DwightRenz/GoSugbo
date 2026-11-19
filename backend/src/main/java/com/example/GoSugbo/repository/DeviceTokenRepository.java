package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    List<DeviceToken> findByUserId(Integer userId);

    Optional<DeviceToken> findByToken(String token);

    void deleteByToken(String token);

    void deleteByUserIdAndToken(Integer userId, String token);
}