package com.ticketbox.service;

import com.ticketbox.dto.request.CreateEventRequest;
import com.ticketbox.dto.request.CreateTicketTypeRequest;
import com.ticketbox.dto.response.EventCategoryResponse;
import com.ticketbox.dto.response.EventResponse;
import com.ticketbox.dto.response.TicketTypeResponse;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.EventCategory;
import com.ticketbox.entity.TicketType;
import com.ticketbox.enums.EventStatus;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.EventCategoryRepository;
import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.TicketTypeRepository;
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
public class EventService {

    private final EventRepository eventRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final EventCategoryRepository eventCategoryRepository;

    /**
     * Lấy danh sách sự kiện (phân trang, filter theo status)
     */
    public List<EventResponse> getAllEvents() {
        return eventRepository.findByStatus(EventStatus.PUBLISHED)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết sự kiện theo ID
     */
    public EventResponse getEventById(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));
        return toResponse(event);
    }

    /**
     * Tạo sự kiện mới
     */
    @Transactional
    public EventResponse createEvent(CreateEventRequest request) {
        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new IllegalArgumentException("End time phải sau start time");
        }

        EventCategory category = null;
        if (request.getCategoryId() != null) {
            category = eventCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));
        }

        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .category(category)
                .status(EventStatus.DRAFT)
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
     * Publish sự kiện (thay đổi status từ DRAFT → PUBLISHED)
     */
    @Transactional
    public EventResponse publishEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

        if (event.getStatus() != EventStatus.DRAFT) {
            throw new IllegalArgumentException("Chỉ sự kiện DRAFT mới có thể publish");
        }

        event.setStatus(EventStatus.PUBLISHED);
        event = eventRepository.save(event);
        log.info("🚀 Published Event #{}", eventId);

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

        if (event.getStatus() != EventStatus.DRAFT) {
            throw new IllegalArgumentException("Chỉ sự kiện DRAFT mới có thể xoá");
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
        // Recalculate available quantity nếu total quantity tăng
        int sold = ticketType.getTotalQuantity() - ticketType.getAvailableQuantity();
        ticketType.setAvailableQuantity(request.getTotalQuantity() - sold);

        ticketType = ticketTypeRepository.save(ticketType);
        log.info("✏️ Updated TicketType #{}", ticketTypeId);

        return toTicketTypeResponse(ticketType);
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

    private EventResponse toResponse(Event event) {
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
}
