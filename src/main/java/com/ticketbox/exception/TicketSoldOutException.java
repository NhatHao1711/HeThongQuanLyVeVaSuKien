package com.ticketbox.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class TicketSoldOutException extends RuntimeException {
    public TicketSoldOutException(String message) {
        super(message);
    }

    public TicketSoldOutException(Long ticketTypeId, int requested, int available) {
        super(String.format(
                "Vé loại ID %d đã hết hoặc không đủ số lượng. Yêu cầu: %d, Còn lại: %d",
                ticketTypeId, requested, available));
    }
}
