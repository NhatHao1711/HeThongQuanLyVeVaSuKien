package com.ticketbox.repository;

import com.ticketbox.entity.CheckinLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CheckinLogRepository extends JpaRepository<CheckinLog, Long> {

    @Query("SELECT cl FROM CheckinLog cl " +
           "JOIN FETCH cl.ticket t " +
           "JOIN FETCH t.ticketType tt " +
           "JOIN FETCH tt.event e " +
           "JOIN FETCH t.user u " +
           "LEFT JOIN FETCH cl.scanner s " +
           "WHERE (:eventId IS NULL OR e.id = :eventId) " +
           "AND (:action IS NULL OR cl.action = :action) " +
           "AND (:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.qrToken) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR CAST(t.id AS string) LIKE CONCAT('%', :search, '%')) " +
           "ORDER BY cl.recordedAt DESC")
    Page<CheckinLog> searchLogsAdmin(
            @Param("eventId") Long eventId,
            @Param("action") String action,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT cl FROM CheckinLog cl " +
           "JOIN FETCH cl.ticket t " +
           "JOIN FETCH t.ticketType tt " +
           "JOIN FETCH tt.event e " +
           "JOIN FETCH t.user u " +
           "LEFT JOIN FETCH cl.scanner s " +
           "WHERE e.organizer.id = :organizerId " +
           "AND (:eventId IS NULL OR e.id = :eventId) " +
           "AND (:action IS NULL OR cl.action = :action) " +
           "AND (:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.qrToken) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR CAST(t.id AS string) LIKE CONCAT('%', :search, '%')) " +
           "ORDER BY cl.recordedAt DESC")
    Page<CheckinLog> searchLogsOrganizer(
            @Param("organizerId") Long organizerId,
            @Param("eventId") Long eventId,
            @Param("action") String action,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT cl FROM CheckinLog cl " +
           "JOIN cl.ticket t " +
           "JOIN t.ticketType tt " +
           "JOIN tt.event e " +
           "JOIN t.user u " +
           "WHERE (:eventId IS NULL OR e.id = :eventId) " +
           "AND (:action IS NULL OR cl.action = :action) " +
           "ORDER BY cl.recordedAt DESC")
    List<CheckinLog> exportLogsAdmin(
            @Param("eventId") Long eventId,
            @Param("action") String action);

    @Query("SELECT cl FROM CheckinLog cl " +
           "JOIN cl.ticket t " +
           "JOIN t.ticketType tt " +
           "JOIN tt.event e " +
           "JOIN t.user u " +
           "WHERE e.organizer.id = :organizerId " +
           "AND (:eventId IS NULL OR e.id = :eventId) " +
           "AND (:action IS NULL OR cl.action = :action) " +
           "ORDER BY cl.recordedAt DESC")
    List<CheckinLog> exportLogsOrganizer(
            @Param("organizerId") Long organizerId,
            @Param("eventId") Long eventId,
            @Param("action") String action);
}
