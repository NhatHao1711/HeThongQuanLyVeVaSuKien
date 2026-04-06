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
public class BookingResponse {
    private Long orderId;
    private String transactionRef;
    private BigDecimal totalAmount;
    private Integer ticketCount;
    private String ticketTypeName;
    private String paymentStatus;
}
