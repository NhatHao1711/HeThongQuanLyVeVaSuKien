package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class PaymentRequest {

    private Long orderId; // For backward compatibility
    
    private List<Long> orderIds; // For multiple orders checkout
}
