package com.ticketbox.controller;

import com.ticketbox.dto.request.CreateUniversityRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.UniversityResponse;
import com.ticketbox.entity.University;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.UniversityRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * University Management Controller
 * Admin-only endpoints for managing universities
 */
@Slf4j
@RestController
@RequestMapping("/api/universities")
@RequiredArgsConstructor
public class UniversityController {

    private final UniversityRepository universityRepository;

    /**
     * GET /api/universities
     * Lấy danh sách tất cả các đại học
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<UniversityResponse>>> getAllUniversities() {
        log.info("📚 Fetching all universities");
        
        List<University> universities = universityRepository.findAll();
        List<UniversityResponse> responses = universities.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.<List<UniversityResponse>>builder()
            .status(200)
            .message("Successfully fetched " + responses.size() + " universities")
            .data(responses)
            .build());
    }

    /**
     * GET /api/universities/{id}
     * Lấy thông tin một đại học
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UniversityResponse>> getUniversityById(@PathVariable Long id) {
        log.info("🔍 Fetching university with id: {}", id);
        
        University university = universityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("University not found with id: " + id));
        
        return ResponseEntity.ok(ApiResponse.<UniversityResponse>builder()
            .status(200)
            .message("University found")
            .data(mapToResponse(university))
            .build());
    }

    /**
     * POST /api/admin/universities
     * Tạo đại học mới (Admin only)
     */
    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UniversityResponse>> createUniversity(
            @Valid @RequestBody CreateUniversityRequest request) {
        
        log.info("📝 Creating new university: {}", request.getName());
        
        University university = University.builder()
            .name(request.getName())
            .domain(request.getDomain())
            .build();
        
        University saved = universityRepository.save(university);
        
        log.info("✅ University created successfully with id: {}", saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.<UniversityResponse>builder()
                .status(201)
                .message("University created successfully")
                .data(mapToResponse(saved))
                .build());
    }

    /**
     * PUT /api/admin/universities/{id}
     * Cập nhật thông tin đại học (Admin only)
     */
    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UniversityResponse>> updateUniversity(
            @PathVariable Long id,
            @Valid @RequestBody CreateUniversityRequest request) {
        
        log.info("✏️ Updating university with id: {}", id);
        
        University university = universityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("University not found with id: " + id));
        
        university.setName(request.getName());
        university.setDomain(request.getDomain());
        
        University updated = universityRepository.save(university);
        
        log.info("✅ University updated successfully");
        return ResponseEntity.ok(ApiResponse.<UniversityResponse>builder()
            .status(200)
            .message("University updated successfully")
            .data(mapToResponse(updated))
            .build());
    }

    /**
     * DELETE /api/admin/universities/{id}
     * Xoá đại học (Admin only)
     * Note: Chỉ xoá được nếu không có users liên kết
     */
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUniversity(@PathVariable Long id) {
        log.info("🗑️ Deleting university with id: {}", id);
        
        University university = universityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("University not found with id: " + id));
        
        // Check if university has users
        if (university.getUsers() != null && !university.getUsers().isEmpty()) {
            log.warn("Cannot delete university with {} users", university.getUsers().size());
            return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                    .status(400)
                    .message("Cannot delete university with associated users. Total users: " + university.getUsers().size())
                    .build());
        }
        
        universityRepository.delete(university);
        
        log.info("✅ University deleted successfully");
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .status(200)
            .message("University deleted successfully")
            .build());
    }

    /**
     * GET /api/universities/by-domain/{domain}
     * Lấy đại học theo domain (e.g., hcmut.edu.vn)
     */
    @GetMapping("/by-domain/{domain}")
    public ResponseEntity<ApiResponse<UniversityResponse>> getUniversityByDomain(
            @PathVariable String domain) {
        
        log.info("🔍 Fetching university by domain: {}", domain);
        
        University university = universityRepository.findByDomain(domain)
            .orElseThrow(() -> new ResourceNotFoundException("University not found with domain: " + domain));
        
        return ResponseEntity.ok(ApiResponse.<UniversityResponse>builder()
            .status(200)
            .message("University found")
            .data(mapToResponse(university))
            .build());
    }

    /**
     * Mapper: Convert University entity to Response DTO
     */
    private UniversityResponse mapToResponse(University university) {
        return UniversityResponse.builder()
            .id(university.getId())
            .name(university.getName())
            .domain(university.getDomain())
            .userCount(university.getUsers() != null ? university.getUsers().size() : 0)
            .createdAt(university.getCreatedAt())
            .build();
    }
}
