package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.EventReview;
import com.ticketbox.entity.User;
import com.ticketbox.enums.UserRole;
import com.ticketbox.repository.EventReviewRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewManagementController {

    private final EventReviewRepository reviewRepository;
    private final UserRepository userRepository;

    /**
     * GET /api/reviews/manage — Lấy danh sách đánh giá để quản trị (Admin hoặc Organizer)
     */
    @GetMapping("/manage")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getManageReviews(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<EventReview> reviews;
        if (currentUser.getRole() == UserRole.ROLE_ADMIN) {
            reviews = reviewRepository.findAllByOrderByCreatedAtDesc();
        } else if (currentUser.getRole() == UserRole.ROLE_ORGANIZER) {
            reviews = reviewRepository.findByEventOrganizerIdOrderByCreatedAtDesc(currentUser.getId());
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Bạn không có quyền thực hiện hành động này"));
        }

        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("rating", r.getRating());
            map.put("comment", r.getComment());
            map.put("createdAt", r.getCreatedAt());
            map.put("hidden", r.getHidden() != null ? r.getHidden() : false);
            map.put("eventId", r.getEvent().getId());
            map.put("eventTitle", r.getEvent().getTitle());
            map.put("studentName", r.getUser().getFullName());
            map.put("studentEmail", r.getUser().getEmail());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("OK", result));
    }

    /**
     * PUT /api/reviews/{reviewId}/toggle-hide — Ẩn/Hiện một đánh giá
     */
    @PutMapping("/{reviewId}/toggle-hide")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<String>> toggleHideReview(
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        EventReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Đánh giá không tồn tại"));

        // Kiểm tra quyền hạn
        if (currentUser.getRole() != UserRole.ROLE_ADMIN) {
            // Organizer chỉ được ẩn/hiện đánh giá thuộc sự kiện của chính mình
            if (review.getEvent().getOrganizer() == null || 
                    !review.getEvent().getOrganizer().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Bạn không có quyền quản lý đánh giá của sự kiện này"));
            }
        }

        // Chuyển đổi trạng thái hidden
        boolean currentHidden = review.getHidden() != null ? review.getHidden() : false;
        review.setHidden(!currentHidden);
        reviewRepository.save(review);

        String msg = review.getHidden() ? "Đã ẩn đánh giá thành công" : "Đã hiển thị đánh giá thành công";
        return ResponseEntity.ok(ApiResponse.success(msg, "OK"));
    }
}
