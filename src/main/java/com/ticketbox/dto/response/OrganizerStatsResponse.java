package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerStatsResponse {
    private Long totalViews;
    private Long ticketsSold;
    private Long totalCapacity;
    private BigDecimal totalRevenue;
    private List<SalesDailyResponse> salesByDate;
}
