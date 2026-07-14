package com.ticketbox.repository;

import com.ticketbox.entity.EventReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventReviewRepository extends JpaRepository<EventReview, Long> {
    List<EventReview> findByEventIdOrderByCreatedAtDesc(Long eventId);
    List<EventReview> findByEventIdAndHiddenFalseOrderByCreatedAtDesc(Long eventId);
    Optional<EventReview> findByEventIdAndUserId(Long eventId, Long userId);
    long countByEventId(Long eventId);
    long countByEventIdAndHiddenFalse(Long eventId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM EventReview r WHERE r.event.id = :eventId")
    Double findAverageRatingByEventId(Long eventId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM EventReview r WHERE r.event.id = :eventId AND r.hidden = false")
    Double findAverageRatingByEventIdAndHiddenFalse(Long eventId);

    List<EventReview> findAllByOrderByCreatedAtDesc();
    List<EventReview> findByEventOrganizerIdOrderByCreatedAtDesc(Long organizerId);
}
