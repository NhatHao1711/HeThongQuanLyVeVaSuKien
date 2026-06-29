package com.ticketbox.controller;

import com.ticketbox.entity.Order;
import com.ticketbox.entity.PaymentExceptionLog;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.PaymentExceptionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminReconciliationController {

    private final OrderRepository orderRepository;
    private final PaymentExceptionLogRepository exceptionLogRepository;

    @GetMapping("/reconciliation")
    public ResponseEntity<Map<String, Object>> getReconciliationReport() {
        List<Order> allOrders = orderRepository.findAll();
        List<PaymentExceptionLog> allExceptions = exceptionLogRepository.findAll();

        BigDecimal totalPaidAmount = BigDecimal.ZERO;
        BigDecimal totalRefundedAmount = BigDecimal.ZERO;
        BigDecimal totalExceptionAmount = BigDecimal.ZERO;
        long totalTransactionsCount = 0;

        for (Order order : allOrders) {
            if (PaymentStatus.PAID.equals(order.getPaymentStatus())) {
                if (order.getTotalAmount() != null) {
                    totalPaidAmount = totalPaidAmount.add(order.getTotalAmount());
                }
                totalTransactionsCount++;
            } else if (PaymentStatus.REFUNDED.equals(order.getPaymentStatus())) {
                if (order.getTotalAmount() != null) {
                    totalRefundedAmount = totalRefundedAmount.add(order.getTotalAmount());
                }
                totalTransactionsCount++;
            }
        }

        for (PaymentExceptionLog log : allExceptions) {
            if ("UNRESOLVED".equals(log.getStatus())) {
                if (log.getActualAmount() != null) {
                    totalExceptionAmount = totalExceptionAmount.add(log.getActualAmount());
                }
                totalTransactionsCount++;
            }
        }

        Map<String, Object> data = Map.of(
                "totalPaidAmount", totalPaidAmount,
                "totalRefundedAmount", totalRefundedAmount,
                "totalExceptionAmount", totalExceptionAmount,
                "totalTransactionsCount", totalTransactionsCount
        );

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }
}
