package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubPaymentDetailResponse {
    private String paymentLinkCode;
    private String eventName;
    private BigDecimal amount;
    private String status;
    private String orderStatus;
    private String ticketTypeName;
    private String seatName;
}
