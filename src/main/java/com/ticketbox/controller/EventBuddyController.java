package com.ticketbox.controller;

import com.ticketbox.dto.request.BuddyRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.EventBuddyResponse;
import com.ticketbox.entity.User;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.service.EventBuddyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buddies")
@RequiredArgsConstructor
public class EventBuddyController {

    private final EventBuddyService eventBuddyService;
    private final UserRepository userRepository;

    /**
     * POST /api/buddies/request - Gửi lời mời kết bạn đi chung sự kiện
     */
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<EventBuddyResponse>> sendBuddyRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BuddyRequest request) {

        User user = getUserFromAuth(userDetails);
        EventBuddyResponse response = eventBuddyService.sendBuddyRequest(
                user.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi lời mời thành công", response));
    }

    /**
     * PUT /api/buddies/{id}/respond?accept=true|false - Chấp nhận/từ chối
     */
    @PutMapping("/{id}/respond")
    public ResponseEntity<ApiResponse<EventBuddyResponse>> respondBuddyRequest(
            @PathVariable Long id,
            @RequestParam boolean accept,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = getUserFromAuth(userDetails);
        EventBuddyResponse response = eventBuddyService.respondBuddyRequest(
                id, user.getId(), accept);

        String message = accept ? "Đã chấp nhận lời mời" : "Đã từ chối lời mời";
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    /**
     * GET /api/buddies/event/{eventId} - Danh sách buddy đã match
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<ApiResponse<List<EventBuddyResponse>>> getMyBuddies(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = getUserFromAuth(userDetails);
        List<EventBuddyResponse> buddies = eventBuddyService.getMyBuddies(
                eventId, user.getId());

        return ResponseEntity.ok(ApiResponse.success(buddies));
    }

    /**
     * GET /api/buddies/event/{eventId}/suggestions - Gợi ý kết nối
     */
    @GetMapping("/event/{eventId}/suggestions")
    public ResponseEntity<ApiResponse<List<Long>>> getSuggestions(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = getUserFromAuth(userDetails);
        List<Long> suggestions = eventBuddyService.findPotentialBuddies(
                eventId, user.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Gợi ý " + suggestions.size() + " người dùng",
                        suggestions));
    }

    private User getUserFromAuth(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
