package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateTicketTypeRequest {

    @NotBlank(message = "Ticket type name không được để trống")
    private String name;

    @NotNull(message = "Price không được để trống")
    @Positive(message = "Price phải lớn hơn 0")
    private BigDecimal price;

    @NotNull(message = "Total quantity không được để trống")
    @Positive(message = "Total quantity phải lớn hơn 0")
    private Integer totalQuantity;
}
