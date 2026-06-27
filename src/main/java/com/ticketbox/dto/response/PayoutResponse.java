package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutResponse {
    private Long id;
    private Long agencyId;
    private String agencyName;
    private String agencyEmail;
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
    private BigDecimal netAmount;
    private String payoutRef;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime executedAt;
}
