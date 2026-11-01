package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.OtpPurpose;
import com.example.GoSugbo.entity.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findFirstByEmailAndPurposeOrderByCreatedAtDesc(String email, OtpPurpose purpose);

    @Modifying
    @Query("delete from OtpToken o where o.email = :email and o.purpose = :purpose")
    void deleteAllFor(@Param("email") String email, @Param("purpose") OtpPurpose purpose);

    @Modifying
    @Query("delete from OtpToken o where o.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}