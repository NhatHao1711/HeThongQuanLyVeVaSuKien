package com.ticketbox.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidQRTokenException extends RuntimeException {
    public InvalidQRTokenException(String message) {
        super(message);
    }
}
