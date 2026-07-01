package com.ticketbox.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckinScanResponse {
    private String action;
    private Long ticketId;
    private String ticketTypeName;
    private String eventTitle;
    private String attendeeName;
    private LocalDateTime checkinTime;
    private LocalDateTime checkoutTime;
    private LocalDateTime recordedAt;
    private String message;
}
