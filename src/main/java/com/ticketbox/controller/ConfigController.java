package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${app.payment.timeout-minutes:10}")
    private int paymentTimeoutMinutes;

    @GetMapping("/payment-timeout")
    public ApiResponse<Map<String, Object>> getPaymentTimeout() {
        return ApiResponse.success(Map.of("timeoutMinutes", paymentTimeoutMinutes));
    }
}
