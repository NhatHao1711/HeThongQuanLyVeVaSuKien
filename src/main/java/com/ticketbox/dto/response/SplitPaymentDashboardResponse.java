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
public class SplitPaymentDashboardResponse {
    private Long orderId;
    private String eventName;
    private BigDecimal totalAmount;
    private int totalLinks;
    private int paidLinks;
    private List<SubPaymentLinkInfo> links;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubPaymentLinkInfo {
        private String paymentLinkCode;
        private BigDecimal amount;
        private String status;
        private String ticketTypeName;
        private String seatName;
        private String checkoutUrl;
    }
}
