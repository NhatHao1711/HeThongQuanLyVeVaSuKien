package com.ticketbox.controller;

import com.ticketbox.dto.request.CreateEventRequest;
import com.ticketbox.dto.request.CreateTicketTypeRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.EventResponse;
import com.ticketbox.dto.response.TicketTypeResponse;
import com.ticketbox.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.service.EmailService;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.User;

@Slf4j
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * GET /api/events - Danh sách sự kiện (Public)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<EventResponse>>> getAllEvents() {
        log.info("📚 Fetching all public events");
        List<EventResponse> events = eventService.getAllEvents();
        return ResponseEntity.ok(ApiResponse.success("Danh sách sự kiện", events));
    }

    /**
     * GET /api/events/{id} - Chi tiết sự kiện (Public)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventResponse>> getEventById(@PathVariable Long id) {
        log.info("🔍 Fetching event with id: {}", id);
        EventResponse event = eventService.getEventById(id);
        return ResponseEntity.ok(ApiResponse.success(event));
    }

    /**
     * POST /api/events/admin/create - Tạo sự kiện mới (Admin only, Draft status)
     */
    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(
            @Valid @RequestBody CreateEventRequest request) {
        log.info("📝 Admin creating new event: {}", request.getTitle());
        EventResponse event = eventService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo sự kiện thành công", event));
    }

    /**
     * PUT /api/events/admin/{id} - Cập nhật sự kiện (Admin only)
     */
    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> updateEvent(
            @PathVariable Long id,
            @Valid @RequestBody CreateEventRequest request) {
        log.info("✏️ Admin updating event with id: {}", id);
        EventResponse event = eventService.updateEvent(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sự kiện thành công", event));
    }

    /**
     * POST /api/events/admin/{id}/publish - Publish sự kiện (Admin only, DRAFT → PUBLISHED)
     */
    @PostMapping("/admin/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> publishEvent(@PathVariable Long id) {
        log.info("🚀 Admin publishing event with id: {}", id);
        EventResponse event = eventService.publishEvent(id);
        return ResponseEntity.ok(ApiResponse.success("Publish sự kiện thành công", event));
    }

    /**
     * POST /api/events/admin/{id}/close - Đóng sự kiện (Admin only, PUBLISHED → CLOSED)
     */
    @PostMapping("/admin/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> closeEvent(@PathVariable Long id) {
        log.info("🛑 Admin closing event with id: {}", id);
        EventResponse event = eventService.closeEvent(id);
        return ResponseEntity.ok(ApiResponse.success("Đóng sự kiện thành công", event));
    }

    /**
     * DELETE /api/events/admin/{id} - Xoá sự kiện (Admin only, chỉ DRAFT)
     */
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable Long id) {
        log.info("🗑️ Admin deleting event with id: {}", id);
        eventService.deleteEvent(id);
        return ResponseEntity.ok(ApiResponse.success("Xoá sự kiện thành công", (Void) null));
    }

    /**
     * GET /api/events/{id}/ticket-types - Danh sách loại vé của sự kiện (Public)
     */
    @GetMapping("/{id}/ticket-types")
    public ResponseEntity<ApiResponse<List<TicketTypeResponse>>> getTicketTypes(
            @PathVariable Long id) {
        log.info("🎫 Fetching ticket types for event: {}", id);
        List<TicketTypeResponse> ticketTypes = eventService.getTicketTypesForEvent(id);
        return ResponseEntity.ok(ApiResponse.success(ticketTypes));
    }

    /**
     * POST /api/events/admin/{id}/add-ticket-type - Thêm loại vé (Admin only)
     */
    @PostMapping("/admin/{id}/add-ticket-type")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TicketTypeResponse>> addTicketType(
            @PathVariable Long id,
            @Valid @RequestBody CreateTicketTypeRequest request) {
        log.info("➕ Admin adding ticket type to event: {}", id);
        TicketTypeResponse ticketType = eventService.addTicketType(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm loại vé thành công", ticketType));
    }

    /**
     * PUT /api/ticket-types/admin/{ticketTypeId} - Cập nhật loại vé (Admin only)
     */
    @PutMapping("/admin/ticket-types/{ticketTypeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TicketTypeResponse>> updateTicketType(
            @PathVariable Long ticketTypeId,
            @Valid @RequestBody CreateTicketTypeRequest request) {
        log.info("✏️ Admin updating ticket type with id: {}", ticketTypeId);
        TicketTypeResponse ticketType = eventService.updateTicketType(ticketTypeId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật loại vé thành công", ticketType));
    }

    /**
     * DELETE /api/events/admin/ticket-types/{ticketTypeId} - Xoá loại vé (Admin only)
     */
    @DeleteMapping("/admin/ticket-types/{ticketTypeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteTicketType(@PathVariable Long ticketTypeId) {
        log.info("🗑️ Admin deleting ticket type with id: {}", ticketTypeId);
        eventService.deleteTicketType(ticketTypeId);
        return ResponseEntity.ok(ApiResponse.success("Xoá loại vé thành công", (Void) null));
    }

    /**
     * POST /api/events/admin/{id}/upload-image - Upload ảnh cho sự kiện (Admin only)
     */
    @PostMapping("/admin/{id}/upload-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> uploadEventImage(
            @PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        log.info("🖼️ Admin uploading image for event: {}", id);

        String uploadDir = "uploads/events/";
        java.nio.file.Files.createDirectories(java.nio.file.Paths.get(uploadDir));

        String ext = ".jpg";
        String origName = file.getOriginalFilename();
        if (origName != null && origName.contains(".")) {
            ext = origName.substring(origName.lastIndexOf('.'));
        }
        String filename = "event_" + id + "_" + java.util.UUID.randomUUID().toString().substring(0, 8) + ext;
        java.nio.file.Path filePath = java.nio.file.Paths.get(uploadDir + filename);
        java.nio.file.Files.write(filePath, file.getBytes());

        String imageUrl = "/uploads/events/" + filename;
        eventService.updateEventImageUrl(id, imageUrl);

        log.info("✅ Image uploaded for event {}: {}", id, imageUrl);
        return ResponseEntity.ok(ApiResponse.success("Upload ảnh thành công", imageUrl));
    }

    /**
     * POST /api/events/admin/{id}/marketing - Gửi email quảng bá sự kiện cho toàn bộ User
     */
    @PostMapping("/admin/{id}/marketing")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> sendMarketingEmail(@PathVariable Long id) {
        log.info("📧 Admin sending marketing email for event: {}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện"));

        List<User> users = userRepository.findAll();
        for (User u : users) {
             if (u.getEmail() != null) {
                 emailService.sendMarketingEmail(u.getEmail(), event);
             }
        }
        return ResponseEntity.ok(ApiResponse.success("Đã đưa vào hàng đợi gửi email thành công", (String) null));
    }
}
