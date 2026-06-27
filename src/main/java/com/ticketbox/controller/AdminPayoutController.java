package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.PayoutResponse;
import com.ticketbox.service.PayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/payouts")
@RequiredArgsConstructor
@CrossOrigin("*")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminPayoutController {

    private final PayoutService payoutService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PayoutResponse>>> getAllPayouts() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu rút tiền thành công", payoutService.getAllPayouts()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<String>> approvePayout(@PathVariable Long id) {
        try {
            payoutService.approvePayout(id);
            return ResponseEntity.ok(ApiResponse.success("Đã xác nhận chuyển khoản thành công", "OK"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<String>> rejectPayout(@PathVariable Long id) {
        try {
            payoutService.rejectPayout(id);
            return ResponseEntity.ok(ApiResponse.success("Đã từ chối yêu cầu và hoàn tiền thành công", "OK"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
