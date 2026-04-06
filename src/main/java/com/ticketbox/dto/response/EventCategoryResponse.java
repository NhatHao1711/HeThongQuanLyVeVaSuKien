package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for EventCategory
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventCategoryResponse {
    
    private Long id;
    private String name;
    private String description;
    private String icon;
    private Integer eventCount;
    private LocalDateTime createdAt;
}
