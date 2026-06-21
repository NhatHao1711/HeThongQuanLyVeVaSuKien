package com.ticketbox.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookingRequest {

    @NotNull(message = "Ticket Type ID không được để trống")
    private Long ticketTypeId;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải ít nhất là 1")
    @Max(value = 20, message = "Chỉ được đặt tối đa 20 vé mỗi lần")
    private Integer quantity;

    private String voucherCode; // optional

    private java.util.List<Long> seatIds; // optional, for interactive seating map
}
