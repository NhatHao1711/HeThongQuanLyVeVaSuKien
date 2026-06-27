package com.ticketbox.controller;

import com.ticketbox.dto.request.PaymentRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.PaymentUrlResponse;
import com.ticketbox.service.PaymentService;
import com.ticketbox.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import vn.payos.type.Webhook;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final VNPayService vnPayService;
    private final PaymentService paymentService;

    /**
     * GET /api/payment/test-checkout - Tạo URL thanh toán PayOS để test
     */
    @GetMapping("/payment/test-checkout")
    public ResponseEntity<Map<String, String>> testCheckout() throws Exception {
        String checkoutUrl = paymentService.createPaymentLink();
        return ResponseEntity.ok(Map.of("checkoutUrl", checkoutUrl));
    }

    /**
     * POST /api/payments/create-url - Tạo URL thanh toán VNPay
     * Yêu cầu JWT authentication.
     */
    @PostMapping("/payments/create-url")
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
    @GetMapping("/payments/vnpay-return")
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

    /**
     * POST /api/payments/create-payos-link - Tạo liên kết thanh toán PayOS (VietQR)
     * Yêu cầu JWT authentication.
     */
    @PostMapping("/payments/create-payos-link")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createPayOSLink(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            java.util.List<Long> orderIds = request.getOrderIds();
            if (orderIds == null || orderIds.isEmpty()) {
                if (request.getOrderId() != null) {
                    orderIds = java.util.Collections.singletonList(request.getOrderId());
                } else {
                    throw new IllegalArgumentException("Không có Order ID nào được cung cấp");
                }
            }

            Map<String, Object> response = paymentService.createPayOSPaymentLink(
                    orderIds, userDetails.getUsername());

            return ResponseEntity.ok(
                    ApiResponse.success("Tạo liên kết thanh toán PayOS thành công", response));
        } catch (Exception e) {
            log.error("Lỗi khi tạo PayOS link", e);
            return ResponseEntity.status(500).body(ApiResponse.error(e.getMessage() != null ? e.getMessage() : "Lỗi server"));
        }
    }

    /**
     * POST /api/payment/payos-webhook - Tiếp nhận Webhook từ PayOS (Public endpoint)
     */
    @PostMapping("/payment/payos-webhook")
    public ResponseEntity<Map<String, Object>> payosWebhook(@RequestBody Webhook body) {
        try {
            paymentService.processPayOSWebhook(body);
            return ResponseEntity.ok(Map.of("success", true, "message", "Webhook processed successfully"));
        } catch (Exception e) {
            log.error("❌ Lỗi xử lý Webhook PayOS: ", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
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
