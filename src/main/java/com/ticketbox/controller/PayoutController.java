package com.ticketbox.controller;

import com.ticketbox.dto.PayoutRequestDto;
import com.ticketbox.service.PayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payouts")
@RequiredArgsConstructor
@CrossOrigin("*")
public class PayoutController {

    private final PayoutService payoutService;

    @PostMapping("/request")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> requestPayout(@RequestBody PayoutRequestDto dto, Authentication authentication) {
        try {
            return ResponseEntity.ok(java.util.Map.of("success", true, "data", payoutService.requestPayout(dto, authentication.getName())));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/events/{id}/settle")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> settleEvent(@PathVariable Long id, Authentication authentication) {
        try {
            payoutService.settleEvent(id, authentication.getName());
            return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Chốt doanh thu thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllPayouts() {
        return ResponseEntity.ok(java.util.Map.of("success", true, "data", payoutService.getAllPayouts()));
    }

    @PostMapping("/admin/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approvePayout(@PathVariable Long id) {
        try {
            payoutService.approvePayout(id);
            return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Đã phê duyệt yêu cầu rút tiền"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/admin/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectPayout(@PathVariable Long id) {
        try {
            payoutService.rejectPayout(id);
            return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Đã từ chối yêu cầu rút tiền"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }
}
