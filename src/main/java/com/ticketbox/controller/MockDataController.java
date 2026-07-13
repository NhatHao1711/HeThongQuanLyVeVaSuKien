package com.ticketbox.controller;

import com.ticketbox.entity.PaymentExceptionLog;
import com.ticketbox.repository.PaymentExceptionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;

@RestController
@RequiredArgsConstructor
public class MockDataController {

    private final PaymentExceptionLogRepository repo;

    @GetMapping("/api/mock/payment-exceptions")
    public String createMockExceptions() {
        repo.save(PaymentExceptionLog.builder()
                .transactionRef("TX-MOCK-001")
                .expectedAmount(new BigDecimal("500000"))
                .actualAmount(new BigDecimal("400000"))
                .reason("Khách hàng chuyển thiếu tiền vé (Split Payment lỗi)")
                .status("UNRESOLVED")
                .build());

        repo.save(PaymentExceptionLog.builder()
                .transactionRef("TX-MOCK-002")
                .expectedAmount(new BigDecimal("200000"))
                .actualAmount(new BigDecimal("200000"))
                .reason("Khách hàng chuyển dư tiền / Chuyển tiền khi vé đã bị hủy do timeout")
                .status("UNRESOLVED")
                .build());
                
        repo.save(PaymentExceptionLog.builder()
                .transactionRef("TX-MOCK-003")
                .expectedAmount(new BigDecimal("150000"))
                .actualAmount(new BigDecimal("150000"))
                .reason("Khách hàng chuyển tiền hai lần cho cùng một mã đơn hàng (PayOS Webhook)")
                .status("RESOLVED")
                .build());

        return "OK - Đã tạo 3 ngoại lệ thanh toán mẫu thành công!";
    }
}
