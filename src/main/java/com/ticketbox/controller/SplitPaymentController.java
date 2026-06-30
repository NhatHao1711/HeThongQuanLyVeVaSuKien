package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.SplitPaymentDashboardResponse;
import com.ticketbox.dto.response.SubPaymentDetailResponse;
import com.ticketbox.entity.User;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.service.SplitPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/split-payment")
@RequiredArgsConstructor
public class SplitPaymentController {

    private final SplitPaymentService splitPaymentService;
    private final UserRepository userRepository;

    @PostMapping("/create/{orderId}")
    public ResponseEntity<ApiResponse<SplitPaymentDashboardResponse>> createSplitPayment(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        SplitPaymentDashboardResponse response = splitPaymentService.createSplitPayment(orderId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Tạo chia sẻ thanh toán thành công", response));
    }

    @GetMapping("/dashboard/{orderId}")
    public ResponseEntity<ApiResponse<SplitPaymentDashboardResponse>> getDashboardInfo(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        SplitPaymentDashboardResponse response = splitPaymentService.getDashboardInfo(orderId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", response));
    }

    @GetMapping("/{paymentLinkCode}")
    public ResponseEntity<ApiResponse<SubPaymentDetailResponse>> getSubPaymentDetail(
            @PathVariable String paymentLinkCode) {
        SubPaymentDetailResponse response = splitPaymentService.getSubPaymentDetail(paymentLinkCode);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", response));
    }

    @PostMapping("/{paymentLinkCode}/pay")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generatePayOsLink(
            @PathVariable String paymentLinkCode) throws Exception {
        Map<String, Object> response = splitPaymentService.generatePayOsLinkForSubPayment(paymentLinkCode);
        return ResponseEntity.ok(ApiResponse.success("Tạo link thanh toán thành công", response));
    }
}
