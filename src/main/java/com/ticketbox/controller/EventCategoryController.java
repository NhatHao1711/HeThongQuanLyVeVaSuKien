package com.ticketbox.controller;

import com.ticketbox.dto.request.EventCategoryRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.EventCategoryResponse;
import com.ticketbox.entity.EventCategory;
import com.ticketbox.exception.BadRequestException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.EventCategoryRepository;
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
 * Event Category Management Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class EventCategoryController {

    private final EventCategoryRepository categoryRepository;

    /**
     * GET /api/categories
     * Lấy danh sách tất cả categories
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<EventCategoryResponse>>> getAllCategories() {
        log.info("📂 Fetching all event categories");
        
        List<EventCategory> categories = categoryRepository.findAll();
        List<EventCategoryResponse> responses = categories.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.<List<EventCategoryResponse>>builder()
            .status(200)
            .message("Successfully fetched " + responses.size() + " categories")
            .data(responses)
            .build());
    }

    /**
     * GET /api/categories/{id}
     * Lấy thông tin một category
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventCategoryResponse>> getCategoryById(@PathVariable Long id) {
        log.info("🔍 Fetching category with id: {}", id);
        
        EventCategory category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        
        return ResponseEntity.ok(ApiResponse.<EventCategoryResponse>builder()
            .status(200)
            .message("Category found")
            .data(mapToResponse(category))
            .build());
    }

    /**
     * POST /api/admin/categories
     * Tạo category mới (Admin only)
     */
    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventCategoryResponse>> createCategory(
            @Valid @RequestBody EventCategoryRequest request) {
        
        log.info("📝 Creating new category: {}", request.getName());
        
        // Check if category already exists
        if (categoryRepository.existsByName(request.getName())) {
            throw new BadRequestException("Category with name '" + request.getName() + "' already exists");
        }
        
        EventCategory category = EventCategory.builder()
            .name(request.getName())
            .description(request.getDescription())
            .icon(request.getIcon())
            .build();
        
        EventCategory saved = categoryRepository.save(category);
        
        log.info("✅ Category created successfully with id: {}", saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.<EventCategoryResponse>builder()
                .status(201)
                .message("Category created successfully")
                .data(mapToResponse(saved))
                .build());
    }

    /**
     * PUT /api/admin/categories/{id}
     * Cập nhật category (Admin only)
     */
    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventCategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody EventCategoryRequest request) {
        
        log.info("✏️ Updating category with id: {}", id);
        
        EventCategory category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        
        // Check if new name is already taken by another category
        if (!category.getName().equals(request.getName()) && 
            categoryRepository.existsByName(request.getName())) {
            throw new BadRequestException("Category with name '" + request.getName() + "' already exists");
        }
        
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setIcon(request.getIcon());
        
        EventCategory updated = categoryRepository.save(category);
        
        log.info("✅ Category updated successfully");
        return ResponseEntity.ok(ApiResponse.<EventCategoryResponse>builder()
            .status(200)
            .message("Category updated successfully")
            .data(mapToResponse(updated))
            .build());
    }

    /**
     * DELETE /api/admin/categories/{id}
     * Xoá category (Admin only)
     */
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        log.info("🗑️ Deleting category with id: {}", id);
        
        EventCategory category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        
        // Check if category has events
        if (category.getEvents() != null && !category.getEvents().isEmpty()) {
            log.warn("Cannot delete category with {} events", category.getEvents().size());
            return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                    .status(400)
                    .message("Cannot delete category with associated events. Total events: " + category.getEvents().size())
                    .build());
        }
        
        categoryRepository.delete(category);
        
        log.info("✅ Category deleted successfully");
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .status(200)
            .message("Category deleted successfully")
            .build());
    }

    /**
     * Mapper: Convert EventCategory entity to Response DTO
     */
    private EventCategoryResponse mapToResponse(EventCategory category) {
        return EventCategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .description(category.getDescription())
            .icon(category.getIcon())
            .eventCount(category.getEvents() != null ? category.getEvents().size() : 0)
            .createdAt(category.getCreatedAt())
            .build();
    }
}
