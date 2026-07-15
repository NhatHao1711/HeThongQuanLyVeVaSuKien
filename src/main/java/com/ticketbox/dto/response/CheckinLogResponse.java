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
public class CheckinLogResponse {
    private Long id;
    private Long ticketId;
    private String qrToken;
    private String attendeeName;
    private String attendeeEmail;
    private String ticketTypeName;
    private String eventTitle;
    private Long eventId;
    private String action; // CHECK_IN, CHECK_OUT
    private LocalDateTime recordedAt;
    private Long scannerId;
    private String scannerName;
}
