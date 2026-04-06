package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating/updating EventCategory
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventCategoryRequest {
    
    @NotBlank(message = "Category name is required")
    private String name;
    
    private String description;
    
    private String icon; // e.g., "🎵", "🎮", "⚽", "🎨"
}
