package com.ticketbox.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating/updating University
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUniversityRequest {
    
    @NotBlank(message = "University name is required")
    private String name;
    
    @NotBlank(message = "University domain is required")
    @Pattern(regexp = "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
             message = "Invalid domain format")
    private String domain;
}
