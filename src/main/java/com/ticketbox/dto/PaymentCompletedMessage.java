package com.ticketbox.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Message gửi qua RabbitMQ sau khi thanh toán thành công.
 * Consumer sẽ sinh QR code và gửi email.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedMessage implements Serializable {
    private Long orderId;
    private Long userId;
    private String transactionRef;
}
