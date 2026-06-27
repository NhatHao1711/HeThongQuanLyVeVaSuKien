package com.ticketbox.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PayoutRequestDto {
    private BigDecimal amount;
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
}
