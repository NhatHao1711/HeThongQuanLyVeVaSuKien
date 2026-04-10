package com.ticketbox.controller;

import com.ticketbox.dto.request.LockSeatRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.SeatResponse;
import com.ticketbox.entity.User;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.service.SeatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SeatResponse>>> getSeatsByTicketType(
            @RequestParam Long ticketTypeId) {
        List<SeatResponse> seats = seatService.getSeatsByTicketType(ticketTypeId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách ghế thành công", seats));
    }

    @PostMapping("/lock")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> lockSeats(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody LockSeatRequest request) {
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        seatService.lockSeats(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Giữ ghế thành công (10 phút)", null));
    }

    @PostMapping("/unlock")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> unlockSeats(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody LockSeatRequest request) {
            
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        seatService.unlockSeats(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Hủy giữ ghế thành công", null));
    }

    // Admin API to generate seats for testing
    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> generateSeats(
            @RequestParam Long ticketTypeId,
            @RequestParam String prefix,
            @RequestParam int count) {
        seatService.generateSeats(ticketTypeId, prefix, count);
        return ResponseEntity.ok(ApiResponse.success("Tạo ghế thành công", null));
    }
}
