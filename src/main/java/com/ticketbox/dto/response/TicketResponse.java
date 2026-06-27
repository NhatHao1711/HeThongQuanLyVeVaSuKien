package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private String orderRef;
    private Long eventId;
    private String eventTitle;
    private LocalDateTime startDate;
    private String ticketTypeName;
    private String seatName;
    private java.math.BigDecimal price;
    private String checkinStatus;
    private LocalDateTime checkinTime;
    private byte[] qrCode;
    private String qrToken;
    private LocalDateTime createdAt;
}
