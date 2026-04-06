package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.Notification;
import com.ticketbox.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.ticketbox.repository.UserRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ApiResponse<List<Notification>> getNotifications(Authentication auth) {
        var user = userRepository.findByEmail(auth.getName()).orElseThrow();
        return ApiResponse.success(notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> getUnreadCount(Authentication auth) {
        var user = userRepository.findByEmail(auth.getName()).orElseThrow();
        long count = notificationRepository.countByUserIdAndIsReadFalse(user.getId());
        return ApiResponse.success(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ApiResponse<String> markAsRead(@PathVariable Long id) {
        var notification = notificationRepository.findById(id).orElseThrow();
        notification.setIsRead(true);
        notificationRepository.save(notification);
        return ApiResponse.success("Đã đọc");
    }

    @PutMapping("/read-all")
    public ApiResponse<String> markAllAsRead(Authentication auth) {
        var user = userRepository.findByEmail(auth.getName()).orElseThrow();
        var notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);
        return ApiResponse.success("Đã đọc tất cả");
    }
}
