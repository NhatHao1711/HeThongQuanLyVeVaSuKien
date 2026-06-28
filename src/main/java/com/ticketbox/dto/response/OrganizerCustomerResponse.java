package com.ticketbox.dto.response;

import com.ticketbox.enums.CheckinStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerCustomerResponse {
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String ticketTypeName;
    private BigDecimal ticketPrice;
    private String seatNumber;
    private CheckinStatus checkinStatus;
    private LocalDateTime purchaseDate;
    private String eventTitle;
    private Long eventId;
}
