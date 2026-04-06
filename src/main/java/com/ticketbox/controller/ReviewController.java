package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.EventReview;
import com.ticketbox.entity.User;
import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.EventReviewRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events/{eventId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final EventReviewRepository reviewRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    /**
     * GET /api/events/{eventId}/reviews — Public: lấy danh sách đánh giá
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReviews(@PathVariable Long eventId) {
        List<EventReview> reviews = reviewRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        Double avgRating = reviewRepository.findAverageRatingByEventId(eventId);
        long totalCount = reviewRepository.countByEventId(eventId);

        List<Map<String, Object>> reviewList = reviews.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("rating", r.getRating());
            map.put("comment", r.getComment());
            map.put("createdAt", r.getCreatedAt());
            map.put("userName", r.getUser().getFullName());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("reviews", reviewList);
        result.put("averageRating", Math.round(avgRating * 10.0) / 10.0);
        result.put("totalCount", totalCount);

        return ResponseEntity.ok(ApiResponse.success("OK", result));
    }

    /**
     * POST /api/events/{eventId}/reviews — Auth: gửi đánh giá (mỗi user chỉ 1 lần)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReview(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Check duplicate
        if (reviewRepository.findByEventIdAndUserId(eventId, user.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("Bạn đã đánh giá sự kiện này rồi"));
        }

        Integer rating = (Integer) body.get("rating");
        String comment = (String) body.get("comment");

        if (rating == null || rating < 1 || rating > 5) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Đánh giá phải từ 1 đến 5 sao"));
        }

        EventReview review = new EventReview();
        review.setEvent(event);
        review.setUser(user);
        review.setRating(rating);
        review.setComment(comment != null ? comment.trim() : "");
        reviewRepository.save(review);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đánh giá thành công! Cảm ơn bạn.", "OK"));
    }
}
