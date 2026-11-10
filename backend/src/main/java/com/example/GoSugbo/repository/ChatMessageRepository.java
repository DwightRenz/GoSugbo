package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByRideIdOrderByCreatedAtAsc(Integer rideId);

    List<ChatMessage> findTop200ByRideIdOrderByCreatedAtDesc(Integer rideId);
}