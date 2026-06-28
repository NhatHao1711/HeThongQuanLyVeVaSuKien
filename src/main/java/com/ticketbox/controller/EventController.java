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
import java.util.Map;

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
     * GET /api/events/my-events - Danh sách sự kiện của tôi (Authenticated user)
     */
    @GetMapping("/my-events")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getMyEvents(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails) {
        log.info("📚 Fetching my events for user: {}", userDetails.getId());
        List<EventResponse> events = eventService.getMyEvents(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Danh sách sự kiện của tôi", events));
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
     * POST /api/events/create - Sinh viên/Ban tổ chức đề xuất sự kiện mới (DRAFT)
     */
    @PostMapping("/create")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<EventResponse>> createEventByUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @Valid @RequestBody CreateEventRequest request) {
        log.info("📝 User/Student proposing new event: {}", request.getTitle());
        EventResponse event = eventService.createEvent(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi yêu cầu duyệt sự kiện", event));
    }

    /**
     * POST /api/events/admin/create - Admin tạo sự kiện (PUBLISHED ngay)
     */
    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @Valid @RequestBody CreateEventRequest request) {
        log.info("📝 Admin creating new event: {}", request.getTitle());
        EventResponse event = eventService.createEvent(userDetails.getId(), request);
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
     * POST /api/events/admin/{id}/featured - Đánh dấu/Bỏ đánh dấu sự kiện ưu tiên
     */
    @PostMapping("/admin/{id}/featured")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> setFeaturedEvent(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean featured,
            @RequestBody(required = false) Map<String, Object> body) {
        String featuredTag = readFeaturedTag(body);
        Boolean isFeatured = readFeaturedFlag(body, featured, featuredTag);
        log.info("⭐ Admin setting featured={} for event: {}", featured, id);
        EventResponse event = eventService.updateFeaturedTag(id, featuredTag, isFeatured);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái nổi bật thành công", event));
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
     * PUT /api/events/my-events/{id} - Cập nhật sự kiện của tôi
     */
    @PutMapping("/my-events/{id}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<EventResponse>> updateMyEvent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody CreateEventRequest request) {
        log.info("✏️ User {} updating event with id: {}", userDetails.getId(), id);
        EventResponse event = eventService.updateMyEvent(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sự kiện thành công", event));
    }

    /**
     * DELETE /api/events/my-events/{id} - Xoá sự kiện của tôi
     */
    @DeleteMapping("/my-events/{id}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<Void>> deleteMyEvent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long id) {
        log.info("🗑️ User {} deleting event with id: {}", userDetails.getId(), id);
        eventService.deleteMyEvent(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Xoá sự kiện thành công", (Void) null));
    }

    /**
     * POST /api/events/my-events/{id}/featured - Dai ly cap nhat nhan noi bat cho su kien cua minh
     */
    @PostMapping("/my-events/{id}/featured")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<EventResponse>> setMyFeaturedEvent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        String featuredTag = readFeaturedTag(body);
        Boolean isFeatured = readFeaturedFlag(body, null, featuredTag);
        EventResponse event = eventService.updateMyFeaturedTag(userDetails.getId(), id, featuredTag, isFeatured);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nhãn nổi bật thành công", event));
    }

    /**
     * POST /api/events/my-events/{id}/publish - Publish sự kiện của tôi (DRAFT → PUBLISHED)
     */
    @PostMapping("/my-events/{id}/publish")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<EventResponse>> publishMyEvent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long id) {
        log.info("🚀 User {} publishing event with id: {}", userDetails.getId(), id);
        EventResponse event = eventService.publishMyEvent(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Publish sự kiện thành công", event));
    }

    /**
     * POST /api/events/my-events/{id}/close - Đóng sự kiện của tôi (PUBLISHED → CLOSED)
     */
    @PostMapping("/my-events/{id}/close")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<EventResponse>> closeMyEvent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long id) {
        log.info("🛑 User {} closing event with id: {}", userDetails.getId(), id);
        EventResponse event = eventService.closeMyEvent(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Đóng sự kiện thành công", event));
    }

    /**
     * POST /api/events/my-events/{id}/ticket-types - Thêm loại vé cho sự kiện của tôi
     */
    @PostMapping("/my-events/{id}/ticket-types")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<TicketTypeResponse>> addMyTicketType(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody CreateTicketTypeRequest request) {
        log.info("➕ User {} adding ticket type to event: {}", userDetails.getId(), id);
        TicketTypeResponse ticketType = eventService.addMyTicketType(userDetails.getId(), id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm loại vé thành công", ticketType));
    }

    /**
     * PUT /api/events/my-events/ticket-types/{ticketTypeId} - Cập nhật loại vé của tôi
     */
    @PutMapping("/my-events/ticket-types/{ticketTypeId}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<TicketTypeResponse>> updateMyTicketType(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long ticketTypeId,
            @Valid @RequestBody CreateTicketTypeRequest request) {
        log.info("✏️ User {} updating ticket type with id: {}", userDetails.getId(), ticketTypeId);
        TicketTypeResponse ticketType = eventService.updateMyTicketType(userDetails.getId(), ticketTypeId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật loại vé thành công", ticketType));
    }

    /**
     * DELETE /api/events/my-events/ticket-types/{ticketTypeId} - Xoá loại vé của tôi
     */
    @DeleteMapping("/my-events/ticket-types/{ticketTypeId}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<Void>> deleteMyTicketType(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long ticketTypeId) {
        log.info("🗑️ User {} deleting ticket type with id: {}", userDetails.getId(), ticketTypeId);
        eventService.deleteMyTicketType(userDetails.getId(), ticketTypeId);
        return ResponseEntity.ok(ApiResponse.success("Xoá loại vé thành công", (Void) null));
    }

    /**
     * GET /api/events/my-events/ticket-types/{ticketTypeId}/seats/count - Lấy số lượng ghế của loại vé của tôi
     */
    @GetMapping("/my-events/ticket-types/{ticketTypeId}/seats/count")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> countMySeats(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long ticketTypeId) {
        log.info("🔢 User {} getting seat count for ticket type: {}", userDetails.getId(), ticketTypeId);
        long count = eventService.countMySeats(userDetails.getId(), ticketTypeId);
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("seatCount", count);
        return ResponseEntity.ok(ApiResponse.success("Lấy số lượng ghế thành công", data));
    }

    /**
     * POST /api/events/my-events/ticket-types/{ticketTypeId}/seats/generate - Tạo ghế cho loại vé của tôi
     */
    @PostMapping("/my-events/ticket-types/{ticketTypeId}/seats/generate")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> generateMySeats(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long ticketTypeId,
            @RequestBody java.util.Map<String, Object> body) {
        log.info("💺 User {} generating seats for ticket type: {}", userDetails.getId(), ticketTypeId);
        
        int rows  = body.containsKey("rows")  ? ((Number) body.get("rows")).intValue()  : 10;
        int cols  = body.containsKey("cols")  ? ((Number) body.get("cols")).intValue()  : 10;
        
        eventService.generateMySeats(userDetails.getId(), ticketTypeId, rows, cols);
        
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("seatsCreated", rows * cols);
        return ResponseEntity.ok(ApiResponse.success("Tạo ghế thành công", data));
    }

    /**
     * POST /api/events/{id}/upload-image - Upload ảnh cho sự kiện do User tạo (Authenticated user)
     */
    @PostMapping("/{id}/upload-image")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<String>> uploadEventImageByUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.ticketbox.security.CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        log.info("🖼️ User uploading image for event: {}", id);

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
        eventService.updateMyEventImageUrl(userDetails.getId(), id, imageUrl);

        log.info("✅ Image uploaded for event {}: {}", id, imageUrl);
        return ResponseEntity.ok(ApiResponse.success("Upload ảnh thành công", imageUrl));
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

    private String readFeaturedTag(Map<String, Object> body) {
        if (body == null || body.get("featuredTag") == null) {
            return null;
        }
        String tag = String.valueOf(body.get("featuredTag")).trim();
        return tag.isEmpty() ? null : tag;
    }

    private Boolean readFeaturedFlag(Map<String, Object> body, Boolean fallback, String featuredTag) {
        if (body != null && body.containsKey("isFeatured")) {
            Object value = body.get("isFeatured");
            if (value instanceof Boolean boolValue) {
                return boolValue;
            }
            return Boolean.parseBoolean(String.valueOf(value));
        }
        if (fallback != null) {
            return fallback;
        }
        return featuredTag != null;
    }
}
