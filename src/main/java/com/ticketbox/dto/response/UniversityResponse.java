package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for University
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UniversityResponse {
    
    private Long id;
    private String name;
    private String domain;
    private Integer userCount;
    private LocalDateTime createdAt;
}
