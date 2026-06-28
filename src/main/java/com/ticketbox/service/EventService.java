package com.ticketbox.service;

import com.ticketbox.dto.request.CreateEventRequest;
import com.ticketbox.dto.request.CreateTicketTypeRequest;
import com.ticketbox.dto.response.EventCategoryResponse;
import com.ticketbox.dto.response.EventResponse;
import com.ticketbox.dto.response.TicketTypeResponse;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.EventCategory;
import com.ticketbox.entity.TicketType;
import com.ticketbox.entity.User;
import com.ticketbox.enums.AgencyStatus;
import com.ticketbox.enums.EventStatus;
import com.ticketbox.enums.UserRole;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.EventCategoryRepository;
import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.SeatRepository;
import com.ticketbox.repository.TicketTypeRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * EventService - API Events CRUD
 *
 * Quản lý sự kiện, loại vé, và các thông tin liên quan.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EventService {

    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final UserRepository userRepository;
    private final SeatRepository seatRepository;
    private final com.ticketbox.repository.FollowOrganizerRepository followOrganizerRepository;
    private final com.ticketbox.repository.NotificationRepository notificationRepository;

    /**
     * Lấy danh sách sự kiện (phân trang, filter theo status)
     */
    public List<EventResponse> getAllEvents() {
        return eventRepository.findByStatus(EventStatus.PUBLISHED)
                .stream()
                .filter(e -> e.getEndTime() == null || e.getEndTime().isAfter(java.time.LocalDateTime.now()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách sự kiện của một người tổ chức (bất kể trạng thái)
     */
    public List<EventResponse> getMyEvents(Long organizerId) {
        requireApprovedOrganizer(organizerId);
        return eventRepository.findByOrganizerId(organizerId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết sự kiện theo ID
     */
    @Transactional
    public EventResponse getEventById(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));
        if (event.getViews() == null) {
            event.setViews(0L);
        }
        event.setViews(event.getViews() + 1);
        event = eventRepository.save(event);
        return toResponse(event);
    }

    /**
     * Tạo sự kiện mới
     */
    @Transactional
    public EventResponse createEvent(Long userId, CreateEventRequest request) {
        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new IllegalArgumentException("End time phải sau start time");
        }

        EventCategory category = null;
        if (request.getCategoryId() != null) {
            category = eventCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));
        }

        User organizer = null;
        EventStatus status = EventStatus.DRAFT;

        if (userId != null) {
            organizer = userRepository.findById(userId).orElse(null);
            if (organizer != null) {
                if (organizer.getRole() == UserRole.ROLE_ADMIN) {
                    status = EventStatus.DRAFT;
                } else {
                    requireApprovedOrganizer(organizer);
                    status = EventStatus.PENDING;
                }
            }
        }

        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .holdingUntil(request.getEndTime().plusHours(24))
                .category(category)
                .organizer(organizer)
                .status(status)
                .build();

        event = eventRepository.save(event);
        log.info("✅ Created Event #{}: {}", event.getId(), event.getTitle());

        return toResponse(event);
    }

    /**
     * Cập nhật sự kiện
     */
    @Transactional
    public EventResponse updateEvent(Long eventId, CreateEventRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setLocation(request.getLocation());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setHoldingUntil(request.getEndTime().plusHours(24));

        if (request.getCategoryId() != null) {
            EventCategory category = eventCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));
            event.setCategory(category);
        }

        event = eventRepository.save(event);
        log.info("✏️ Updated Event #{}", eventId);

        return toResponse(event);
    }

    /**
     * Publish sự kiện (thay đổi status từ DRAFT hoặc PENDING → PUBLISHED)
     */
    @Transactional
    public EventResponse publishEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getStatus() != EventStatus.DRAFT && event.getStatus() != EventStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ sự kiện DRAFT hoặc PENDING mới có thể publish");
        }

        event.setStatus(EventStatus.PUBLISHED);
        event = eventRepository.save(event);
        log.info("🚀 Published Event #{}", eventId);

        // Gửi thông báo đến những người theo dõi đại lý này
        if (event.getOrganizer() != null) {
            List<com.ticketbox.entity.FollowOrganizer> followers = followOrganizerRepository.findByOrganizerId(event.getOrganizer().getId());
            for (com.ticketbox.entity.FollowOrganizer follow : followers) {
                com.ticketbox.entity.Notification notification = com.ticketbox.entity.Notification.builder()
                        .userId(follow.getUser().getId())
                        .message("Ban Tổ Chức [" + event.getOrganizer().getFullName() + "] vừa đăng sự kiện mới: " + event.getTitle())
                        .type("EVENT_NEW")
                        .isRead(false)
                        .build();
                notificationRepository.save(notification);
            }
        }

        return toResponse(event);
    }

    /**
     * Đóng sự kiện (thay đổi status thành CLOSED)
     */
    @Transactional
    public EventResponse closeEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        event.setStatus(EventStatus.CLOSED);
        event = eventRepository.save(event);
        log.info("🔒 Closed Event #{}", eventId);

        return toResponse(event);
    }

    /**
     * Thêm loại vé cho sự kiện
     */
    @Transactional
    public TicketTypeResponse addTicketType(Long eventId, CreateTicketTypeRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        TicketType ticketType = TicketType.builder()
                .event(event)
                .name(request.getName())
                .price(request.getPrice())
                .totalQuantity(request.getTotalQuantity())
                .availableQuantity(request.getTotalQuantity())
                .eventDate(request.getEventDate() != null ? request.getEventDate() : event.getStartTime().toLocalDate())
                .build();

        ticketType = ticketTypeRepository.save(ticketType);
        log.info("🎫 Added ticket type #{} for Event #{}", ticketType.getId(), eventId);

        return toTicketTypeResponse(ticketType);
    }

    /**
     * Lấy danh sách loại vé của sự kiện
     */
    public List<TicketTypeResponse> getTicketTypesForEvent(Long eventId) {
        return ticketTypeRepository.findByEventId(eventId)
                .stream()
                .map(this::toTicketTypeResponse)
                .collect(Collectors.toList());
    }

    /**
     * Xoá sự kiện (chỉ xoá được DRAFT events)
     */
    @Transactional
    public void deleteEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->  new ResourceNotFoundException("Event", "id", eventId));

        if (hasSoldTickets(event) || event.getStatus() == EventStatus.PUBLISHED || event.getStatus() == EventStatus.CLOSED) {
            event.setStatus(EventStatus.CANCELLED);
            eventRepository.save(event);
            log.info("Cancelled Event #{} instead of hard delete because it has live data", eventId);
            return;
        }

        if (event.getStatus() == EventStatus.PENDING || event.getStatus() == EventStatus.CANCELLED) {
            if (hasSoldTickets(event)) {
                throw new IllegalArgumentException("Không thể xoá hoàn toàn sự kiện đã có vé bán ra");
            }
            eventRepository.delete(event);
            log.info("Deleted Event #{} with status {}", eventId, event.getStatus());
            return;
        }

        if (event.getStatus() != EventStatus.DRAFT) {
            throw new IllegalArgumentException("Không thể xoá sự kiện ở trạng thái này");
        }

        eventRepository.delete(event);
        log.info("🗑️ Deleted Event #{}", eventId);
    }

    /**
     * Cập nhật loại vé
     */
    @Transactional
    public TicketTypeResponse updateTicketType(Long ticketTypeId, CreateTicketTypeRequest request) {
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", ticketTypeId));

        ticketType.setName(request.getName());
        ticketType.setPrice(request.getPrice());
        ticketType.setTotalQuantity(request.getTotalQuantity());
        if (request.getEventDate() != null) {
            ticketType.setEventDate(request.getEventDate());
        }
        // Recalculate available quantity nếu total quantity tăng
        int sold = ticketType.getTotalQuantity() - ticketType.getAvailableQuantity();
        ticketType.setAvailableQuantity(request.getTotalQuantity() - sold);

        ticketType = ticketTypeRepository.save(ticketType);
        log.info("✏️ Updated TicketType #{}", ticketTypeId);

        return toTicketTypeResponse(ticketType);
    }

    /**
     * Cập nhật sự kiện của tôi
     */
    @Transactional
    public EventResponse updateMyEvent(Long userId, Long eventId, CreateEventRequest request) {
        requireApprovedOrganizer(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getOrganizer() == null || !event.getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền sửa sự kiện này");
        }

        return updateEvent(eventId, request);
    }

    /**
     * Xoá sự kiện của tôi (chỉ xoá được DRAFT hoặc PENDING events)
     */
    @Transactional
    public void deleteMyEvent(Long userId, Long eventId) {
        requireApprovedOrganizer(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->  new ResourceNotFoundException("Event", "id", eventId));

        if (event.getOrganizer() == null || !event.getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền xoá sự kiện này");
        }

        if (hasSoldTickets(event) || event.getStatus() == EventStatus.PUBLISHED || event.getStatus() == EventStatus.CLOSED) {
            event.setStatus(EventStatus.CANCELLED);
            eventRepository.save(event);
            log.info("Organizer {} cancelled Event #{} instead of hard delete because it has live data", userId, eventId);
            return;
        }

        if (event.getStatus() != EventStatus.DRAFT && event.getStatus() != EventStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ sự kiện DRAFT hoặc PENDING mới có thể xoá");
        }

        eventRepository.delete(event);
        log.info("🗑️ Organizer {} deleted Event #{}", userId, eventId);
    }

    /**
     * Cap nhat nhan noi bat cho su kien cua dai ly
     */
    @Transactional
    public EventResponse updateMyFeaturedTag(Long userId, Long eventId, String featuredTag, Boolean isFeatured) {
        requireApprovedOrganizer(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getOrganizer() == null || !event.getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền cập nhật nhãn nổi bật của sự kiện này");
        }

        return updateFeaturedTag(eventId, featuredTag, isFeatured);
    }

    /**
     * Publish sự kiện của tôi
     */
    @Transactional
    public EventResponse publishMyEvent(Long userId, Long eventId) {
        requireApprovedOrganizer(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getOrganizer() == null || !event.getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền publish sự kiện này");
        }

        return publishEvent(eventId);
    }

    /**
     * Đóng sự kiện của tôi
     */
    @Transactional
    public EventResponse closeMyEvent(Long userId, Long eventId) {
        requireApprovedOrganizer(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getOrganizer() == null || !event.getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền đóng sự kiện này");
        }

        return closeEvent(eventId);
    }

    /**
     * Thêm loại vé cho sự kiện của tôi
     */
    @Transactional
    public TicketTypeResponse addMyTicketType(Long userId, Long eventId, CreateTicketTypeRequest request) {
        requireApprovedOrganizer(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getOrganizer() == null || !event.getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền thêm vé vào sự kiện này");
        }

        return addTicketType(eventId, request);
    }

    /**
     * Cập nhật loại vé của tôi
     */
    @Transactional
    public TicketTypeResponse updateMyTicketType(Long userId, Long ticketTypeId, CreateTicketTypeRequest request) {
        requireApprovedOrganizer(userId);
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", ticketTypeId));

        if (ticketType.getEvent() == null || ticketType.getEvent().getOrganizer() == null || !ticketType.getEvent().getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền sửa vé này");
        }

        return updateTicketType(ticketTypeId, request);
    }

    /**
     * Xoá loại vé của tôi
     */
    @Transactional
    public void deleteMyTicketType(Long userId, Long ticketTypeId) {
        requireApprovedOrganizer(userId);
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", ticketTypeId));
        if (ticketType.getEvent() == null || ticketType.getEvent().getOrganizer() == null || 
                !ticketType.getEvent().getOrganizer().getId().equals(userId)) {
            throw new RuntimeException("Access Denied: Not your event");
        }
        deleteTicketType(ticketTypeId);
    }

    public long countMySeats(Long userId, Long ticketTypeId) {
        requireApprovedOrganizer(userId);
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", ticketTypeId));
        if (ticketType.getEvent() == null || ticketType.getEvent().getOrganizer() == null || 
                !ticketType.getEvent().getOrganizer().getId().equals(userId)) {
            throw new RuntimeException("Access Denied: Not your event");
        }
        return seatRepository.countByTicketTypeId(ticketTypeId);
    }

    public void generateMySeats(Long userId, Long ticketTypeId, int rows, int cols) {
        requireApprovedOrganizer(userId);
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", ticketTypeId));
        if (ticketType.getEvent() == null || ticketType.getEvent().getOrganizer() == null || 
                !ticketType.getEvent().getOrganizer().getId().equals(userId)) {
            throw new RuntimeException("Access Denied: Not your event");
        }
        
        long existing = seatRepository.countByTicketTypeId(ticketTypeId);
        if (existing > 0) {
            seatRepository.deleteAll(seatRepository.findByTicketTypeId(ticketTypeId));
        }

        java.util.List<com.ticketbox.entity.Seat> seats = new java.util.ArrayList<>();
        for (int r = 0; r < rows; r++) {
            String rowLabel = String.valueOf((char) ('A' + r));
            for (int c = 1; c <= cols; c++) {
                seats.add(com.ticketbox.entity.Seat.builder()
                        .ticketType(ticketType)
                        .name(rowLabel + String.format("%02d", c))
                        .status(com.ticketbox.enums.SeatStatus.AVAILABLE)
                        .build());
            }
        }
        seatRepository.saveAll(seats);
        log.info("💺 Generated {} seats for TicketType #{}", rows * cols, ticketTypeId);
    }

    /**
     * Xoá loại vé
     */
    @Transactional
    public void deleteTicketType(Long ticketTypeId) {
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", ticketTypeId));

        // Check if there are sold tickets
        int sold = ticketType.getTotalQuantity() - ticketType.getAvailableQuantity();
        if (sold > 0) {
            throw new IllegalArgumentException("Không thể xoá loại vé đã có người mua (" + sold + " vé)");
        }

        ticketTypeRepository.delete(ticketType);
        log.info("🗑️ Deleted TicketType #{}", ticketTypeId);
    }

    public EventResponse toResponse(Event event) {
        EventCategoryResponse categoryResponse = null;
        if (event.getCategory() != null) {
            categoryResponse = EventCategoryResponse.builder()
                    .id(event.getCategory().getId())
                    .name(event.getCategory().getName())
                    .icon(event.getCategory().getIcon())
                    .build();
        }

        return EventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .location(event.getLocation())
                .imageUrl(event.getImageUrl())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .status(event.getStatus())
                .category(categoryResponse)
                .ticketTypes(event.getTicketTypes().stream()
                        .map(this::toTicketTypeResponse)
                        .collect(Collectors.toList()))
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .rejectReason(event.getRejectReason())
                .views(event.getViews() != null ? event.getViews() : 0L)
                .featuredTag(event.getFeaturedTag())
                .organizerId(event.getOrganizer() != null ? event.getOrganizer().getId() : null)
                .organizerName(event.getOrganizer() != null ? event.getOrganizer().getFullName() : null)
                .isFeatured(event.getIsFeatured() != null ? event.getIsFeatured() : false)
                .build();
    }

    private TicketTypeResponse toTicketTypeResponse(TicketType ticketType) {
        return TicketTypeResponse.builder()
                .id(ticketType.getId())
                .eventTitle(ticketType.getEvent().getTitle())
                .name(ticketType.getName())
                .price(ticketType.getPrice())
                .totalQuantity(ticketType.getTotalQuantity())
                .availableQuantity(ticketType.getAvailableQuantity())
                .eventDate(ticketType.getEventDate())
                .build();
    }

    @Transactional
    public void updateEventImageUrl(Long eventId, String imageUrl) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        event.setImageUrl(imageUrl);
        eventRepository.save(event);
        log.info("🖼️ Updated image URL for event {}: {}", eventId, imageUrl);
    }

    @Transactional
    public void updateMyEventImageUrl(Long userId, Long eventId, String imageUrl) {
        requireApprovedOrganizer(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        if (event.getOrganizer() == null || !event.getOrganizer().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền cập nhật ảnh sự kiện này");
        }
        event.setImageUrl(imageUrl);
        eventRepository.save(event);
        log.info("Organizer {} updated image URL for event {}: {}", userId, eventId, imageUrl);
    }

    @Transactional
    public EventResponse setFeaturedEvent(Long eventId, boolean isFeatured) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));
        
        event.setIsFeatured(isFeatured);
        event = eventRepository.save(event);
        log.info("⭐ Marked Event #{} as featured: {}", eventId, isFeatured);
        
        return toResponse(event);
    }

    @Transactional
    public EventResponse rejectEvent(Long eventId, String rejectReason) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getStatus() != EventStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ sự kiện đang chờ duyệt (PENDING) mới có thể từ chối");
        }

        event.setStatus(EventStatus.REJECTED);
        event.setRejectReason(rejectReason);
        event = eventRepository.save(event);
        log.info("❌ Rejected Event #{}, Reason: {}", eventId, rejectReason);

        return toResponse(event);
    }

    @Transactional
    public EventResponse updateFeaturedTag(Long eventId, String featuredTag, Boolean isFeatured) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        event.setFeaturedTag(featuredTag);
        if (isFeatured != null) {
            event.setIsFeatured(isFeatured);
        }
        event = eventRepository.save(event);
        log.info("⭐ Updated Featured Tag for Event #{}: tag={}, isFeatured={}", eventId, featuredTag, isFeatured);

        return toResponse(event);
    }

    private boolean hasSoldTickets(Event event) {
        if (event.getTicketTypes() == null) {
            return false;
        }
        return event.getTicketTypes().stream().anyMatch(ticketType ->
                ticketType.getTotalQuantity() != null
                        && ticketType.getAvailableQuantity() != null
                        && ticketType.getTotalQuantity() > ticketType.getAvailableQuantity());
    }

    private User requireApprovedOrganizer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        requireApprovedOrganizer(user);
        return user;
    }

    private void requireApprovedOrganizer(User user) {
        if (user.getRole() != UserRole.ROLE_ORGANIZER || user.getAgencyStatus() != AgencyStatus.APPROVED) {
            throw new IllegalStateException("Tài khoản đại lý của bạn chưa được admin duyệt.");
        }
    }
}
