package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.FavoriteEvent;
import com.ticketbox.entity.User;
import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.FavoriteRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @PostMapping("/{eventId}")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleFavorite(
            Authentication auth, @PathVariable Long eventId) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        Map<String, Object> result = new HashMap<>();

        if (favoriteRepository.existsByUserIdAndEventId(user.getId(), eventId)) {
            favoriteRepository.deleteByUserIdAndEventId(user.getId(), eventId);
            result.put("favorited", false);
            log.info("❤️ User {} unfavorited event {}", user.getEmail(), eventId);
            return ResponseEntity.ok(ApiResponse.success("Đã bỏ yêu thích", result));
        } else {
            FavoriteEvent fav = FavoriteEvent.builder()
                    .user(user)
                    .event(event)
                    .build();
            favoriteRepository.save(fav);
            result.put("favorited", true);
            log.info("❤️ User {} favorited event {}", user.getEmail(), eventId);
            return ResponseEntity.ok(ApiResponse.success("Đã thêm yêu thích", result));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyFavorites(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Map<String, Object>> favorites = favoriteRepository.findByUserId(user.getId())
                .stream().map(fav -> {
                    Map<String, Object> map = new HashMap<>();
                    Event e = fav.getEvent();
                    map.put("eventId", e.getId());
                    map.put("title", e.getTitle());
                    map.put("description", e.getDescription());
                    map.put("location", e.getLocation());
                    map.put("imageUrl", e.getImageUrl());
                    map.put("startTime", e.getStartTime());
                    map.put("endTime", e.getEndTime());
                    map.put("status", e.getStatus().name());
                    map.put("favoritedAt", fav.getCreatedAt());
                    return map;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(favorites));
    }

    @GetMapping("/check/{eventId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkFavorite(
            Authentication auth, @PathVariable Long eventId) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> result = new HashMap<>();
        result.put("favorited", favoriteRepository.existsByUserIdAndEventId(user.getId(), eventId));
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
