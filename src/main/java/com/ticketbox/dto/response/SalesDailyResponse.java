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
public class SalesDailyResponse {
    private String date;
    private Long ticketsSold;
    private BigDecimal revenue;
}
