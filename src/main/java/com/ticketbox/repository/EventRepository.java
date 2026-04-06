package com.ticketbox.repository;

import com.ticketbox.entity.Event;
import com.ticketbox.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByStatus(EventStatus status);
    List<Event> findByStartTimeBetween(LocalDateTime from, LocalDateTime to);
}
