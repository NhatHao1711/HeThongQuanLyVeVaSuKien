package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class LockSeatRequest {

    @NotEmpty(message = "Danh sách ghế không được để trống")
    private List<Long> seatIds;
}
