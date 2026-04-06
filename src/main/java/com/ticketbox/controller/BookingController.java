package com.ticketbox.controller;

import com.ticketbox.dto.request.BookingRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.BookingResponse;
import com.ticketbox.entity.User;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.service.TicketBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final TicketBookingService ticketBookingService;
    private final UserRepository userRepository;

    /**
     * POST /api/bookings - Đặt vé (yêu cầu JWT)
     * Sử dụng Redis Distributed Lock để chống over-selling.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> bookTicket(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BookingRequest request) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        BookingResponse response = ticketBookingService.bookTicket(user.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt vé thành công! Vui lòng thanh toán.", response));
    }
}
