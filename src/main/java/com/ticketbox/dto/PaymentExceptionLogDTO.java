package com.ticketbox.dto;

import com.ticketbox.entity.PaymentExceptionLog;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class PaymentExceptionLogDTO {
    private Long id;
    private String transactionRef;
    private BigDecimal expectedAmount;
    private BigDecimal actualAmount;
    private String reason;
    private String status;
    private LocalDateTime createdAt;
    
    private String customerName;
    private String customerEmail;
    private String customerPhone;

    public PaymentExceptionLogDTO(PaymentExceptionLog log, String name, String email, String phone) {
        this.id = log.getId();
        this.transactionRef = log.getTransactionRef();
        this.expectedAmount = log.getExpectedAmount();
        this.actualAmount = log.getActualAmount();
        this.reason = log.getReason();
        this.status = log.getStatus();
        this.createdAt = log.getCreatedAt();
        this.customerName = name;
        this.customerEmail = email;
        this.customerPhone = phone;
    }
}
