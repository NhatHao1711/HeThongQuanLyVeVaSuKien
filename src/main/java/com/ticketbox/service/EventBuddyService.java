package com.ticketbox.service;

import com.ticketbox.dto.request.BuddyRequest;
import com.ticketbox.dto.response.EventBuddyResponse;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.EventBuddy;
import com.ticketbox.entity.User;
import com.ticketbox.enums.BuddyStatus;
import com.ticketbox.exception.BadRequestException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.EventBuddyRepository;
import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * EventBuddyService - Nhiệm vụ D: Social Event Buddy
 *
 * Cho phép sinh viên tìm bạn đi chung sự kiện.
 * - Gửi lời mời kết nối (sender → receiver cho 1 event)
 * - Chấp nhận / từ chối lời mời
 * - Xem danh sách buddy đã matched
 * - Gợi ý kết nối (users cùng event mà chưa connect)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventBuddyService {

    private final EventBuddyRepository eventBuddyRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    /**
     * Gửi lời mời kết nối buddy
     */
    @Transactional
    public EventBuddyResponse sendBuddyRequest(Long senderId, BuddyRequest request) {
        if (senderId.equals(request.getReceiverId())) {
            throw new BadRequestException("Không thể gửi lời mời cho chính mình");
        }

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Event", "id", request.getEventId()));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", senderId));

        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "id", request.getReceiverId()));

        // Kiểm tra đã gửi lời mời trước đó chưa
        Optional<EventBuddy> existing = eventBuddyRepository
                .findByEventIdAndSenderIdAndReceiverId(
                        request.getEventId(), senderId, request.getReceiverId());

        if (existing.isPresent()) {
            throw new BadRequestException("Bạn đã gửi lời mời cho người này ở sự kiện này rồi");
        }

        // Kiểm tra ngược: nếu receiver đã gửi cho sender → auto-accept (mutual match!)
        Optional<EventBuddy> reverseRequest = eventBuddyRepository
                .findByEventIdAndSenderIdAndReceiverId(
                        request.getEventId(), request.getReceiverId(), senderId);

        if (reverseRequest.isPresent() &&
                reverseRequest.get().getStatus() == BuddyStatus.PENDING) {
            // Auto-match: cả 2 đều muốn kết nối
            EventBuddy reverse = reverseRequest.get();
            reverse.setStatus(BuddyStatus.ACCEPTED);
            eventBuddyRepository.save(reverse);

            log.info("🎉 Auto-matched: User #{} ↔ User #{} for Event #{}",
                    senderId, request.getReceiverId(), request.getEventId());

            return toResponse(reverse);
        }

        // Tạo mới buddy request
        EventBuddy buddy = EventBuddy.builder()
                .event(event)
                .sender(sender)
                .receiver(receiver)
                .status(BuddyStatus.PENDING)
                .build();

        buddy = eventBuddyRepository.save(buddy);
        log.info("📨 Buddy request sent: User #{} → User #{} for Event #{}",
                senderId, request.getReceiverId(), request.getEventId());

        return toResponse(buddy);
    }

    /**
     * Chấp nhận hoặc từ chối lời mời
     */
    @Transactional
    public EventBuddyResponse respondBuddyRequest(Long buddyId, Long userId, boolean accept) {
        EventBuddy buddy = eventBuddyRepository.findById(buddyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "EventBuddy", "id", buddyId));

        // Chỉ receiver mới có quyền respond
        if (!buddy.getReceiver().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền phản hồi lời mời này");
        }

        if (buddy.getStatus() != BuddyStatus.PENDING) {
            throw new BadRequestException("Lời mời đã được xử lý trước đó");
        }

        buddy.setStatus(accept ? BuddyStatus.ACCEPTED : BuddyStatus.REJECTED);
        buddy = eventBuddyRepository.save(buddy);

        log.info("📋 Buddy request #{} {}: User #{} → User #{}",
                buddyId, accept ? "ACCEPTED" : "REJECTED",
                buddy.getSender().getId(), buddy.getReceiver().getId());

        return toResponse(buddy);
    }

    /**
     * Lấy danh sách buddy đã match cho event
     */
    public List<EventBuddyResponse> getMyBuddies(Long eventId, Long userId) {
        List<EventBuddy> buddies = eventBuddyRepository
                .findByEventAndUser(eventId, userId);

        return buddies.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Gợi ý bạn đi chung (users cùng event mà chưa kết nối)
     */
    public List<Long> findPotentialBuddies(Long eventId, Long userId) {
        return eventBuddyRepository.findPotentialBuddyUserIds(eventId, userId);
    }

    private EventBuddyResponse toResponse(EventBuddy buddy) {
        return EventBuddyResponse.builder()
                .buddyId(buddy.getId())
                .eventId(buddy.getEvent().getId())
                .eventTitle(buddy.getEvent().getTitle())
                .senderId(buddy.getSender().getId())
                .senderName(buddy.getSender().getFullName())
                .senderEmail(buddy.getSender().getEmail())
                .receiverId(buddy.getReceiver().getId())
                .receiverName(buddy.getReceiver().getFullName())
                .receiverEmail(buddy.getReceiver().getEmail())
                .status(buddy.getStatus().name())
                .build();
    }
}
