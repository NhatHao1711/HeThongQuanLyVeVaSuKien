package com.ticketbox.service;

import com.ticketbox.entity.Event;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class EventReminderService {

    private final EventRepository eventRepository;
    private final EmailService emailService;

    /**
     * Chạy mỗi giờ — gửi email nhắc nhở cho users có vé sự kiện diễn ra trong 24h tới.
     * Chỉ nhắc sự kiện bắt đầu trong khoảng 23-24h tới để tránh gửi trùng.
     */
    @Scheduled(cron = "0 0 * * * *") // Mỗi giờ đầu phút 0
    public void sendEventReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.plusHours(23);
        LocalDateTime to = now.plusHours(24);

        log.info("🔔 Checking for events starting between {} and {}", from, to);

        List<Event> upcomingEvents = eventRepository.findByStartTimeBetween(from, to);

        for (Event event : upcomingEvents) {
            // Get all users who bought tickets for this event
            List<UserTicket> tickets = event.getTicketTypes().stream()
                    .flatMap(tt -> tt.getUserTickets() != null ? tt.getUserTickets().stream() : java.util.stream.Stream.empty())
                    .collect(Collectors.toList());

            log.info("📧 Event '{}' starts soon. Sending reminders to {} ticket holders.", event.getTitle(), tickets.size());

            for (UserTicket ticket : tickets) {
                try {
                    String userEmail = ticket.getOrder().getUser().getEmail();
                    String fullName = ticket.getOrder().getUser().getFullName();
                    emailService.sendEventReminder(
                            userEmail, fullName,
                            event.getTitle(),
                            event.getStartTime(),
                            event.getLocation()
                    );
                } catch (Exception e) {
                    log.error("Failed to send reminder for ticket {}: {}", ticket.getId(), e.getMessage());
                }
            }
        }
    }
}
