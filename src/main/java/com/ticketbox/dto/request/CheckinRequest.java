package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckinRequest {

    @NotBlank(message = "QR Token không được để trống")
    private String qrToken;
}
