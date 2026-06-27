package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.FollowOrganizer;
import com.ticketbox.entity.User;
import com.ticketbox.repository.FollowOrganizerRepository;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/organizers")
@RequiredArgsConstructor
public class FollowOrganizerController {

    private final FollowOrganizerRepository followOrganizerRepository;
    private final UserRepository userRepository;

    @PostMapping("/{id}/follow")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> followOrganizer(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        User organizer = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));

        if (organizer.getRole() != com.ticketbox.enums.UserRole.ROLE_ORGANIZER) {
            throw new IllegalArgumentException("Tài khoản này không phải là Ban tổ chức");
        }

        if (user.getId().equals(organizer.getId())) {
            throw new IllegalArgumentException("Bạn không thể tự theo dõi chính mình");
        }

        if (followOrganizerRepository.existsByUserIdAndOrganizerId(user.getId(), organizer.getId())) {
            return ResponseEntity.ok(ApiResponse.success("Bạn đã theo dõi Ban tổ chức này rồi", Map.of("followed", true)));
        }

        FollowOrganizer follow = FollowOrganizer.builder()
                .user(user)
                .organizer(organizer)
                .build();
        
        followOrganizerRepository.save(follow);

        return ResponseEntity.ok(ApiResponse.success("Theo dõi Ban tổ chức thành công", Map.of("followed", true)));
    }

    @PostMapping("/{id}/unfollow")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> unfollowOrganizer(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        followOrganizerRepository.deleteByUserIdAndOrganizerId(user.getId(), id);

        return ResponseEntity.ok(ApiResponse.success("Đã hủy theo dõi Ban tổ chức", Map.of("followed", false)));
    }

    @GetMapping("/{id}/is-following")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> isFollowing(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        boolean followed = followOrganizerRepository.existsByUserIdAndOrganizerId(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("followed", followed)));
    }

    @GetMapping("/followed")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFollowedOrganizers(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        List<FollowOrganizer> follows = followOrganizerRepository.findByUserId(userDetails.getId());
        List<Map<String, Object>> result = follows.stream().map(f -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", f.getOrganizer().getId());
            map.put("fullName", f.getOrganizer().getFullName());
            map.put("email", f.getOrganizer().getEmail());
            map.put("avatarUrl", f.getOrganizer().getAvatarUrl());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
