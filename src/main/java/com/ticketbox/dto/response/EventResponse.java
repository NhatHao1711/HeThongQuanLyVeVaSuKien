package com.ticketbox.dto.response;

import com.ticketbox.enums.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private Long id;
    private String title;
    private String description;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private EventStatus status;
    private String imageUrl;
    private EventCategoryResponse category;
    private List<TicketTypeResponse> ticketTypes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
