package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEventRequest {

    @NotBlank(message = "Event title không được để trống")
    private String title;

    private String description;

    @NotBlank(message = "Location không được để trống")
    private String location;

    @NotNull(message = "Start time không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "End time không được để trống")
    private LocalDateTime endTime;

    @Positive(message = "Category ID phải dương")
    private Long categoryId;
}
