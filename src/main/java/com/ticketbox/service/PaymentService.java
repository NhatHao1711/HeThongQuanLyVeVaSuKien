package com.ticketbox.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.payos.PayOS;
import vn.payos.type.CheckoutResponseData;
import vn.payos.type.PaymentData;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PayOS payOS;

    public String createPaymentLink() throws Exception {
        try {
            long orderCode = System.currentTimeMillis() / 1000;
            int amount = 100000;
            String description = "Thanh toan ve SK";
            String returnUrl = "http://localhost:8080/test-pay.html";
            String cancelUrl = "http://localhost:8080/test-pay.html";

            PaymentData paymentData = PaymentData.builder()
                    .orderCode(orderCode)
                    .amount(amount)
                    .description(description)
                    .returnUrl(returnUrl)
                    .cancelUrl(cancelUrl)
                    .build();

            System.out.println("Đang gửi yêu cầu lên PayOS với orderCode: " + orderCode);

            CheckoutResponseData response = payOS.createPaymentLink(paymentData);

            System.out.println("Tạo link thành công: " + response.getCheckoutUrl());
            return response.getCheckoutUrl();

        } catch (Exception e) {
            // Ép hệ thống phải in màu đỏ ra Terminal nếu có lỗi
            System.err.println("=== LỖI TẠO ĐƠN HÀNG PAYOS ===");
            e.printStackTrace();
            throw e;
        }
    }
}