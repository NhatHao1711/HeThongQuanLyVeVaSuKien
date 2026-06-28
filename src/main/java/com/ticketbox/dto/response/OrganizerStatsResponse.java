package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerStatsResponse {
    private Long totalViews;
    private Long ticketsSold;
    private Long checkedInTickets;
    private Long unusedTickets;
    private Long totalCapacity;
    private Long totalEvents;
    private Long pendingEvents;
    private Long publishedEvents;
    private Long closedEvents;
    private Double attendanceRate;
    private java.math.BigDecimal totalRevenue;
    private List<SalesDailyResponse> salesByDate;
}
