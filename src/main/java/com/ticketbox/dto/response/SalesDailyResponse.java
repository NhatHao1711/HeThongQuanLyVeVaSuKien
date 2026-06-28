package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesDailyResponse {
    private String date;
    private Long ticketsSold;
    private java.math.BigDecimal revenue;
    private Long ordersCount;
}
