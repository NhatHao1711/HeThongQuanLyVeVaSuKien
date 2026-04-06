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
    private String eventTitle;
    private String ticketTypeName;
    private String checkinStatus;
    private LocalDateTime checkinTime;
    private byte[] qrCode;
    private String qrToken;
    private LocalDateTime createdAt;
}
