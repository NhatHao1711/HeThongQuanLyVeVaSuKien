package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BuddyRequest {

    @NotNull(message = "Event ID không được để trống")
    private Long eventId;

    @NotNull(message = "Receiver ID không được để trống")
    private Long receiverId;
}
