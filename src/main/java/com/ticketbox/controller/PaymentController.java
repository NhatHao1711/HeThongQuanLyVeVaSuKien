package com.ticketbox.controller;

import com.ticketbox.dto.request.PaymentRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.PaymentUrlResponse;
import com.ticketbox.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final VNPayService vnPayService;

    /**
     * POST /api/payments/create-url - Tạo URL thanh toán VNPay
     * Yêu cầu JWT authentication.
     */
    @PostMapping("/create-url")
    public ResponseEntity<ApiResponse<PaymentUrlResponse>> createPaymentUrl(
            @Valid @RequestBody PaymentRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getClientIp(httpRequest);
        PaymentUrlResponse response = vnPayService.createPaymentUrl(
                request.getOrderId(), ipAddress);

        return ResponseEntity.ok(
                ApiResponse.success("Tạo URL thanh toán thành công", response));
    }

    /**
     * GET /api/payments/vnpay-return - VNPay callback/return (Public endpoint)
     * Xử lý Idempotency: nếu order đã PAID → trả success mà không xử lý lại.
     */
    @GetMapping("/vnpay-return")
    public ResponseEntity<ApiResponse<String>> vnpayReturn(
            @RequestParam Map<String, String> params) {

        boolean success = vnPayService.processPaymentReturn(params);

        if (success) {
            return ResponseEntity.ok(
                    ApiResponse.success("Thanh toán thành công! Vé đang được xử lý.",
                            "SUCCESS"));
        } else {
            return ResponseEntity.ok(
                    ApiResponse.error("Thanh toán thất bại. Vui lòng thử lại."));
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
