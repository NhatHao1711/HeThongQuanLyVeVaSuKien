package com.ticketbox.repository;

import com.ticketbox.entity.EventBuddy;
import com.ticketbox.enums.BuddyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventBuddyRepository extends JpaRepository<EventBuddy, Long> {

    List<EventBuddy> findByEventIdAndSenderId(Long eventId, Long senderId);

    List<EventBuddy> findByEventIdAndReceiverId(Long eventId, Long receiverId);

    @Query("SELECT eb FROM EventBuddy eb WHERE eb.event.id = :eventId " +
           "AND (eb.sender.id = :userId OR eb.receiver.id = :userId) " +
           "AND eb.status = :status")
    List<EventBuddy> findByEventAndUserAndStatus(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId,
            @Param("status") BuddyStatus status);

    @Query("SELECT eb FROM EventBuddy eb WHERE eb.event.id = :eventId " +
           "AND (eb.sender.id = :userId OR eb.receiver.id = :userId)")
    List<EventBuddy> findByEventAndUser(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId);

    Optional<EventBuddy> findByEventIdAndSenderIdAndReceiverId(
            Long eventId, Long senderId, Long receiverId);

    @Query("SELECT DISTINCT u.id FROM UserTicket ut JOIN ut.user u " +
           "WHERE ut.ticketType.event.id = :eventId AND u.id != :userId " +
           "AND u.id NOT IN (" +
           "  SELECT eb.receiver.id FROM EventBuddy eb WHERE eb.event.id = :eventId AND eb.sender.id = :userId " +
           "  UNION " +
           "  SELECT eb.sender.id FROM EventBuddy eb WHERE eb.event.id = :eventId AND eb.receiver.id = :userId" +
           ")")
    List<Long> findPotentialBuddyUserIds(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId);
}
